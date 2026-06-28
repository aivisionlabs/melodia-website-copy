/**
 * Admin – Partner API Simulation
 *
 * POST /api/admin/partner-api/simulate
 *
 * Simulates Suno song completion or failure for a given order.
 * Only works for sandbox vendors or orders with a demo task ID.
 * Internally fires the same logic as the real Suno webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  templatedSongInstancesTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { isDemoTaskId, DEMO_SONG_VARIANTS } from '@/lib/demo-mode';
import { notifyPartnerOrderFailed } from '@/lib/vendor-order/notification-helpers';

export const runtime = 'nodejs';

const simulateSchema = z.object({
  order_id: z.number().int().positive(),
  outcome: z.enum(['complete', 'fail']).default('complete'),
});

async function requireAdmin(req: NextRequest, logger: any) {
  // 1. Cookie-based auth (browser / admin portal)
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value === 'true') return true;

  // 2. Secret header auth for scripts / CI (PARTNER_API_SIMULATE_SECRET env var)
  const simulateSecret = process.env.PARTNER_API_SIMULATE_SECRET;
  if (simulateSecret && req.headers.get('x-simulate-secret') === simulateSecret) return true;

  logger.warn('Unauthorized simulate access');
  return false;
}

async function postHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;

  try {
    if (!(await requireAdmin(req, logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { order_id, outcome } = parsed.data;

    // Load order
    const orders = await db
      .select()
      .from(partnerApiOrdersTable)
      .where(eq(partnerApiOrdersTable.id, order_id))
      .limit(1);

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Load vendor
    const vendors = await db
      .select()
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, order.vendor_id))
      .limit(1);

    if (vendors.length === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const vendor = vendors[0];

    // Only allow simulation for sandbox vendors or demo task IDs
    if (!vendor.sandbox) {
      return NextResponse.json(
        { error: 'Simulation is only allowed for sandbox vendors' },
        { status: 400 },
      );
    }

    if (order.status === 'completed' || order.status === 'failed') {
      return NextResponse.json(
        { error: `Order is already in terminal state: ${order.status}` },
        { status: 400 },
      );
    }

    // Load instance
    const instances = await db
      .select()
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.partner_api_order_id, order_id))
      .limit(1);

    if (instances.length === 0) {
      return NextResponse.json({ error: 'Order has no linked song instance' }, { status: 400 });
    }

    const instance = instances[0];

    if (!isDemoTaskId(instance.suno_task_id)) {
      return NextResponse.json(
        { error: 'Instance does not have a demo task ID — cannot simulate' },
        { status: 400 },
      );
    }

    if (outcome === 'fail') {
      // Mark instance failed
      await db
        .update(templatedSongInstancesTable)
        .set({ status: 'failed', metadata: { ...(instance.metadata as object ?? {}), simulated: true, error: 'Simulated failure' } })
        .where(eq(templatedSongInstancesTable.id, instance.id));

      // Mark order failed
      await db
        .update(partnerApiOrdersTable)
        .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
        .where(eq(partnerApiOrdersTable.id, order.id));

      notifyPartnerOrderFailed(order, vendor, 'Simulated failure', logger, {
        failedStep: 'sandbox_simulation',
      });

      logger.info('Simulated order failure', { orderId: order.id, vendorId: vendor.id });

      return NextResponse.json({
        success: true,
        simulated: 'fail',
        order_id: order.id,
        message: 'Order marked as failed.',
      });
    }

    // outcome === 'complete'
    const title = instance.song_title ?? 'Generated Song';
    const demoVariants = DEMO_SONG_VARIANTS.map((v) => ({
      ...v,
      title,
      variantStatus: 'DOWNLOAD_READY' as const,
      createTime: new Date().toISOString(),
    }));

    // Mark instance completed with demo variants
    await db
      .update(templatedSongInstancesTable)
      .set({
        status: 'completed',
        song_variants: demoVariants,
        metadata: {
          ...(instance.metadata as object ?? {}),
          simulated: true,
          completedAt: new Date().toISOString(),
        },
      })
      .where(eq(templatedSongInstancesTable.id, instance.id));

    // Mark order completed
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'completed', completed_at: new Date(), updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, order.id));

    logger.info('Simulated order completion', {
      orderId: order.id,
      vendorId: vendor.id,
      instanceSlug: instance.slug,
    });

    return NextResponse.json({
      success: true,
      simulated: 'complete',
      order_id: order.id,
      instance_slug: instance.slug,
      customer_link: order.order_token
        ? `https://melodia-songs.com/vendor/${vendor.slug}/order/${order.order_token}`
        : null,
      message: 'Order marked as completed.',
    });
  } catch (error) {
    logger.error('Simulate endpoint error', error as any);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const POST = withApiLogger('admin-partner-api-simulate', postHandler);
