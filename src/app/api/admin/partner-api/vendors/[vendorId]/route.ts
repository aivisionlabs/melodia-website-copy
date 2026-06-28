import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiProductPricesTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generateWebhookSecret } from '@/lib/partner-api/security';

export const runtime = 'nodejs';

const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  webhook_url: z.string().url().optional().or(z.literal('')),
  invoice_legal_entity_name: z.string().max(500).optional().or(z.literal('')),
  invoice_address: z.string().max(2000).optional().or(z.literal('')),
  invoice_gst_number: z.string().max(50).optional().or(z.literal('')),
  invoice_mobile: z.string().max(30).optional().or(z.literal('')),
  sandbox: z.boolean().optional(),
  active: z.boolean().optional(),
  default_price: z.coerce.number().positive().optional(),
  clear_default_price: z.boolean().optional(),
  currency: z.string().min(3).max(10).optional(),
  rotate_webhook_secret: z.boolean().optional(),
});

async function requireAdmin(logger: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

  if (!isAuthenticated) {
    logger.warn('Unauthorized admin partner-api vendor update access');
    return false;
  }

  return true;
}

async function putHandler(
  req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await (ctx.params ?? Promise.resolve({ vendorId: '' }));
    const vendorIdNum = Number.parseInt(String(vendorId), 10);
    if (!Number.isFinite(vendorIdNum)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const existingVendor = await db
      .select()
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, vendorIdNum))
      .limit(1);

    if (existingVendor.length === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (input.slug && input.slug !== existingVendor[0].slug) {
      const slugConflict = await db
        .select({ id: partnerApiVendorsTable.id })
        .from(partnerApiVendorsTable)
        .where(eq(partnerApiVendorsTable.slug, input.slug))
        .limit(1);

      if (slugConflict.length > 0) {
        return NextResponse.json(
          { error: 'Vendor slug already exists' },
          { status: 400 },
        );
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.slug !== undefined) updates.slug = input.slug.trim();
    if (input.logo_url !== undefined) {
      updates.logo_url = input.logo_url?.trim() ? input.logo_url.trim() : null;
    }
    if (input.webhook_url !== undefined) {
      updates.webhook_url = input.webhook_url?.trim() ? input.webhook_url.trim() : null;
    }
    if (input.invoice_legal_entity_name !== undefined) {
      updates.invoice_legal_entity_name = input.invoice_legal_entity_name?.trim()
        ? input.invoice_legal_entity_name.trim()
        : null;
    }
    if (input.invoice_address !== undefined) {
      updates.invoice_address = input.invoice_address?.trim()
        ? input.invoice_address.trim()
        : null;
    }
    if (input.invoice_gst_number !== undefined) {
      updates.invoice_gst_number = input.invoice_gst_number?.trim()
        ? input.invoice_gst_number.trim()
        : null;
    }
    if (input.invoice_mobile !== undefined) {
      updates.invoice_mobile = input.invoice_mobile?.trim()
        ? input.invoice_mobile.trim()
        : null;
    }
    if (input.sandbox !== undefined) updates.sandbox = input.sandbox;
    if (input.active !== undefined) updates.active = input.active;

    let newWebhookSecret: string | null = null;
    if (input.rotate_webhook_secret) {
      newWebhookSecret = generateWebhookSecret();
      updates.webhook_secret = newWebhookSecret;
    }

    const [updatedVendor] = await db
      .update(partnerApiVendorsTable)
      .set(updates)
      .where(eq(partnerApiVendorsTable.id, vendorIdNum))
      .returning();

    if (input.default_price !== undefined || input.clear_default_price) {
      const existingDefaultPrice = await db
        .select({ id: partnerApiProductPricesTable.id })
        .from(partnerApiProductPricesTable)
        .where(
          and(
            eq(partnerApiProductPricesTable.vendor_id, vendorIdNum),
            eq(partnerApiProductPricesTable.product_type, 'customer_templated_song'),
            isNull(partnerApiProductPricesTable.product_id),
          ),
        )
        .limit(1);

      if (input.clear_default_price) {
        if (existingDefaultPrice.length > 0) {
          await db
            .update(partnerApiProductPricesTable)
            .set({
              active: false,
              updated_at: new Date(),
            })
            .where(eq(partnerApiProductPricesTable.id, existingDefaultPrice[0].id));
        }
      } else if (input.default_price !== undefined) {
        if (existingDefaultPrice.length > 0) {
          await db
            .update(partnerApiProductPricesTable)
            .set({
              price: input.default_price.toFixed(2),
              currency: (input.currency ?? 'INR').toUpperCase(),
              active: true,
              updated_at: new Date(),
            })
            .where(eq(partnerApiProductPricesTable.id, existingDefaultPrice[0].id));
        } else {
          await db.insert(partnerApiProductPricesTable).values({
            vendor_id: vendorIdNum,
            product_type: 'customer_templated_song',
            product_id: null,
            price: input.default_price.toFixed(2),
            currency: (input.currency ?? 'INR').toUpperCase(),
            active: true,
          });
        }
      }
    }

    ctx.logger.info('Admin updated partner API vendor', {
      vendorId: vendorIdNum,
      rotatedSecret: Boolean(newWebhookSecret),
    });

    return NextResponse.json({
      success: true,
      vendor: updatedVendor,
      webhook_secret: newWebhookSecret,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    ctx.logger.error('Failed to update partner API vendor', error as any);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 },
    );
  }
}

export const PUT = withApiLogger('admin-partner-api-vendors-update', putHandler);
