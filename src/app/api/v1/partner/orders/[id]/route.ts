/**
 * Partner API – Order detail
 * GET /api/v1/partner/orders/:id
 *
 * Returns a single order scoped to the authenticated vendor.
 * Product-specific fields are added by enrichers in order-detail-enrichers.ts —
 * this handler stays product-agnostic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnerApiOrdersTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withPartnerAuth, type PartnerAuthContext } from '@/lib/partner-api/auth';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { enrichOrderDetail } from '@/lib/partner-api/order-detail-enrichers';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function handler(
  req: NextRequest,
  auth: PartnerAuthContext,
  context: { logger: any; requestId?: string; params?: Promise<{ id: string }> },
) {
  const { logger } = context;
  const requestId = context.requestId || generateRequestId();
  const vendor = auth.vendor;

  try {
    const params = context.params ? await context.params : null;
    const orderId = parseInt(params?.id || '', 10);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ORDER_ID', message: 'Invalid order ID.', request_id: requestId } },
        { status: 400 },
      );
    }

    const orders = await db
      .select()
      .from(partnerApiOrdersTable)
      .where(
        and(
          eq(partnerApiOrdersTable.id, orderId),
          eq(partnerApiOrdersTable.vendor_id, vendor.id),
        ),
      )
      .limit(1);

    if (orders.length === 0) {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.', request_id: requestId } },
        { status: 404 },
      );
    }

    const order = orders[0];

    // Base fields common to every product type
    const response: Record<string, unknown> = {
      success: true,
      order_id: order.id,
      external_order_id: order.external_order_id,
      product_type: order.product_type,
      recipient_name: order.recipient_name,
      status: order.status,
      amount_charged: order.amount_charged,
      currency: order.currency,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
    };

    if (order.customer_mobile) {
      response.customer_mobile = order.customer_mobile;
    }
    if (order.order_token) {
      response.customer_link = `https://melodia-songs.com/vendor/${vendor.slug}/order/${order.order_token}`;
      response.order_token = order.order_token;
    }
    if (order.status === 'completed' || order.status === 'failed') {
      response.completed_at = order.completed_at?.toISOString();
    }

    // Delegate product-specific enrichment — register new products in order-detail-enrichers.ts
    await enrichOrderDetail({ order, vendor, response });

    logger.info('Partner API: get order detail', { orderId: order.id, vendorId: vendor.id, productType: order.product_type });

    return NextResponse.json(response);
  } catch (error) {
    logStructuredError(error, {
      operation: 'partner-api-get-order',
      requestId,
      additionalData: { vendorId: vendor.id },
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch order.', request_id: requestId } },
      { status: 500 },
    );
  }
}

const authedHandler = withPartnerAuth(handler);
const loggedHandler = withApiLogger('partner-api-get-order', authedHandler);
export const GET = withRateLimit('partner.orders.get', loggedHandler);
