/**
 * Admin – Partner API Product Pricing
 *
 * Pricing is defined per vendor × product type.
 * Product types: customer_templated_song | customer_custom_song | rj_show
 *
 * GET    /api/admin/partner-api/vendors/[vendorId]/prices                      – list all prices
 * POST   /api/admin/partner-api/vendors/[vendorId]/prices                      – upsert a price
 * DELETE /api/admin/partner-api/vendors/[vendorId]/prices?product_type=rj_show – deactivate a price
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { and, eq, isNull, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partnerApiProductPricesTable, partnerApiVendorsTable } from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { PRODUCT_TYPES, type ProductType } from '@/lib/partner-api/pricing';

export const runtime = 'nodejs';

const VALID_PRODUCT_TYPES = PRODUCT_TYPES.map((p) => p.value);

async function requireAdmin(logger: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
  if (!isAuthenticated) {
    logger.warn('Unauthorized admin partner-api prices access');
    return false;
  }
  return true;
}

async function resolveVendorId(
  ctx: { params?: Promise<{ vendorId: string }> },
): Promise<number | null> {
  const { vendorId } = await (ctx.params ?? Promise.resolve({ vendorId: '' }));
  const n = parseInt(vendorId, 10);
  return Number.isFinite(n) ? n : null;
}

async function getVendor(vendorIdNum: number) {
  const rows = await db
    .select({ id: partnerApiVendorsTable.id })
    .from(partnerApiVendorsTable)
    .where(eq(partnerApiVendorsTable.id, vendorIdNum))
    .limit(1);
  return rows[0] ?? null;
}

// ─── GET ──────────────────────────────────────────────────────────────

async function getHandler(
  _req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendorIdNum = await resolveVendorId(ctx);
    if (!vendorIdNum) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

    if (!(await getVendor(vendorIdNum))) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const prices = await db
      .select()
      .from(partnerApiProductPricesTable)
      .where(
        and(
          eq(partnerApiProductPricesTable.vendor_id, vendorIdNum),
          isNull(partnerApiProductPricesTable.product_id),
        ),
      )
      .orderBy(asc(partnerApiProductPricesTable.product_type));

    const productTypeLabel = (value: string) =>
      PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;

    return NextResponse.json({
      success: true,
      prices: prices.map((p) => ({
        id: p.id,
        product_type: p.product_type,
        product_label: productTypeLabel(p.product_type),
        price: p.price,
        currency: p.currency,
        active: p.active,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    });
  } catch (error) {
    ctx.logger.error('Failed to list partner API prices', error as any);
    return NextResponse.json({ error: 'Failed to list prices' }, { status: 500 });
  }
}

// ─── POST – upsert ────────────────────────────────────────────────────

const upsertPriceSchema = z.object({
  product_type: z.string().refine((v) => VALID_PRODUCT_TYPES.includes(v as ProductType), {
    message: `product_type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
  }),
  price: z.coerce.number().positive(),
  currency: z.string().min(3).max(10).default('INR'),
});

async function postHandler(
  req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendorIdNum = await resolveVendorId(ctx);
    if (!vendorIdNum) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

    if (!(await getVendor(vendorIdNum))) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = upsertPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { product_type, price, currency } = parsed.data;

    const existing = await db
      .select({ id: partnerApiProductPricesTable.id })
      .from(partnerApiProductPricesTable)
      .where(
        and(
          eq(partnerApiProductPricesTable.vendor_id, vendorIdNum),
          eq(partnerApiProductPricesTable.product_type, product_type),
          isNull(partnerApiProductPricesTable.product_id),
        ),
      )
      .limit(1);

    let priceRow;
    if (existing.length > 0) {
      [priceRow] = await db
        .update(partnerApiProductPricesTable)
        .set({ price: price.toFixed(2), currency: currency.toUpperCase(), active: true, updated_at: new Date() })
        .where(eq(partnerApiProductPricesTable.id, existing[0].id))
        .returning();
    } else {
      [priceRow] = await db
        .insert(partnerApiProductPricesTable)
        .values({
          vendor_id: vendorIdNum,
          product_type,
          product_id: null,
          price: price.toFixed(2),
          currency: currency.toUpperCase(),
          active: true,
        })
        .returning();
    }

    ctx.logger.info('Admin upserted partner API price', { vendorId: vendorIdNum, product_type, price });

    return NextResponse.json({
      success: true,
      price: priceRow,
      message: existing.length > 0 ? 'Price updated' : 'Price created',
    });
  } catch (error) {
    ctx.logger.error('Failed to upsert partner API price', error as any);
    return NextResponse.json({ error: 'Failed to upsert price' }, { status: 500 });
  }
}

// ─── DELETE – deactivate ──────────────────────────────────────────────

async function deleteHandler(
  req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendorIdNum = await resolveVendorId(ctx);
    if (!vendorIdNum) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const productType = searchParams.get('product_type');

    if (!productType || !VALID_PRODUCT_TYPES.includes(productType as ProductType)) {
      return NextResponse.json(
        { error: `product_type query param required. Valid values: ${VALID_PRODUCT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: partnerApiProductPricesTable.id })
      .from(partnerApiProductPricesTable)
      .where(
        and(
          eq(partnerApiProductPricesTable.vendor_id, vendorIdNum),
          eq(partnerApiProductPricesTable.product_type, productType),
          isNull(partnerApiProductPricesTable.product_id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 });
    }

    await db
      .update(partnerApiProductPricesTable)
      .set({ active: false, updated_at: new Date() })
      .where(eq(partnerApiProductPricesTable.id, existing[0].id));

    ctx.logger.info('Admin deactivated partner API price', { vendorId: vendorIdNum, productType });

    return NextResponse.json({ success: true, message: 'Price deactivated' });
  } catch (error) {
    ctx.logger.error('Failed to deactivate partner API price', error as any);
    return NextResponse.json({ error: 'Failed to deactivate price' }, { status: 500 });
  }
}

export const GET = withApiLogger('admin-partner-api-prices-list', getHandler);
export const POST = withApiLogger('admin-partner-api-prices-upsert', postHandler);
export const DELETE = withApiLogger('admin-partner-api-prices-delete', deleteHandler);
