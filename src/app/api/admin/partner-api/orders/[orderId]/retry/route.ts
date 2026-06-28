/**
 * Admin: Retry failed vendor templated song order
 * POST /api/admin/partner-api/orders/[orderId]/retry
 *
 * Retries generation for a vendor order that failed during templated song instance creation.
 * Order must be in 'failed' status and have product_type = 'customer_templated_song'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { partnerApiOrdersTable, partnerApiVendorsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import { logger } from '@/lib/logger';
import { after } from 'next/server';

async function handler(
  req: NextRequest,
  { params, logger: ctxLogger }: { params: Promise<{ orderId: string }>; logger: any },
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await params;
    const id = parseInt(orderId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const orders = await db
      .select({
        id: partnerApiOrdersTable.id,
        status: partnerApiOrdersTable.status,
        product_type: partnerApiOrdersTable.product_type,
        template_id: partnerApiOrdersTable.template_id,
        recipient_name: partnerApiOrdersTable.recipient_name,
        vendor_id: partnerApiOrdersTable.vendor_id,
      })
      .from(partnerApiOrdersTable)
      .where(eq(partnerApiOrdersTable.id, id))
      .limit(1);

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Validate order is in failed state
    if (order.status !== 'failed') {
      return NextResponse.json(
        {
          error: 'Order is not in failed state',
          details: `Current status: ${order.status}. Only 'failed' orders can be retried.`,
        },
        { status: 400 }
      );
    }

    // Validate order is for templated song
    if (order.product_type !== 'customer_templated_song') {
      return NextResponse.json(
        {
          error: 'Order is not for templated song',
          details: `Product type: ${order.product_type}. Only templated song orders can be retried.`,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!order.template_id || !order.recipient_name) {
      return NextResponse.json(
        {
          error: 'Order missing required fields for generation',
          details: 'Order must have template_id and recipient_name',
        },
        { status: 400 }
      );
    }

    // Get vendor for logging
    const vendors = await db
      .select({ slug: partnerApiVendorsTable.slug, sandbox: partnerApiVendorsTable.sandbox })
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, order.vendor_id))
      .limit(1);

    const vendor = vendors[0];

    // Update status to in-progress
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'song_generation_inprogress', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, order.id));

    ctxLogger.info('admin retry: retrying templated song generation', {
      orderId: order.id,
      templateId: order.template_id,
      vendorSlug: vendor?.slug,
    });

    // Trigger async generation
    after(async () => {
      try {
        await generateTemplatedInstanceForIdentity({
          templateId: order.template_id!,
          name: order.recipient_name!,
          partnerApiOrderId: order.id,
          sandbox: vendor?.sandbox ?? false,
          logger: {
            info: (msg, data) =>
              logger.info(msg, { ...data, vendorSlug: vendor?.slug, orderId: order.id }),
            warn: (msg, data) =>
              logger.warn(msg, { ...data, vendorSlug: vendor?.slug, orderId: order.id }),
            error: (msg, data) =>
              logger.error(msg, { ...data, vendorSlug: vendor?.slug, orderId: order.id }),
          },
        });
      } catch (err) {
        logger.error('admin retry: failed to generate instance', {
          orderId: order.id,
          templateId: order.template_id,
          error: String(err),
        });
        await db
          .update(partnerApiOrdersTable)
          .set({ status: 'failed', updated_at: new Date() })
          .where(eq(partnerApiOrdersTable.id, order.id));
      }
    });

    ctxLogger.info('admin retry: initiated', { orderId: order.id });
    return NextResponse.json({
      success: true,
      message: 'Retry initiated for order',
      orderId: order.id,
    });
  } catch (error) {
    ctxLogger.error('admin retry: handler error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry order' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('admin-partner-orders-retry', handler);
