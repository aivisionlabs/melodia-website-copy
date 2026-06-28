/**
 * Partner API Outbound Webhook
 *
 * Builds webhook payloads, signs with HMAC-SHA256, delivers to partner webhook_url,
 * logs deliveries, and schedules retries on failure.
 */

import { createHmac } from 'crypto';
import { validateWebhookUrl } from '@/lib/partner-api/security';
import { getBaseUrlSync } from '@/lib/utils/url';
import { db } from '@/lib/db';
import {
  partnerWebhookDeliveriesTable,
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  type SelectPartnerApiOrder,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;
const RETRY_SCHEDULE_MS = [
  30 * 1000,       // 30 seconds
  5 * 60 * 1000,   // 5 minutes
  30 * 60 * 1000,  // 30 minutes
  2 * 60 * 60 * 1000,  // 2 hours
  24 * 60 * 60 * 1000, // 24 hours
];

export function signWebhookPayload(body: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${signature}`;
}

/** Shared top-level order fields on every outbound partner webhook. */
function webhookOrderEnvelope(order: SelectPartnerApiOrder) {
  return {
    order_id: order.id,
    external_order_id: order.external_order_id,
    ...(order.idempotency_key?.trim()
      ? { idempotency_key: order.idempotency_key.trim() }
      : {}),
  };
}

interface WebhookPayloadCreated {
  event: 'order.created';
  timestamp: string;
  order_id: number;
  external_order_id: string;
  idempotency_key?: string;
  product_type: string;
  data: {
    status: string;
    customer_link: string;
    order_token?: string;
    estimated_completion_minutes?: number;
    recipient_name?: string;
    customer_name?: string;
    created_at: string;
  };
}

interface WebhookPayloadCompleted {
  event: 'order.completed';
  timestamp: string;
  order_id: number;
  external_order_id: string;
  idempotency_key?: string;
  product_type: string;
  data: {
    status: 'completed';
    // Token-first order flow
    customer_link?: string;
    song_title?: string;
    instance_slug?: string;
    /** customer_custom_song completion */
    song_slug?: string;
    song_variants?: unknown[];
    completed_at: string;
  };
}

interface WebhookPayloadFailed {
  event: 'order.failed';
  timestamp: string;
  order_id: number;
  external_order_id: string;
  idempotency_key?: string;
  product_type: string;
  data: {
    status: 'failed';
    error_message: string;
    completed_at: string;
  };
}

export type WebhookPayload =
  | WebhookPayloadCreated
  | WebhookPayloadCompleted
  | WebhookPayloadFailed;

const ORDER_CREATED_WEBHOOK_PRODUCT_TYPES = new Set([
  'customer_templated_song',
  'customer_custom_song',
]);

const ORDER_FAILED_WEBHOOK_PRODUCT_TYPES = new Set(['customer_templated_song']);

const DEFAULT_ESTIMATED_COMPLETION_MINUTES: Record<string, number> = {
  customer_templated_song: 3,
  customer_custom_song: 10,
};

const ORDER_CREATED_WEBHOOK_SENT_METADATA_KEY = 'webhook_order_created_sent_at';
const ORDER_FAILED_WEBHOOK_SENT_METADATA_KEY = 'webhook_order_failed_sent_at';

type WebhookUrlSource = 'order' | 'vendor';

function resolveWebhookTarget(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
): { url: string; source: WebhookUrlSource } | null {
  const orderUrl = order.webhook_url?.trim();
  if (orderUrl) return { url: orderUrl, source: 'order' };
  const vendorUrl = vendor.webhook_url?.trim();
  if (vendorUrl) return { url: vendorUrl, source: 'vendor' };
  return null;
}

/** Host + path only — omit query strings that may contain secrets. */
function describeWebhookUrl(url: string): { host: string; pathname: string } {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, pathname: parsed.pathname };
  } catch {
    return { host: '[invalid-url]', pathname: '' };
  }
}

function baseWebhookLogContext(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  payload: WebhookPayload,
  attempt: number,
  target?: { url: string; source: WebhookUrlSource } | null,
) {
  const resolved = target ?? resolveWebhookTarget(order, vendor);
  return {
    orderId: order.id,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    externalOrderId: order.external_order_id,
    productType: order.product_type,
    event: payload.event,
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    hasIdempotencyKey: Boolean(order.idempotency_key?.trim()),
    ...(resolved
      ? {
          webhookUrlSource: resolved.source,
          webhookUrl: describeWebhookUrl(resolved.url),
        }
      : { webhookUrlSource: null }),
  };
}

/** Public URL for the co-branded vendor order page. */
export function buildPartnerOrderCustomerLink(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
): string | undefined {
  if (!order.order_token) return undefined;
  const base = getBaseUrlSync().replace(/\/$/, '');
  return `${base}/vendor/${vendor.slug}/order/${order.order_token}`;
}

export function isOrderCreatedWebhookProductType(productType: string): boolean {
  return ORDER_CREATED_WEBHOOK_PRODUCT_TYPES.has(productType);
}

export function isOrderFailedWebhookProductType(productType: string): boolean {
  return ORDER_FAILED_WEBHOOK_PRODUCT_TYPES.has(productType);
}

/** Build payload for order.created — customer link is ready; song may still be generating. */
export function buildOrderCreatedPayload(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  options?: { estimatedCompletionMinutes?: number },
): WebhookPayloadCreated | null {
  const customerLink = buildPartnerOrderCustomerLink(order, vendor);
  if (!customerLink) return null;

  const estimated =
    options?.estimatedCompletionMinutes ??
    DEFAULT_ESTIMATED_COMPLETION_MINUTES[order.product_type];

  return {
    event: 'order.created',
    timestamp: new Date().toISOString(),
    ...webhookOrderEnvelope(order),
    product_type: order.product_type,
    data: {
      status: order.status,
      customer_link: customerLink,
      ...(order.order_token ? { order_token: order.order_token } : {}),
      ...(estimated != null ? { estimated_completion_minutes: estimated } : {}),
      ...(order.recipient_name?.trim() ? { recipient_name: order.recipient_name.trim() } : {}),
      ...(order.customer_name?.trim() ? { customer_name: order.customer_name.trim() } : {}),
      created_at: order.created_at.toISOString(),
    },
  };
}

function orderCreatedWebhookAlreadySent(order: SelectPartnerApiOrder): boolean {
  const meta = order.metadata as Record<string, unknown> | null;
  return Boolean(meta?.[ORDER_CREATED_WEBHOOK_SENT_METADATA_KEY]);
}

async function markOrderCreatedWebhookSent(orderId: number): Promise<void> {
  const sentKey = ORDER_CREATED_WEBHOOK_SENT_METADATA_KEY;
  const iso = new Date().toISOString();
  await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: sql`
        COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb) ||
        jsonb_build_object(${sentKey}::text, to_jsonb(${iso}::text))
      `,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(partnerApiOrdersTable.id, orderId),
        sql`(COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb)->>${sentKey}::text) IS NULL`,
      ),
    );
}

function orderFailedWebhookAlreadySent(order: SelectPartnerApiOrder): boolean {
  const meta = order.metadata as Record<string, unknown> | null;
  return Boolean(meta?.[ORDER_FAILED_WEBHOOK_SENT_METADATA_KEY]);
}

async function markOrderFailedWebhookSent(orderId: number): Promise<void> {
  const sentKey = ORDER_FAILED_WEBHOOK_SENT_METADATA_KEY;
  const iso = new Date().toISOString();
  await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: sql`
        COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb) ||
        jsonb_build_object(${sentKey}::text, to_jsonb(${iso}::text))
      `,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(partnerApiOrdersTable.id, orderId),
        sql`(COALESCE(${partnerApiOrdersTable.metadata}, '{}'::jsonb)->>${sentKey}::text) IS NULL`,
      ),
    );
}

/**
 * Deliver order.created webhook once per order when customer_link is available.
 */
export async function deliverOrderCreatedWebhookOnce(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  options?: { estimatedCompletionMinutes?: number },
): Promise<boolean> {
  if (!isOrderCreatedWebhookProductType(order.product_type)) {
    logger.debug('Partner order.created webhook skipped: unsupported product type', {
      orderId: order.id,
      productType: order.product_type,
    });
    return false;
  }

  if (orderCreatedWebhookAlreadySent(order)) {
    logger.info('Partner order.created webhook skipped: already sent', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
    });
    return false;
  }

  const webhookTarget = resolveWebhookTarget(order, vendor);
  if (!webhookTarget) {
    logger.info('Partner order.created webhook skipped: no webhook_url configured', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
      hasOrderWebhookUrl: Boolean(order.webhook_url?.trim()),
      hasVendorWebhookUrl: Boolean(vendor.webhook_url?.trim()),
    });
    return false;
  }

  const payload = buildOrderCreatedPayload(order, vendor, options);
  if (!payload) {
    logger.warn('Partner order.created webhook skipped: missing order_token', {
      orderId: order.id,
      productType: order.product_type,
      webhookUrlSource: webhookTarget.source,
      webhookUrl: describeWebhookUrl(webhookTarget.url),
    });
    return false;
  }

  logger.info('Partner order.created webhook sending', {
    orderId: order.id,
    vendorId: vendor.id,
    productType: order.product_type,
    webhookUrlSource: webhookTarget.source,
    webhookUrl: describeWebhookUrl(webhookTarget.url),
    customerLink: payload.data.customer_link,
  });

  const delivered = await deliverPartnerWebhook(order, vendor, payload);
  if (!delivered) {
    logger.warn('Partner order.created webhook delivery unsuccessful', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
      webhookUrlSource: webhookTarget.source,
      webhookUrl: describeWebhookUrl(webhookTarget.url),
    });
    return false;
  }

  await markOrderCreatedWebhookSent(order.id);
  logger.info('Partner order.created webhook delivered and marked sent', {
    orderId: order.id,
    vendorId: vendor.id,
    productType: order.product_type,
    webhookUrlSource: webhookTarget.source,
    webhookUrl: describeWebhookUrl(webhookTarget.url),
  });
  return true;
}

/**
 * Deliver order.failed webhook once per order when the order reaches a terminal failure state.
 */
export async function deliverOrderFailedWebhookOnce(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  options: { errorMessage: string; failedStep?: string },
): Promise<boolean> {
  if (!isOrderFailedWebhookProductType(order.product_type)) {
    logger.debug('Partner order.failed webhook skipped: unsupported product type', {
      orderId: order.id,
      productType: order.product_type,
    });
    return false;
  }

  if (orderFailedWebhookAlreadySent(order)) {
    logger.info('Partner order.failed webhook skipped: already sent', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
    });
    return false;
  }

  const webhookTarget = resolveWebhookTarget(order, vendor);
  if (!webhookTarget) {
    logger.info('Partner order.failed webhook skipped: no webhook_url configured', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
      hasOrderWebhookUrl: Boolean(order.webhook_url?.trim()),
      hasVendorWebhookUrl: Boolean(vendor.webhook_url?.trim()),
    });
    return false;
  }

  const payload = buildFailedPayload(order, options.errorMessage, options.failedStep);

  logger.info('Partner order.failed webhook sending', {
    orderId: order.id,
    vendorId: vendor.id,
    productType: order.product_type,
    webhookUrlSource: webhookTarget.source,
    webhookUrl: describeWebhookUrl(webhookTarget.url),
    failedStep: options.failedStep ?? null,
  });

  const delivered = await deliverPartnerWebhook(order, vendor, payload);
  if (!delivered) {
    logger.warn('Partner order.failed webhook delivery unsuccessful', {
      orderId: order.id,
      vendorId: vendor.id,
      productType: order.product_type,
      webhookUrlSource: webhookTarget.source,
      webhookUrl: describeWebhookUrl(webhookTarget.url),
    });
    return false;
  }

  await markOrderFailedWebhookSent(order.id);
  logger.info('Partner order.failed webhook delivered and marked sent', {
    orderId: order.id,
    vendorId: vendor.id,
    productType: order.product_type,
    webhookUrlSource: webhookTarget.source,
    webhookUrl: describeWebhookUrl(webhookTarget.url),
  });
  return true;
}

/** Build completed payload for customer_custom_song orders. */
export function buildFullCustomSongCompletedPayload(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  songSlug: string,
  variants: unknown[],
): WebhookPayloadCompleted {
  return {
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    ...webhookOrderEnvelope(order),
    product_type: order.product_type,
    data: {
      status: 'completed',
      customer_link: buildPartnerOrderCustomerLink(order, vendor),
      song_slug: songSlug,
      song_variants: variants,
      completed_at: order.completed_at?.toISOString() ?? new Date().toISOString(),
    },
  };
}

/** Build completed payload for token-first song orders. */
export function buildCompletedPayload(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  instanceSlug: string,
  songTitle?: string,
): WebhookPayloadCompleted {
  return {
    event: 'order.completed',
    timestamp: new Date().toISOString(),
    ...webhookOrderEnvelope(order),
    product_type: order.product_type,
    data: {
      status: 'completed',
      customer_link: buildPartnerOrderCustomerLink(order, vendor),
      song_title: songTitle,
      instance_slug: instanceSlug,
      completed_at: order.completed_at?.toISOString() ?? new Date().toISOString(),
    },
  };
}

export function buildFailedPayload(
  order: SelectPartnerApiOrder,
  errorMessage: string,
  _failedStep?: string,
): WebhookPayloadFailed {
  return {
    event: 'order.failed',
    timestamp: new Date().toISOString(),
    ...webhookOrderEnvelope(order),
    product_type: order.product_type,
    data: {
      status: 'failed',
      error_message: sanitizePartnerWebhookFailureMessage(errorMessage),
      completed_at: order.completed_at?.toISOString() ?? new Date().toISOString(),
    },
  };
}

/** Strip internal provider names from partner-visible failure messages. */
function sanitizePartnerWebhookFailureMessage(message: string): string {
  const sanitized = message
    .replace(/suno/gi, 'song generation')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || 'Song generation failed';
}

/**
 * Deliver a webhook payload to the partner's webhook URL.
 * Logs the delivery attempt; on failure, schedules a retry.
 */
export async function deliverPartnerWebhook(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  payload: WebhookPayload,
  attempt: number = 1,
): Promise<boolean> {
  const webhookTarget = resolveWebhookTarget(order, vendor);
  const logContext = baseWebhookLogContext(order, vendor, payload, attempt, webhookTarget);

  if (!webhookTarget) {
    logger.info('Partner webhook delivery skipped: no webhook_url configured', {
      ...logContext,
      hasOrderWebhookUrl: Boolean(order.webhook_url?.trim()),
      hasVendorWebhookUrl: Boolean(vendor.webhook_url?.trim()),
    });
    return false;
  }

  const { url: webhookUrl, source: webhookUrlSource } = webhookTarget;

  // Defense-in-depth: re-validate URL at delivery time to catch DNS rebinding
  // and vendor-level URLs set via admin that bypass order-creation validation.
  const urlCheck = await validateWebhookUrl(webhookUrl);
  if (!urlCheck.valid) {
    const ssrfError = `Blocked by SSRF protection: ${urlCheck.error}`;
    logger.error('Partner webhook delivery blocked by SSRF validation', {
      ...logContext,
      webhookUrlSource,
      webhookUrl: describeWebhookUrl(webhookUrl),
      ssrfError: urlCheck.error,
    });

    await db.insert(partnerWebhookDeliveriesTable).values({
      order_id: order.id,
      vendor_id: vendor.id,
      attempt,
      status_code: null,
      success: false,
      request_body: JSON.stringify(payload),
      response_snippet: null,
      error_message: ssrfError,
      next_retry_at: null,
    });
    return false;
  }

  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, vendor.webhook_secret);
  const startedAt = Date.now();

  logger.info('Partner webhook delivery started', {
    ...logContext,
    webhookUrlSource,
    webhookUrl: describeWebhookUrl(webhookUrl),
    bodyBytes: Buffer.byteLength(body, 'utf8'),
    timeoutMs: WEBHOOK_TIMEOUT_MS,
  });

  let statusCode: number | null = null;
  let responseSnippet: string | null = null;
  let success = false;
  let errorMessage: string | null = null;
  let timedOut = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Melodia-Webhook-Signature': signature,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = response.status;

    try {
      const text = await response.text();
      responseSnippet = text.slice(0, 500);
    } catch {
      // ignore body read errors
    }

    success = response.ok;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
    timedOut = err instanceof Error && err.name === 'AbortError';
  }

  const durationMs = Date.now() - startedAt;
  const nextRetryAt =
    !success && attempt < MAX_ATTEMPTS
      ? new Date(Date.now() + (RETRY_SCHEDULE_MS[attempt - 1] ?? RETRY_SCHEDULE_MS[RETRY_SCHEDULE_MS.length - 1]))
      : null;
  const retriesExhausted = !success && attempt >= MAX_ATTEMPTS;

  await db.insert(partnerWebhookDeliveriesTable).values({
    order_id: order.id,
    vendor_id: vendor.id,
    attempt,
    status_code: statusCode,
    success,
    request_body: body,
    response_snippet: responseSnippet,
    error_message: errorMessage,
    next_retry_at: nextRetryAt,
  });

  if (success) {
    logger.info('Partner webhook delivery succeeded', {
      ...logContext,
      webhookUrlSource,
      webhookUrl: describeWebhookUrl(webhookUrl),
      statusCode,
      duration_ms: durationMs,
      responseSnippetPreview: responseSnippet?.slice(0, 200) ?? null,
    });
  } else if (timedOut) {
    logger.error('Partner webhook delivery timed out', {
      ...logContext,
      webhookUrlSource,
      webhookUrl: describeWebhookUrl(webhookUrl),
      duration_ms: durationMs,
      timeoutMs: WEBHOOK_TIMEOUT_MS,
      nextRetryAt: nextRetryAt?.toISOString() ?? null,
      retriesExhausted,
    });
  } else if (statusCode != null) {
    logger.warn('Partner webhook delivery returned non-2xx', {
      ...logContext,
      webhookUrlSource,
      webhookUrl: describeWebhookUrl(webhookUrl),
      statusCode,
      duration_ms: durationMs,
      responseSnippetPreview: responseSnippet?.slice(0, 200) ?? null,
      nextRetryAt: nextRetryAt?.toISOString() ?? null,
      retriesExhausted,
    });
  } else {
    logger.error('Partner webhook delivery failed', {
      ...logContext,
      webhookUrlSource,
      webhookUrl: describeWebhookUrl(webhookUrl),
      duration_ms: durationMs,
      errorMessage,
      nextRetryAt: nextRetryAt?.toISOString() ?? null,
      retriesExhausted,
    });
  }

  return success;
}

/**
 * Process pending webhook retries.
 * Called by a cron job or background task.
 */
export async function processWebhookRetries(): Promise<number> {
  const now = new Date();

  const pendingDeliveries = await db
    .select()
    .from(partnerWebhookDeliveriesTable)
    .where(
      and(
        eq(partnerWebhookDeliveriesTable.success, false),
        lte(partnerWebhookDeliveriesTable.next_retry_at, now),
      ),
    )
    .limit(50);

  if (pendingDeliveries.length > 0) {
    logger.info('Partner webhook retries processing started', {
      pendingCount: pendingDeliveries.length,
    });
  }

  let retried = 0;
  for (const delivery of pendingDeliveries) {
    if (delivery.attempt >= MAX_ATTEMPTS) {
      logger.warn('Partner webhook retry exhausted; clearing next_retry_at', {
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        vendorId: delivery.vendor_id,
        attempt: delivery.attempt,
        maxAttempts: MAX_ATTEMPTS,
        lastError: delivery.error_message,
        lastStatusCode: delivery.status_code,
      });
      // Mark exhausted by clearing next_retry_at
      await db
        .update(partnerWebhookDeliveriesTable)
        .set({ next_retry_at: null })
        .where(eq(partnerWebhookDeliveriesTable.id, delivery.id));
      continue;
    }

    const orders = await db
      .select()
      .from(partnerApiOrdersTable)
      .where(eq(partnerApiOrdersTable.id, delivery.order_id))
      .limit(1);
    if (orders.length === 0) {
      logger.warn('Partner webhook retry skipped: order not found', {
        deliveryId: delivery.id,
        orderId: delivery.order_id,
      });
      continue;
    }

    const vendors = await db
      .select()
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, delivery.vendor_id))
      .limit(1);
    if (vendors.length === 0) {
      logger.warn('Partner webhook retry skipped: vendor not found', {
        deliveryId: delivery.id,
        vendorId: delivery.vendor_id,
      });
      continue;
    }

    const order = orders[0];
    const vendor = vendors[0];

    // Rebuild payload from the stored request body
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(delivery.request_body ?? '{}') as WebhookPayload;
    } catch {
      logger.error('Partner webhook retry skipped: invalid stored request_body', {
        deliveryId: delivery.id,
        orderId: delivery.order_id,
      });
      continue;
    }

    const nextAttempt = delivery.attempt + 1;
    const webhookTarget = resolveWebhookTarget(order, vendor);
    logger.info('Partner webhook retry scheduled delivery', {
      deliveryId: delivery.id,
      orderId: order.id,
      vendorId: vendor.id,
      event: payload.event,
      previousAttempt: delivery.attempt,
      nextAttempt,
      webhookUrlSource: webhookTarget?.source ?? null,
      webhookUrl: webhookTarget ? describeWebhookUrl(webhookTarget.url) : null,
    });

    // Clear the next_retry_at on the old delivery row
    await db
      .update(partnerWebhookDeliveriesTable)
      .set({ next_retry_at: null })
      .where(eq(partnerWebhookDeliveriesTable.id, delivery.id));

    await deliverPartnerWebhook(order, vendor, payload, nextAttempt);
    retried++;
  }

  if (retried > 0) {
    logger.info('Partner webhook retries processing completed', { retried });
  }

  return retried;
}
