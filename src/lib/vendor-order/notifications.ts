/**
 * Vendor order notification dispatcher.
 *
 * Channel policy lives here so new use cases (for example order.created) can be
 * added by registering an event policy instead of scattering channel logic in routes.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  type SelectPartnerApiOrder,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import { buildPartnerOrderCustomerLink } from '@/lib/partner-api/outbound-webhook';
import { logger } from '@/lib/logger';
import type { TryowbotTemplateParameters } from '@/lib/whatsapp/tryowbot';
import {
  isTryowbotConfigured,
  normalizeWhatsAppToDigits,
  sendTryowbotTemplateMessage,
} from '@/lib/whatsapp/tryowbot';

export type VendorOrderNotificationEvent = 'order.created' | 'order.completed';

type WhatsAppMode = 'disabled' | 'fallback_without_webhook' | 'always';

interface WhatsAppPolicy {
  mode: WhatsAppMode;
  defaultProductTypes: string[];
  productTypesEnv: string;
  templateEnv: string;
}

interface EventPolicy {
  whatsapp?: WhatsAppPolicy;
}

export interface DispatchVendorOrderNotificationOptions {
  event: VendorOrderNotificationEvent;
  order: SelectPartnerApiOrder;
  vendor: SelectPartnerApiVendor;
}

/**
 * Maps to the approved Meta/TryOWBot template:
 * - Header: "We've got your {{1}} order!" → `header.text.var1` = vendor name
 * - Body: "Hi {{1}}, … {{2}}. …" → `body.var1` = customer name, `body.var2` = order URL
 * TryOWBot JSON uses `header.type: "text"` per https://web.tryowbot.com/whatsapp/apidoc
 */
export function buildVendorOrderTryowbotTemplateParameters(args: {
  vendorName: string;
  customerName: string;
  orderLink: string;
}): TryowbotTemplateParameters {
  return {
    header: { type: 'text', text: { var1: args.vendorName } },
    body: {
      var1: args.customerName,
      var2: args.orderLink,
    },
  };
}

/** Defaults for order.created WhatsApp allowlist (`VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_CREATED` overrides). */
const ORDER_CREATED_NOTIFICATION_DEFAULT_PRODUCT_TYPES = [
  'customer_custom_song',
  'customer_templated_song',
] as const;

/**
 * Default `order.completed` WhatsApp allowlist (`VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_COMPLETED` overrides).
 * Full custom song gets completion WhatsApp when `TRYOWBOT_ORDER_COMPLETED_APINAME` is set.
 */
const ORDER_COMPLETED_NOTIFICATION_DEFAULT_PRODUCT_TYPES = ['customer_custom_song'] as const;

/** Full custom song: send WhatsApp even when partner has a webhook (`fallback_without_webhook` mode). */
const CUSTOM_SONG_PRODUCT_TYPE = 'customer_custom_song';

const EVENT_POLICIES: Record<VendorOrderNotificationEvent, EventPolicy> = {
  'order.created': {
    whatsapp: {
      mode: 'fallback_without_webhook',
      defaultProductTypes: [...ORDER_CREATED_NOTIFICATION_DEFAULT_PRODUCT_TYPES],
      productTypesEnv: 'VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_CREATED',
      templateEnv: 'TRYOWBOT_ORDER_CREATED_APINAME',
    },
  },
  'order.completed': {
    whatsapp: {
      mode: 'fallback_without_webhook',
      defaultProductTypes: [...ORDER_COMPLETED_NOTIFICATION_DEFAULT_PRODUCT_TYPES],
      productTypesEnv: 'VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_COMPLETED',
      templateEnv: 'TRYOWBOT_ORDER_COMPLETED_APINAME',
    },
  },
};

function envKeySuffix(event: VendorOrderNotificationEvent): string {
  return event.replace(/\W+/g, '_');
}

function getEventMode(event: VendorOrderNotificationEvent, defaultMode: WhatsAppMode): WhatsAppMode {
  const key = `VENDOR_ORDER_WHATSAPP_MODE_${envKeySuffix(event).toUpperCase()}`;
  const configured = process.env[key]?.trim().toLowerCase();
  if (configured === 'disabled' || configured === 'fallback_without_webhook' || configured === 'always') {
    return configured;
  }
  return defaultMode;
}

