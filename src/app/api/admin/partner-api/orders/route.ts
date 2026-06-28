/**
 * Admin – Partner API Orders
 *
 * GET  /api/admin/partner-api/orders?view=summary              – counts by vendor × product × status
 * GET  /api/admin/partner-api/orders?page=&pageSize=&vendor_id=&product_type=&status= – paginated list
 *
 * POST /api/admin/partner-api/orders
 *
 * Creates a partner order on behalf of any vendor using admin auth (cookie-based).
 * Reuses the same PRODUCT_CREATORS registry and price-resolution logic as the
 * real partner API endpoint, but skips API-key auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiInvoiceLineItemsTable,
  partnerApiOrdersTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import {
  PRODUCT_TYPES,
  resolvePrice,
  type ProductType,
} from '@/lib/partner-api/pricing';
import { baseOrderSchema, PRODUCT_CREATORS } from '@/lib/partner-api/order-creators';
import {
  notifyOrderCreatedByOrderId,
  notifyPartnerOrderCreationFailed,
  notifyPartnerOrderFailed,
} from '@/lib/vendor-order/notification-helpers';

export const runtime = 'nodejs';

const PRODUCT_TYPE_VALUES = new Set(PRODUCT_TYPES.map((p) => p.value));

const ORDER_STATUSES = [
  'pending',
  'form_submitted',
  'lyrics_generation_inprogress',
  'lyrics_ready_for_review',
  'lyrics_revision_requested',
  'lyrics_approved',
  'song_generation_inprogress',
  'completed',
  'failed',
  'processing',
] as const;

async function requireAdmin(logger: any): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value === 'true') return true;
  logger.warn('Unauthorized admin partner-api orders access');
  return false;
}

const productLabelByType = Object.fromEntries(
  PRODUCT_TYPES.map((p) => [p.value, p.label]),
) as Record<string, string>;

async function getHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');

  if (view === 'summary') {
    const rows = await db
      .select({
        vendor_id: partnerApiVendorsTable.id,
        vendor_name: partnerApiVendorsTable.name,
        vendor_slug: partnerApiVendorsTable.slug,
        vendor_sandbox: partnerApiVendorsTable.sandbox,
        product_type: partnerApiOrdersTable.product_type,
        status: partnerApiOrdersTable.status,
        order_count: sql<number>`count(${partnerApiOrdersTable.id})::int`,
      })
      .from(partnerApiOrdersTable)
      .innerJoin(
        partnerApiVendorsTable,
        eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id),
      )
      .groupBy(
        partnerApiVendorsTable.id,
        partnerApiVendorsTable.name,
        partnerApiVendorsTable.slug,
        partnerApiVendorsTable.sandbox,
        partnerApiOrdersTable.product_type,
        partnerApiOrdersTable.status,
      )
      .orderBy(
        asc(partnerApiVendorsTable.name),
        asc(partnerApiOrdersTable.product_type),
        asc(partnerApiOrdersTable.status),
      );

    type ProductAgg = {
      product_type: string;
      product_label: string;
      total: number;
      by_status: Record<string, number>;
    };
    type VendorAgg = {
      vendor_id: number;
      vendor_name: string;
      vendor_slug: string;
      sandbox: boolean;
      total_orders: number;
      by_product: ProductAgg[];
    };

    const vendorMap = new Map<number, VendorAgg>();
    const productKey = (vendorId: number, productType: string) => `${vendorId}:${productType}`;

    const productRowMap = new Map<string, ProductAgg>();

    for (const row of rows) {
      let vendor = vendorMap.get(row.vendor_id);
      if (!vendor) {
        vendor = {
          vendor_id: row.vendor_id,
          vendor_name: row.vendor_name,
          vendor_slug: row.vendor_slug,
          sandbox: row.vendor_sandbox,
          total_orders: 0,
          by_product: [],
        };
        vendorMap.set(row.vendor_id, vendor);
      }

      vendor.total_orders += row.order_count;

      const pk = productKey(row.vendor_id, row.product_type);
      let productAgg = productRowMap.get(pk);
      if (!productAgg) {
        productAgg = {
          product_type: row.product_type,
          product_label: productLabelByType[row.product_type] ?? row.product_type,
          total: 0,
          by_status: {},
        };
        productRowMap.set(pk, productAgg);
        vendor.by_product.push(productAgg);
      }

      productAgg.total += row.order_count;
      productAgg.by_status[row.status] =
        (productAgg.by_status[row.status] ?? 0) + row.order_count;
    }

    const vendors = Array.from(vendorMap.values()).sort((a, b) =>
      a.vendor_name.localeCompare(b.vendor_name),
    );
    for (const v of vendors) {
      v.by_product.sort((p, q) => p.product_type.localeCompare(q.product_type));
    }

    return NextResponse.json({ vendors });
  }

  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSizeRaw = Number.parseInt(searchParams.get('pageSize') || '50', 10) || 50;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

  const conditions = [];

  const vendorIdParam = searchParams.get('vendor_id');
  if (vendorIdParam) {
    const vid = Number.parseInt(vendorIdParam, 10);
    if (!Number.isNaN(vid) && vid > 0) {
      conditions.push(eq(partnerApiOrdersTable.vendor_id, vid));
    }
  }

  const productTypeFilter = searchParams.get('product_type');
  if (
    productTypeFilter &&
    PRODUCT_TYPE_VALUES.has(productTypeFilter as ProductType)
  ) {
    conditions.push(eq(partnerApiOrdersTable.product_type, productTypeFilter as ProductType));
  }

  const statusFilter = searchParams.get('status');
  if (statusFilter && (ORDER_STATUSES as readonly string[]).includes(statusFilter)) {
    conditions.push(
      eq(partnerApiOrdersTable.status, statusFilter as (typeof ORDER_STATUSES)[number]),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(partnerApiOrdersTable)
    .where(whereClause);

  const total = countRow?.total ?? 0;

  const orderRows = await db
    .select({
      id: partnerApiOrdersTable.id,
      vendor_id: partnerApiOrdersTable.vendor_id,
      vendor_name: partnerApiVendorsTable.name,
      vendor_slug: partnerApiVendorsTable.slug,
      external_order_id: partnerApiOrdersTable.external_order_id,
      product_type: partnerApiOrdersTable.product_type,
      status: partnerApiOrdersTable.status,
      order_token: partnerApiOrdersTable.order_token,
      created_at: partnerApiOrdersTable.created_at,
      completed_at: partnerApiOrdersTable.completed_at,
      amount_charged: partnerApiOrdersTable.amount_charged,
      currency: partnerApiOrdersTable.currency,
      is_test_order: partnerApiOrdersTable.is_test_order,
    })
    .from(partnerApiOrdersTable)
    .innerJoin(
      partnerApiVendorsTable,
      eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id),
    )
    .where(whereClause)
    .orderBy(desc(partnerApiOrdersTable.created_at))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const orderIds = orderRows.map((r) => r.id);
  const invoicedRows =
    orderIds.length > 0
      ? await db
          .select({ order_id: partnerApiInvoiceLineItemsTable.order_id })
          .from(partnerApiInvoiceLineItemsTable)
          .where(inArray(partnerApiInvoiceLineItemsTable.order_id, orderIds))
      : [];
  const invoicedSet = new Set(invoicedRows.map((r) => r.order_id));

  const orders = orderRows.map((row) => ({
    ...row,
    product_label: productLabelByType[row.product_type] ?? row.product_type,
    is_invoiced: invoicedSet.has(row.id),
  }));

  return NextResponse.json({ orders, total, page, pageSize });
}

async function postHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;
  const requestId = `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Extract vendor_id
  const vendorIdSchema = z.object({ vendor_id: z.number().int().positive() });
  const vendorIdParsed = vendorIdSchema.safeParse(body);
  if (!vendorIdParsed.success) {
    return NextResponse.json({ error: 'vendor_id (integer) is required' }, { status: 400 });
  }
  const { vendor_id } = vendorIdParsed.data;

  // Load vendor
  const vendors = await db
    .select()
    .from(partnerApiVendorsTable)
    .where(eq(partnerApiVendorsTable.id, vendor_id))
    .limit(1);

  if (vendors.length === 0) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }
  const vendor = vendors[0];

  // Parse base fields
  const baseParsed = baseOrderSchema.safeParse(body);
  if (!baseParsed.success) {
    return NextResponse.json(
      {
        error: baseParsed.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; '),
      },
      { status: 400 },
    );
  }

  const { product_type, external_order_id, recipient_name, customer_mobile, webhook_url, metadata } =
    baseParsed.data;

  // Look up product creator
  const registration = PRODUCT_CREATORS[product_type];
  if (!registration) {
    return NextResponse.json(
      { error: `Unknown product_type: ${product_type}` },
      { status: 400 },
    );
  }

  // Validate product-specific fields
  const extraParsed = registration.schema.safeParse(body);
  if (!extraParsed.success) {
    return NextResponse.json(
      {
        error: extraParsed.error.errors
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join('; '),
      },
      { status: 400 },
    );
  }

  if (product_type === 'customer_templated_song') {
    const extraData = extraParsed.data as { template_id?: number };
    if (extraData.template_id != null && !recipient_name?.trim()) {
      logger.warn('Admin partner-api: recipient_name required when template_id is supplied', {
        requestId,
        external_order_id,
        vendor_id,
      });
      return NextResponse.json(
        { error: 'recipient_name is required' },
        { status: 400 },
      );
    }
  }

  // Resolve price
  const resolvedPrice = await resolvePrice(vendor.id, product_type);
  if (!resolvedPrice) {
    return NextResponse.json(
      { error: `Price is not configured for product_type: ${product_type} on this vendor` },
      { status: 400 },
    );
  }

  // Create base order row
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
    })
    .returning();

  if (!order) {
    void notifyPartnerOrderCreationFailed(
      {
        vendor,
        errorMessage: 'Failed to insert partner_api_orders row.',
        errorCode: 'INTERNAL_ERROR',
        source: 'admin-partner-api-create-order',
        requestId,
        externalOrderId: external_order_id,
        productType: product_type,
        httpStatus: 500,
      },
      logger,
    );
    return NextResponse.json({ error: 'Failed to create order row' }, { status: 500 });
  }

  // Delegate to product-specific creator
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
        source: 'admin-partner-api-create-order',
        requestId,
        httpStatus,
      },
      logger,
    );

    if (failedOrder?.product_type === 'customer_templated_song') {
      notifyPartnerOrderFailed(failedOrder, vendor, message, logger, {
        failedStep: 'order_creation',
      });
    }

    return NextResponse.json({ error: message, code }, { status: httpStatus });
  }

  void notifyOrderCreatedByOrderId(
    order.id,
    vendor,
    logger,
    'Admin partner order: order.created notification failed',
    {
      estimatedCompletionMinutes:
        typeof creatorResult.responseFields?.estimated_completion_minutes === 'number'
          ? creatorResult.responseFields.estimated_completion_minutes
          : undefined,
    },
  );

  logger.info('Admin created partner order', {
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
    ...creatorResult.responseFields,
  });
}

export const GET = withApiLogger('admin-partner-api-orders-list', getHandler);
export const POST = withApiLogger('admin-partner-api-create-order', postHandler);
