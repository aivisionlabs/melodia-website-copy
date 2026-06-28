import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { asc, and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiProductPricesTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generateWebhookSecret } from '@/lib/partner-api/security';

export const runtime = 'nodejs';

const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  logo_url: z.string().url().optional().or(z.literal('')),
  webhook_url: z.string().url().optional().or(z.literal('')),
  invoice_legal_entity_name: z.string().max(500).optional().or(z.literal('')),
  invoice_address: z.string().max(2000).optional().or(z.literal('')),
  invoice_gst_number: z.string().max(50).optional().or(z.literal('')),
  invoice_mobile: z.string().max(30).optional().or(z.literal('')),
  sandbox: z.boolean().default(false),
  active: z.boolean().default(true),
  default_price: z.coerce.number().positive().optional(),
  currency: z.string().min(3).max(10).default('INR'),
});

async function requireAdmin(logger: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

  if (!isAuthenticated) {
    logger.warn('Unauthorized admin partner-api vendors access');
    return false;
  }

  return true;
}

async function getHandler(_req: NextRequest, ctx: { logger: any }) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendors = await db
      .select()
      .from(partnerApiVendorsTable)
      .orderBy(asc(partnerApiVendorsTable.created_at));

    const defaultPrices = await db
      .select({
        vendor_id: partnerApiProductPricesTable.vendor_id,
        price: partnerApiProductPricesTable.price,
        currency: partnerApiProductPricesTable.currency,
      })
      .from(partnerApiProductPricesTable)
      .where(
        and(
          eq(partnerApiProductPricesTable.product_type, 'customer_templated_song'),
          isNull(partnerApiProductPricesTable.product_id),
          eq(partnerApiProductPricesTable.active, true),
        ),
      );

    const defaultPriceByVendor = new Map<number, { price: string; currency: string }>();
    for (const row of defaultPrices) {
      defaultPriceByVendor.set(row.vendor_id, {
        price: row.price,
        currency: row.currency,
      });
    }

    const responseVendors = vendors.map((vendor) => ({
      ...vendor,
      default_price: defaultPriceByVendor.get(vendor.id)?.price ?? null,
      default_price_currency: defaultPriceByVendor.get(vendor.id)?.currency ?? null,
    }));

    ctx.logger.info('Admin listed partner API vendors', {
      count: responseVendors.length,
    });

    return NextResponse.json({
      success: true,
      vendors: responseVendors,
    });
  } catch (error) {
    ctx.logger.error('Failed to list partner API vendors', error as any);
    return NextResponse.json(
      { error: 'Failed to list vendors' },
      { status: 500 },
    );
  }
}

async function postHandler(req: NextRequest, ctx: { logger: any }) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const existingVendor = await db
      .select({ id: partnerApiVendorsTable.id })
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.slug, input.slug))
      .limit(1);

    if (existingVendor.length > 0) {
      return NextResponse.json(
        { error: 'Vendor slug already exists' },
        { status: 400 },
      );
    }

    const webhookSecret = generateWebhookSecret();

    const [vendor] = await db
      .insert(partnerApiVendorsTable)
      .values({
        name: input.name.trim(),
        slug: input.slug.trim(),
        logo_url: input.logo_url?.trim() ? input.logo_url.trim() : null,
        webhook_url: input.webhook_url?.trim() ? input.webhook_url.trim() : null,
        webhook_secret: webhookSecret,
        invoice_legal_entity_name: input.invoice_legal_entity_name?.trim()
          ? input.invoice_legal_entity_name.trim()
          : null,
        invoice_address: input.invoice_address?.trim()
          ? input.invoice_address.trim()
          : null,
        invoice_gst_number: input.invoice_gst_number?.trim()
          ? input.invoice_gst_number.trim()
          : null,
        invoice_mobile: input.invoice_mobile?.trim()
          ? input.invoice_mobile.trim()
          : null,
        sandbox: input.sandbox,
        active: input.active,
      })
      .returning();

    if (!vendor) {
      return NextResponse.json(
        { error: 'Failed to create vendor' },
        { status: 500 },
      );
    }

    if (input.default_price) {
      await db.insert(partnerApiProductPricesTable).values({
        vendor_id: vendor.id,
        product_type: 'customer_templated_song',
        product_id: null,
        price: input.default_price.toFixed(2),
        currency: input.currency.toUpperCase(),
        active: true,
      });
    }

    ctx.logger.info('Admin created partner API vendor', {
      vendorId: vendor.id,
      slug: vendor.slug,
      sandbox: vendor.sandbox,
      hasDefaultPrice: Boolean(input.default_price),
    });

    return NextResponse.json({
      success: true,
      vendor,
      webhook_secret: webhookSecret,
      message: 'Vendor created successfully',
    });
  } catch (error) {
    ctx.logger.error('Failed to create partner API vendor', error as any);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('admin-partner-api-vendors-list', getHandler);
export const POST = withApiLogger('admin-partner-api-vendors-create', postHandler);