function parseProductTypes(envName: string, defaults: string[]): Set<string> {
  const configured = process.env[envName]?.trim();
  if (!configured) return new Set(defaults);
  if (configured.toLowerCase() === 'none') return new Set();
  return new Set(configured.split(',').map((value) => value.trim()).filter(Boolean));
}

/**
 * Whether this product type should run `order.created` vendor notifications (partner API).
 * Matches the product-type allowlist used for WhatsApp on order.created (defaults + env override).
 */
export function isOrderCreatedNotificationProductType(productType: string): boolean {
  const policy = EVENT_POLICIES['order.created'].whatsapp;
  if (!policy) return false;
  const productTypes = parseProductTypes(policy.productTypesEnv, policy.defaultProductTypes);
  return productTypes.has(productType);
}

function resolveWhatsAppTemplate(policy: WhatsAppPolicy): string | null {
  return process.env[policy.templateEnv]?.trim() || null;
}

export function hasPartnerWebhookTarget(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
): boolean {
  return Boolean(order.webhook_url?.trim() || vendor.webhook_url?.trim());
}

function shouldSendWhatsApp(
  event: VendorOrderNotificationEvent,
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  policy: WhatsAppPolicy,
): boolean {
  const mode = getEventMode(event, policy.mode);
  if (mode === 'disabled') return false;
  if (
    mode === 'fallback_without_webhook' &&
    hasPartnerWebhookTarget(order, vendor) &&
    order.product_type !== CUSTOM_SONG_PRODUCT_TYPE
  ) {
    return false;
  }

  const productTypes = parseProductTypes(policy.productTypesEnv, policy.defaultProductTypes);
  return productTypes.has(order.product_type);
}

function metadataKey(event: VendorOrderNotificationEvent, state: 'reserved' | 'sent_at'): string {
  return `notification_whatsapp_${envKeySuffix(event)}_${state}`;
}

/**
 * Atomic claim before TryOWBot HTTP: one UPDATE wins so concurrent dispatches don’t double-send.
 * Reserved flag is JSON boolean (no casts). If the process dies after claim but before finalize/release,
 * clear the `*_reserved` key in `partner_api_orders.metadata` manually or WhatsApp won’t retry for that order.
 */
async function claimWhatsAppSendSlot(orderId: number, event: VendorOrderNotificationEvent): Promise<boolean> {
  const reservedKey = metadataKey(event, 'reserved');
  const sentKey = metadataKey(event, 'sent_at');

  const rows = await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: sql`
        COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb) ||
        jsonb_build_object(${reservedKey}::text, 'true'::jsonb)
      `,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(partnerApiOrdersTable.id, orderId),
        sql`(COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb)->>${sentKey}::text) IS NULL`,
        sql`(COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb)->>${reservedKey}::text) IS NULL`,
      ),
    )
    .returning({ id: partnerApiOrdersTable.id });

  return rows.length > 0;
}

async function finalizeWhatsAppSent(orderId: number, event: VendorOrderNotificationEvent): Promise<void> {
  const reservedKey = metadataKey(event, 'reserved');
  const sentKey = metadataKey(event, 'sent_at');
  const iso = new Date().toISOString();

  await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: sql`
        (COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb) - ${reservedKey}::text) ||
        jsonb_build_object(${sentKey}::text, to_jsonb(${iso}::text))
      `,
      updated_at: new Date(),
    })
    .where(eq(partnerApiOrdersTable.id, orderId));
}

async function releaseWhatsAppReservation(orderId: number, event: VendorOrderNotificationEvent): Promise<void> {
  const reservedKey = metadataKey(event, 'reserved');

  await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: sql`COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb) - ${reservedKey}::text`,
      updated_at: new Date(),
    })
    .where(eq(partnerApiOrdersTable.id, orderId));
}

