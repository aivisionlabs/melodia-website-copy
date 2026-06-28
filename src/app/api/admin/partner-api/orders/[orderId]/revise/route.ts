/**
 * Admin: Revise completed vendor templated song order
 * POST /api/admin/partner-api/orders/[orderId]/revise
 *
 * Creates a new templated song instance for a completed vendor order,
 * allowing the song to be regenerated without marking the order as failed.
 * Order must be in 'completed' status and have product_type = 'customer_templated_song'.
 *
 * On after() failure the order is rolled back to 'completed' (not 'failed'),
 * since the previous completed instance is still valid.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  templatedSongInstancesTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import { logger } from '@/lib/logger';

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

    if (order.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Order is not in completed state',
          details: `Current status: ${order.status}. Only 'completed' orders can be revised.`,
        },
        { status: 400 },
      );
    }

    if (order.product_type !== 'customer_templated_song') {
      return NextResponse.json(
        {
          error: 'Order is not for templated song',
          details: `Product type: ${order.product_type}. Only templated song orders can be revised.`,
        },
        { status: 400 },
      );
    }

    // Resolve template_id and recipient_name — fall back to latest instance if not on order row
    let templateId = order.template_id;
    let recipientName = order.recipient_name;

    if (!templateId || !recipientName) {
      const instances = await db
        .select({
          template_id: templatedSongInstancesTable.template_id,
          recipient_name: templatedSongInstancesTable.recipient_name,
        })
        .from(templatedSongInstancesTable)
        .where(eq(templatedSongInstancesTable.partner_api_order_id, order.id))
        .orderBy(desc(templatedSongInstancesTable.id))
        .limit(1);

      if (instances.length > 0) {
        templateId = templateId ?? instances[0].template_id;
        recipientName = recipientName ?? instances[0].recipient_name;
      }
    }

    if (!templateId || !recipientName) {
      return NextResponse.json(
        {
          error: 'Could not resolve template or recipient name for this order',
          details: 'No template_id or recipient_name found on order or its instances',
        },
        { status: 400 },
      );
    }

    // Optional body override — admin may select a different template
    let bodyTemplateId: number | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.templateId && typeof body.templateId === 'number') {
        bodyTemplateId = body.templateId;
      }
    } catch {
      // no body is fine
    }

    if (bodyTemplateId) {
      templateId = bodyTemplateId;
    }

    const vendors = await db
      .select({ slug: partnerApiVendorsTable.slug, sandbox: partnerApiVendorsTable.sandbox })
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, order.vendor_id))
      .limit(1);

    const vendor = vendors[0];

    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'song_generation_inprogress', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, order.id));

    ctxLogger.info('admin revise: starting new templated song instance', {
      orderId: order.id,
      templateId,
      vendorSlug: vendor?.slug,
    });

    const resolvedTemplateId = templateId;
    const resolvedRecipientName = recipientName;

    after(async () => {
      try {
        await generateTemplatedInstanceForIdentity({
          templateId: resolvedTemplateId,
          name: resolvedRecipientName,
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
        logger.error('admin revise: failed to generate new instance', {
          orderId: order.id,
          templateId: resolvedTemplateId,
          error: String(err),
        });
        // Roll back to 'completed' — the previous instance is still valid
        await db
          .update(partnerApiOrdersTable)
          .set({ status: 'completed', updated_at: new Date() })
          .where(eq(partnerApiOrdersTable.id, order.id));
      }
    });

    ctxLogger.info('admin revise: initiated', { orderId: order.id });
    return NextResponse.json({
      success: true,
      message: 'Revision initiated for order',
      orderId: order.id,
    });
  } catch (error) {
    ctxLogger.error('admin revise: handler error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revise order' },
      { status: 500 },
    );
  }
}

export const POST = withApiLogger('admin-partner-orders-revise', handler);
