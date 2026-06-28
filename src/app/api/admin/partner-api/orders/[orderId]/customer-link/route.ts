/**
 * Admin – Resolve or mint customer-facing URL for a Partner API order.
 *
 * POST /api/admin/partner-api/orders/[orderId]/customer-link
 *
 * - customer_templated_song, customer_custom_song, rj_show: ensures order_token exists (mints UUID if missing), returns /vendor/{slug}/order/{token}
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { getBaseUrl } from '@/lib/utils/url';

export const runtime = 'nodejs';

const ORDER_FLOW_TYPES = new Set([
  'customer_templated_song',
  'customer_custom_song',
  'rj_show',
]);

async function requireAdmin(logger: any): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value === 'true') return true;
  logger.warn('Unauthorized admin partner-api customer-link access');
  return false;
}

async function postHandler(
  _req: NextRequest,
  ctx: { logger: any; params: Promise<{ orderId: string }> },
) {
  const { logger, params } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId: orderIdParam } = await params;
  const orderId = Number.parseInt(orderIdParam, 10);
  if (Number.isNaN(orderId) || orderId < 1) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const rows = await db
    .select({
      order: partnerApiOrdersTable,
      vendor_slug: partnerApiVendorsTable.slug,
    })
    .from(partnerApiOrdersTable)
    .innerJoin(
      partnerApiVendorsTable,
      eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id),
    )
    .where(eq(partnerApiOrdersTable.id, orderId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order, vendor_slug } = rows[0];
  const baseUrl = await getBaseUrl();

  if (!ORDER_FLOW_TYPES.has(order.product_type)) {
    return NextResponse.json(
      {
        error: `Product type "${order.product_type}" does not use a standard customer link.`,
      },
      { status: 400 },
    );
  }

  let token = order.order_token;
  let minted_new_token = false;

  if (!token) {
    const newToken = crypto.randomUUID();
    const updated = await db
      .update(partnerApiOrdersTable)
      .set({ order_token: newToken, updated_at: new Date() })
      .where(
        and(
          eq(partnerApiOrdersTable.id, orderId),
          isNull(partnerApiOrdersTable.order_token),
        ),
      )
      .returning({ order_token: partnerApiOrdersTable.order_token });

    if (updated.length > 0) {
      token = updated[0].order_token;
      minted_new_token = true;
    } else {
      const [again] = await db
        .select({ order_token: partnerApiOrdersTable.order_token })
        .from(partnerApiOrdersTable)
        .where(eq(partnerApiOrdersTable.id, orderId))
        .limit(1);
      token = again?.order_token ?? null;
    }
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Could not assign order_token for this order' },
      { status: 500 },
    );
  }

  const path = `/vendor/${vendor_slug}/order/${token}`;
  const customer_link = `${baseUrl}${path}`;
  logger.info('Admin resolved customer order link', {
    orderId,
    minted_new_token,
    product_type: order.product_type,
  });

  return NextResponse.json({
    customer_link,
    link_kind: 'order_flow' as const,
    order_token: token,
    minted_new_token,
    path,
  });
}

export const POST = withApiLogger('admin-partner-api-order-customer-link', postHandler);