async function sendCustomerWhatsApp(
  event: VendorOrderNotificationEvent,
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  policy: WhatsAppPolicy,
): Promise<void> {
  const apiname = resolveWhatsAppTemplate(policy);
  const hasTryowbotCredentials = isTryowbotConfigured();
  if (!hasTryowbotCredentials || !apiname) {
    const notConfigured: string[] = [];
    if (!hasTryowbotCredentials) {
      notConfigured.push('TRYOWBOT_APP_ID / TRYOWBOT_API_KEY');
    }
    if (!apiname) {
      notConfigured.push(policy.templateEnv);
    }
    logger.debug('Vendor order WhatsApp notification skipped: TryOWBot not configured', {
      event,
      orderId: order.id,
      productType: order.product_type,
      hasTryowbotCredentials,
      hasApiname: Boolean(apiname),
      notConfigured,
    });
    return;
  }

  const mobile = normalizeWhatsAppToDigits(order.customer_mobile);
  if (!mobile) {
    logger.info('Vendor order WhatsApp notification skipped: missing customer mobile', {
      event,
      orderId: order.id,
      productType: order.product_type,
    });
    return;
  }

  if (mobile.length === 10 && !process.env.TRYOWBOT_DEFAULT_COUNTRY_CODE?.trim()) {
    logger.warn(
      'Vendor order WhatsApp: customer_mobile is 10 digits with no TRYOWBOT_DEFAULT_COUNTRY_CODE; TryOWBot expects a full international number (e.g. 91XXXXXXXXXX). Delivery may fail or go to the wrong region.',
      { event, orderId: order.id, productType: order.product_type, toSuffix: mobile.slice(-4) },
    );
  }

  const customerLink = buildPartnerOrderCustomerLink(order, vendor);
  if (!customerLink) {
    logger.warn('Vendor order WhatsApp notification skipped: missing order token', {
      event,
      orderId: order.id,
      productType: order.product_type,
    });
    return;
  }

  const claimed = await claimWhatsAppSendSlot(order.id, event);
  if (!claimed) {
    logger.debug('Vendor order WhatsApp notification skipped: already sent or reserved', {
      event,
      orderId: order.id,
    });
    return;
  }

  /** Template body {{1}} — customer-facing name (partner pre-fill or recipient). */
  const customerName = order.customer_name?.trim() || order.recipient_name?.trim() || 'there';
  /** Template header {{1}} — vendor display name (e.g. "We've got your [vendor] order!"). */
  const vendorName = vendor.name.trim() || vendor.slug;
  logger.info('Vendor order WhatsApp notification sending', {
    event,
    orderId: order.id,
    productType: order.product_type,
    customerName,
    vendorName,
    customerLink,
  });
  const result = await sendTryowbotTemplateMessage({
    to: mobile,
    apiname,
    parameters: buildVendorOrderTryowbotTemplateParameters({
      vendorName,
      customerName,
      orderLink: customerLink,
    }),
  });

  if (!result.ok) {
    logger.error('Vendor order WhatsApp notification failed', {
      event,
      orderId: order.id,
      productType: order.product_type,
      error: result.error,
    });
    await releaseWhatsAppReservation(order.id, event);
    return;
  }

  await finalizeWhatsAppSent(order.id, event);

  logger.info('Vendor order WhatsApp notification sent', {
    event,
    orderId: order.id,
    vendorId: vendor.id,
    productType: order.product_type,
    toSuffix: mobile.slice(-4),
    tryowbotResponse: result.responseBodyPreview,
  });
}

export async function dispatchVendorOrderNotification(
  options: DispatchVendorOrderNotificationOptions,
): Promise<{ webhookDelivered: boolean; whatsappAttempted: boolean }> {
  const { event, order, vendor } = options;
  const policy = EVENT_POLICIES[event];

  const whatsappPolicy = policy.whatsapp;
  const whatsappAttempted = whatsappPolicy
    ? shouldSendWhatsApp(event, order, vendor, whatsappPolicy)
    : false;

  if (whatsappPolicy && whatsappAttempted) {
    await sendCustomerWhatsApp(event, order, vendor, whatsappPolicy);
  } else {
    logger.debug('Vendor order WhatsApp notification not applicable', {
      event,
      orderId: order.id,
      productType: order.product_type,
      hasWebhookTarget: hasPartnerWebhookTarget(order, vendor),
    });
  }

  return { webhookDelivered: false, whatsappAttempted };
}
