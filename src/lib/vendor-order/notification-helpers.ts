import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  type SelectPartnerApiOrder,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger as appLogger } from '@/lib/logger';
import { deliverOrderCreatedWebhookOnce, deliverOrderFailedWebhookOnce, isOrderFailedWebhookProductType } from '@/lib/partner-api/outbound-webhook';
import { EmailFactory } from '@/lib/services/email/email-factory';
import {
  dispatchVendorOrderNotification,
  isOrderCreatedNotificationProductType,
} from '@/lib/vendor-order/notifications';

type ErrorLogger = {
  error: (message: string, data?: Record<string, unknown>) => void;
};

const INTERNAL_PARTNER_ORDER_ALERT_EMAIL = 'info@melodia-songs.com';
const CREATION_FAILURE_NOTIFIED_METADATA_KEY = 'ops_creation_failure_notified_at';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Notifies ops (info@melodia-songs.com) when a partner API order row is created successfully.
 * Skips in demo mode / EMAIL_DEMO (same policy as consumer song-request notifications).
 */
async function sendPartnerOrderCreatedInternalEmail(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  log: ErrorLogger,
): Promise<void> {
  if (isDemoModeEnabled() || process.env.EMAIL_DEMO === 'true') {
    appLogger.debug('Partner order internal email skipped (demo)', { orderId: order.id });
    return;
  }

  try {
    const provider = EmailFactory.getProvider();
    const amount = order.amount_charged != null ? String(order.amount_charged) : '—';
    const metaJson =
      order.metadata != null ? escapeHtml(JSON.stringify(order.metadata, null, 2)) : '—';

    const html = `<p>A new partner API order was created.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
<tr><td style="padding:4px 12px 4px 0;"><strong>Melodia order ID</strong></td><td>${order.id}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>External order ID</strong></td><td>${escapeHtml(order.external_order_id)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Vendor</strong></td><td>${escapeHtml(vendor.name)} (${escapeHtml(vendor.slug)}, id ${vendor.id})</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Sandbox</strong></td><td>${vendor.sandbox ? 'yes' : 'no'}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Product type</strong></td><td>${escapeHtml(order.product_type)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Recipient name</strong></td><td>${escapeHtml(order.recipient_name ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Customer name</strong></td><td>${escapeHtml(order.customer_name ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Customer mobile</strong></td><td>${escapeHtml(order.customer_mobile ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Amount</strong></td><td>${escapeHtml(amount)} ${escapeHtml(order.currency ?? 'INR')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Status</strong></td><td>${escapeHtml(order.status)}</td></tr>
</table>
<p><strong>Metadata</strong></p>
<pre style="background:#f5f5f5;padding:8px;overflow:auto;">${metaJson}</pre>`;

    const result = await provider.sendInternalNotification(
      INTERNAL_PARTNER_ORDER_ALERT_EMAIL,
      `New partner order #${order.id} — ${vendor.name}`,
      html,
    );

    if (!result.success) {
      log.error('Partner order internal notification email failed', {
        orderId: order.id,
        error: result.error,
      });
      return;
    }

    appLogger.info('Partner order internal notification email sent', {
      orderId: order.id,
      vendorId: vendor.id,
      to: INTERNAL_PARTNER_ORDER_ALERT_EMAIL,
    });
  } catch (err) {
    log.error('Partner order internal notification email exception', {
      orderId: order.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface PartnerOrderCreationFailureParams {
  vendor: SelectPartnerApiVendor;
  errorMessage: string;
  source: string;
  order?: SelectPartnerApiOrder | null;
  orderId?: number;
  externalOrderId?: string;
  productType?: string;
  errorCode?: string;
  requestId?: string;
  httpStatus?: number;
}

/**
 * Ops alert when partner order creation fails (info@melodia-songs.com).
 * Deduped per order via metadata.ops_creation_failure_notified_at when orderId is known.
 * When orderId is unavailable (e.g. the DB insert itself failed), no dedup is applied —
 * each retry attempt fires its own email, which is acceptable since the API rate-limits
 * inbound requests and these errors should be rare.
 */
export async function notifyPartnerOrderCreationFailed(
  params: PartnerOrderCreationFailureParams,
  log: ErrorLogger = appLogger,
): Promise<void> {
  if (isDemoModeEnabled() || process.env.EMAIL_DEMO === 'true') {
    appLogger.debug('Partner order creation failure email skipped (demo)', {
      orderId: params.order?.id ?? params.orderId,
      source: params.source,
    });
    return;
  }

  const orderId = params.order?.id ?? params.orderId;
  const orderMeta = params.order?.metadata as Record<string, unknown> | null;
  if (orderId != null && orderMeta?.[CREATION_FAILURE_NOTIFIED_METADATA_KEY]) {
    appLogger.debug('Partner order creation failure email skipped: already notified', {
      orderId,
      source: params.source,
    });
    return;
  }

  try {
    const provider = EmailFactory.getProvider();
    const productType = params.productType ?? params.order?.product_type ?? '—';
    const externalOrderId =
      params.externalOrderId ?? params.order?.external_order_id ?? '—';
    const amount =
      params.order?.amount_charged != null ? String(params.order.amount_charged) : '—';
    const metaJson =
      params.order?.metadata != null
        ? escapeHtml(JSON.stringify(params.order.metadata, null, 2))
        : '—';

    const html = `<p><strong>Partner API order creation failed</strong></p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
<tr><td style="padding:4px 12px 4px 0;"><strong>Source</strong></td><td>${escapeHtml(params.source)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Request id</strong></td><td>${escapeHtml(params.requestId ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Error code</strong></td><td>${escapeHtml(params.errorCode ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>HTTP status</strong></td><td>${params.httpStatus ?? '—'}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Error</strong></td><td>${escapeHtml(params.errorMessage)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Melodia order ID</strong></td><td>${orderId ?? '—'}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>External order ID</strong></td><td>${escapeHtml(externalOrderId)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Vendor</strong></td><td>${escapeHtml(params.vendor.name)} (${escapeHtml(params.vendor.slug)}, id ${params.vendor.id})</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Sandbox</strong></td><td>${params.vendor.sandbox ? 'yes' : 'no'}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Product type</strong></td><td>${escapeHtml(productType)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Recipient name</strong></td><td>${escapeHtml(params.order?.recipient_name ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Customer name</strong></td><td>${escapeHtml(params.order?.customer_name ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Customer mobile</strong></td><td>${escapeHtml(params.order?.customer_mobile ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Order status</strong></td><td>${escapeHtml(params.order?.status ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Amount</strong></td><td>${escapeHtml(amount)} ${escapeHtml(params.order?.currency ?? 'INR')}</td></tr>
</table>
<p><strong>Metadata</strong></p>
<pre style="background:#f5f5f5;padding:8px;overflow:auto;">${metaJson}</pre>`;

    const subjectOrder = orderId != null ? `order #${orderId}` : externalOrderId;
    const result = await provider.sendInternalNotification(
      INTERNAL_PARTNER_ORDER_ALERT_EMAIL,
      `[Melodia] Partner order creation failed — ${subjectOrder}`,
      html,
    );

    if (!result.success) {
      log.error('Partner order creation failure email failed', {
        orderId,
        source: params.source,
        error: result.error,
      });
      return;
    }

    if (orderId != null) {
      const iso = new Date().toISOString();
      await db
        .update(partnerApiOrdersTable)
        .set({
          metadata: {
            ...(orderMeta ?? {}),
            [CREATION_FAILURE_NOTIFIED_METADATA_KEY]: iso,
            creation_failure: {
              at: iso,
              source: params.source,
              code: params.errorCode ?? null,
              message: params.errorMessage,
            },
          },
          updated_at: new Date(),
        })
        .where(eq(partnerApiOrdersTable.id, orderId));
    }

    appLogger.info('Partner order creation failure email sent', {
      orderId,
      vendorId: params.vendor.id,
      source: params.source,
      to: INTERNAL_PARTNER_ORDER_ALERT_EMAIL,
    });
  } catch (err) {
    log.error('Partner order creation failure email exception', {
      orderId: params.order?.id ?? params.orderId,
      source: params.source,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function notifyPartnerOrderFailed(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  errorMessage: string,
  logger: ErrorLogger,
  options?: { failedStep?: string },
): void {
  if (!isOrderFailedWebhookProductType(order.product_type)) return;

  void deliverOrderFailedWebhookOnce(order, vendor, {
    errorMessage,
    failedStep: options?.failedStep,
  })
    .then((delivered) => {
      if (!delivered) {
        appLogger.info('Partner order.failed webhook not delivered', {
          orderId: order.id,
          vendorId: vendor.id,
          productType: order.product_type,
          hasOrderWebhookUrl: Boolean(order.webhook_url?.trim()),
          hasVendorWebhookUrl: Boolean(vendor.webhook_url?.trim()),
        });
      }
    })
    .catch((err) => {
      logger.error('Partner order.failed webhook failed', {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}

export async function notifyPartnerOrderFailedByOrderId(
  orderId: number,
  errorMessage: string,
  logger: ErrorLogger,
  options?: { failedStep?: string },
): Promise<void> {
  try {
    const rows = await db
      .select({ order: partnerApiOrdersTable, vendor: partnerApiVendorsTable })
      .from(partnerApiOrdersTable)
      .innerJoin(partnerApiVendorsTable, eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id))
      .where(eq(partnerApiOrdersTable.id, orderId))
      .limit(1);
    if (rows.length === 0) return;

    const { order, vendor } = rows[0];
    notifyPartnerOrderFailed(order, vendor, errorMessage, logger, options);
  } catch (err) {
    logger.error('notifyPartnerOrderFailedByOrderId failed', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function notifyOrderCreatedByOrderId(
  orderId: number,
  vendor: SelectPartnerApiVendor,
  logger: ErrorLogger,
  errorMessage: string,
  options?: { estimatedCompletionMinutes?: number },
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(partnerApiOrdersTable)
      .where(eq(partnerApiOrdersTable.id, orderId))
      .limit(1);
    if (rows.length === 0) return;

    const order = rows[0];

    await sendPartnerOrderCreatedInternalEmail(order, vendor, logger);

    void deliverOrderCreatedWebhookOnce(order, vendor, {
      estimatedCompletionMinutes: options?.estimatedCompletionMinutes,
    })
      .then((delivered) => {
        if (!delivered) {
          appLogger.info('Partner order.created webhook not delivered after notifyOrderCreatedByOrderId', {
            orderId: order.id,
            vendorId: vendor.id,
            productType: order.product_type,
            hasOrderWebhookUrl: Boolean(order.webhook_url?.trim()),
            hasVendorWebhookUrl: Boolean(vendor.webhook_url?.trim()),
          });
        }
      })
      .catch((err) => {
        logger.error('Partner order.created webhook failed', {
          orderId: order.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    if (!isOrderCreatedNotificationProductType(order.product_type)) return;

    await dispatchVendorOrderNotification({
      event: 'order.created',
      order,
      vendor,
    });
  } catch (err) {
    logger.error(errorMessage, {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function completeTemplatedOrderAndNotify(params: {
  orderId: number;
  instanceSlug: string;
  songTitle: string;
  logger: ErrorLogger;
  errorMessage: string;
}): Promise<boolean> {
  const { orderId, instanceSlug: _instanceSlug, songTitle: _songTitle, logger, errorMessage } = params;
  try {
    const completedRows = await db
      .update(partnerApiOrdersTable)
      .set({ status: 'completed', completed_at: new Date(), updated_at: new Date() })
      .where(and(eq(partnerApiOrdersTable.id, orderId), ne(partnerApiOrdersTable.status, 'completed')))
      .returning();
    const completedOrder = completedRows[0];
    if (!completedOrder) return false;

    const vendors = await db
      .select()
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, completedOrder.vendor_id))
      .limit(1);
    if (vendors.length === 0) return false;

    const vendor = vendors[0];
    await dispatchVendorOrderNotification({
      event: 'order.completed',
      order: completedOrder,
      vendor,
    });

    return true;
  } catch (err) {
    logger.error(errorMessage, {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function completeCustomSongOrderAndNotify(params: {
  orderId: number;
  songSlug: string;
  variants: unknown[];
  logger: ErrorLogger;
  errorMessage: string;
}): Promise<boolean> {
  const { orderId, songSlug: _songSlug, variants: _variants, logger, errorMessage } = params;
  try {
    const completedRows = await db
      .update(partnerApiOrdersTable)
      .set({ status: 'completed', completed_at: new Date(), updated_at: new Date() })
      .where(and(eq(partnerApiOrdersTable.id, orderId), ne(partnerApiOrdersTable.status, 'completed')))
      .returning();
    const completedOrder = completedRows[0];
    if (!completedOrder) return false;

    const vendors = await db
      .select()
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, completedOrder.vendor_id))
      .limit(1);
    if (vendors.length === 0) return false;

    const vendor = vendors[0];
    await dispatchVendorOrderNotification({
      event: 'order.completed',
      order: completedOrder,
      vendor,
    });

    return true;
  } catch (err) {
    logger.error(errorMessage, {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
