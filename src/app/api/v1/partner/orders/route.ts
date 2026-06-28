/**
 * Partner API – Orders
 * POST /api/v1/partner/orders – Create a new order (any product type)
 * GET  /api/v1/partner/orders – List orders for vendor
 *
 * Product-specific creation logic lives in order-creators.ts.
 * This handler is product-agnostic: it handles idempotency, price resolution,
 * base order insertion, and sandbox failure simulation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
} from '@/lib/db/schema';
import { eq, and, desc, lt, gte, lte } from 'drizzle-orm';
import { withPartnerAuth, type PartnerAuthContext } from '@/lib/partner-api/auth';
import { resolvePrice } from '@/lib/partner-api/pricing';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { baseOrderSchema, PRODUCT_CREATORS } from '@/lib/partner-api/order-creators';
import { parsePartnerRequestJson } from '@/lib/partner-api/parse-json-body';
import { validateWebhookUrl } from '@/lib/partner-api/security';
import {
  notifyOrderCreatedByOrderId,
  notifyPartnerOrderCreationFailed,
  notifyPartnerOrderFailed,
} from '@/lib/vendor-order/notification-helpers';

export const runtime = 'nodejs';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── POST /api/v1/partner/orders ──────────────────────────────────────────────

async function postHandler(
  req: NextRequest,
  auth: PartnerAuthContext,
  context: { logger: any; requestId?: string },
) {
  const { logger: reqLogger } = context;
  const requestId = context.requestId || generateRequestId();
  const vendor = auth.vendor;

  try {
    let body: unknown;
    try {
      const parsed = await parsePartnerRequestJson(req);
      body = parsed.data;
      if (parsed.repaired) {
        reqLogger.info('Partner API: JSON body repaired before parse (e.g. unescaped newlines in strings)');
      }
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message:
              'Request body is not valid JSON. Use \\n inside strings for line breaks, not raw newlines. If you build JSON by hand, run it through JSON.stringify.',
            request_id: requestId,
          },
        },
        { status: 400 },
      );
    }

    // 1. Parse base fields
    const baseParsed = baseOrderSchema.safeParse(body);
    if (!baseParsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: baseParsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '), request_id: requestId } },
        { status: 400 },
      );
    }

    const { product_type, external_order_id, recipient_name, customer_mobile, webhook_url, metadata } =
      baseParsed.data;
    const idempotencyKey = baseParsed.data.idempotency_key || req.headers.get('idempotency-key') || null;

    // 1b. Validate webhook URL for SSRF safety
    if (webhook_url) {
      const urlCheck = await validateWebhookUrl(webhook_url);
      if (!urlCheck.valid) {
        reqLogger.warn('Partner API: invalid webhook_url rejected', {
          requestId,
          external_order_id,
          webhookUrlError: urlCheck.error,
        });
        return NextResponse.json(
          { error: { code: 'INVALID_WEBHOOK_URL', message: `webhook_url: ${urlCheck.error}`, request_id: requestId } },
          { status: 400 },
        );
      }
      reqLogger.info('Partner API: order-level webhook_url accepted', {
        requestId,
        external_order_id,
        product_type,
      });
    }

    // 2. Look up product creator
    const registration = PRODUCT_CREATORS[product_type];
    if (!registration) {
      return NextResponse.json(
        { error: { code: 'UNKNOWN_PRODUCT_TYPE', message: `Unknown product_type: ${product_type}`, request_id: requestId } },
        { status: 400 },
      );
    }

    // 3. Validate product-specific extra fields
    const extraParsed = registration.schema.safeParse(body);
    if (!extraParsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: extraParsed.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; '), request_id: requestId } },
        { status: 400 },
      );
    }

    // 3b. customer_templated_song: template_id requires recipient_name (base field)
    if (product_type === 'customer_templated_song') {
      const extraData = extraParsed.data as { template_id?: number };
      if (extraData.template_id != null && !recipient_name?.trim()) {
        reqLogger.warn('Partner API: recipient_name required when template_id is supplied', {
          requestId,
          external_order_id,
        });
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'recipient_name is required when template_id is supplied.',
              request_id: requestId,
            },
          },
          { status: 400 },
        );
      }
    }

    // 4. Idempotency check
    if (idempotencyKey) {
      const existing = await db
        .select()
        .from(partnerApiOrdersTable)
        .where(and(
          eq(partnerApiOrdersTable.vendor_id, vendor.id),
          eq(partnerApiOrdersTable.idempotency_key, idempotencyKey),
        ))
        .limit(1);

      if (existing.length > 0) {
        const existingOrder = existing[0];
        reqLogger.info('Partner API: idempotent order returned', { orderId: existingOrder.id, idempotencyKey });
        return NextResponse.json({
          success: true,
          order_id: existingOrder.id,
          status: existingOrder.status,
          ...(existingOrder.status === 'processing' ? { estimated_completion_minutes: 2 } : {}),
          ...(existingOrder.customer_mobile ? { customer_mobile: existingOrder.customer_mobile } : {}),
        });
      }
    }

    // 5. Price resolution
    const resolvedPrice = await resolvePrice(vendor.id, product_type);
    if (!resolvedPrice) {
      return NextResponse.json(
        { error: { code: 'PRICE_NOT_CONFIGURED', message: `Price is not configured for product_type: ${product_type}`, request_id: requestId } },
        { status: 400 },
      );
    }

    // 6. Create base order (status: pending)
    const [order] = await db
      .insert(partnerApiOrdersTable)
      .values({
        vendor_id: vendor.id,
        external_order_id,
        product_type,
        recipient_name,
        customer_mobile: customer_mobile ?? null,
        webhook_url: webhook_url || null,
        status: 'pending',
        amount_charged: resolvedPrice.price,
        currency: resolvedPrice.currency,
        metadata: metadata || null,
        idempotency_key: idempotencyKey,
      })
      .returning();

    if (!order) {
      void notifyPartnerOrderCreationFailed(
        {
          vendor,
          errorMessage: 'Failed to insert partner_api_orders row.',
          errorCode: 'INTERNAL_ERROR',
          source: 'partner-api-create-order',
          requestId,
          externalOrderId: external_order_id,
          productType: product_type,
          httpStatus: 500,
        },
        reqLogger,
      );
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to create order.', request_id: requestId } },
        { status: 500 },
      );
    }

    // 7. Sandbox simulated failure (before product-specific work)
    if (vendor.sandbox && metadata?.simulate === 'failure') {
      const [failedOrder] = await db
        .update(partnerApiOrdersTable)
        .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
        .where(eq(partnerApiOrdersTable.id, order.id))
        .returning();

      if (product_type === 'customer_templated_song') {
        notifyPartnerOrderFailed(
          failedOrder ?? order,
          vendor,
          'Simulated failure',
          reqLogger,
          { failedStep: 'sandbox_simulation' },
        );
      }

      reqLogger.info('Partner API: sandbox simulated failure', { orderId: order.id });
      return NextResponse.json({
        success: true,
        order_id: order.id,
        status: 'failed',
        ...(customer_mobile ? { customer_mobile } : {}),
      });
    }

    // 8. Delegate to product-specific creator
    let creatorResult;
    try {
      creatorResult = await registration.create({
        vendor,
        order,
        extra: extraParsed.data as Record<string, unknown>,
        requestId,
      });
    } catch (err: any) {
      const code = err.code ?? 'INTERNAL_ERROR';
      const httpStatus = err.status ?? 500;
      const message = err instanceof Error ? err.message : String(err);

      await db
        .update(partnerApiOrdersTable)
        .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
        .where(eq(partnerApiOrdersTable.id, order.id));

      const [failedOrder] = await db
        .select()
        .from(partnerApiOrdersTable)
        .where(eq(partnerApiOrdersTable.id, order.id))
        .limit(1);

      void notifyPartnerOrderCreationFailed(
        {
          vendor,
          order: failedOrder ?? order,
          errorMessage: message,
          errorCode: code,
          source: 'partner-api-create-order',
          requestId,
          httpStatus,
        },
        reqLogger,
      );

      if (failedOrder?.product_type === 'customer_templated_song') {
        notifyPartnerOrderFailed(failedOrder, vendor, message, reqLogger, {
          failedStep: 'order_creation',
        });
      }

      return NextResponse.json(
        { error: { code, message, request_id: requestId } },
        { status: httpStatus },
      );
    }

    void notifyOrderCreatedByOrderId(
      order.id,
      vendor,
      reqLogger,
      'Partner API: order.created notification failed',
      {
        estimatedCompletionMinutes:
          typeof creatorResult.responseFields?.estimated_completion_minutes === 'number'
            ? creatorResult.responseFields.estimated_completion_minutes
            : undefined,
      },
    );

    reqLogger.info('Partner API: order created', {
      orderId: order.id,
      productType: product_type,
      vendorId: vendor.id,
      sandbox: vendor.sandbox,
      has_customer_mobile: Boolean(customer_mobile),
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      status: creatorResult.status ?? 'processing',
      ...(customer_mobile ? { customer_mobile } : {}),
      ...creatorResult.responseFields,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStructuredError(error, {
      operation: 'partner-api-create-order',
      requestId,
      additionalData: { vendorId: vendor.id },
    });
    void notifyPartnerOrderCreationFailed(
      {
        vendor,
        errorMessage: message,
        errorCode: 'INTERNAL_ERROR',
        source: 'partner-api-create-order',
        requestId,
        httpStatus: 500,
      },
      reqLogger,
    );
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create order.', request_id: requestId } },
      { status: 500 },
    );
  }
}

// ─── GET /api/v1/partner/orders ───────────────────────────────────────────────

async function getHandler(
  req: NextRequest,
  auth: PartnerAuthContext,
  context: { logger: any; requestId?: string },
) {
  const { logger: reqLogger } = context;
  const requestId = context.requestId || generateRequestId();
  const vendor = auth.vendor;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.trim() || null;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    const conditions = [eq(partnerApiOrdersTable.vendor_id, vendor.id)];

    if (status) conditions.push(eq(partnerApiOrdersTable.status, status as any));

    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'from: Invalid date format. Use ISO 8601.', request_id: requestId } },
          { status: 400 },
        );
      }
      conditions.push(gte(partnerApiOrdersTable.created_at, fromDate));
    }

    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'to: Invalid date format. Use ISO 8601.', request_id: requestId } },
          { status: 400 },
        );
      }
      conditions.push(lte(partnerApiOrdersTable.created_at, toDate));
    }

    if (cursor) conditions.push(lt(partnerApiOrdersTable.id, parseInt(cursor, 10)));

    const orders = await db
      .select()
      .from(partnerApiOrdersTable)
      .where(and(...conditions))
      .orderBy(desc(partnerApiOrdersTable.id))
      .limit(limit + 1);

    const hasMore = orders.length > limit;
    const results = orders.slice(0, limit);

    const ordersResponse = results.map((o) => {
      const base: Record<string, unknown> = {
        order_id: o.id,
        external_order_id: o.external_order_id,
        product_type: o.product_type,
        recipient_name: o.recipient_name,
        status: o.status,
        amount_charged: o.amount_charged,
        currency: o.currency,
        created_at: o.created_at.toISOString(),
        updated_at: o.updated_at.toISOString(),
      };

      if (o.customer_mobile) {
        base.customer_mobile = o.customer_mobile;
      }

      if (o.order_token) {
        base.customer_link = `https://melodia-songs.com/vendor/${vendor.slug}/order/${o.order_token}`;
      }

      if (o.status === 'completed' || o.status === 'failed') {
        base.completed_at = o.completed_at?.toISOString();
      }

      return base;
    });

    reqLogger.info('Partner API: list orders', { vendorId: vendor.id, count: results.length, status, cursor });

    return NextResponse.json({
      success: true,
      orders: ordersResponse,
      pagination: {
        limit,
        has_more: hasMore,
        next_cursor: hasMore ? results[results.length - 1].id.toString() : null,
      },
    });
  } catch (error) {
    logStructuredError(error, { operation: 'partner-api-list-orders', requestId, additionalData: { vendorId: vendor.id } });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list orders.', request_id: requestId } },
      { status: 500 },
    );
  }
}

// ─── Route exports ────────────────────────────────────────────────────────────

const postAuthed = withPartnerAuth(postHandler);
const postLogged = withApiLogger('partner-api-create-order', postAuthed);
export const POST = withRateLimit('partner.orders.create', postLogged);

const getAuthed = withPartnerAuth(getHandler);
const getLogged = withApiLogger('partner-api-list-orders', getAuthed);
export const GET = withRateLimit('partner.orders.list', getLogged);
