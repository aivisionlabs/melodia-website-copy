import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partnerApiOrdersTable } from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { requireAdmin } from '@/lib/admin/require-admin';

export const runtime = 'nodejs';

const bodySchema = z.object({
  order_ids: z.array(z.number().int().positive()).min(1),
  is_test_order: z.boolean(),
  vendor_id: z.number().int().positive().optional(),
});

async function patchHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const orders = await db
    .select({ id: partnerApiOrdersTable.id, vendor_id: partnerApiOrdersTable.vendor_id })
    .from(partnerApiOrdersTable)
    .where(inArray(partnerApiOrdersTable.id, parsed.data.order_ids));

  if (orders.length !== parsed.data.order_ids.length) {
    return NextResponse.json({ error: 'One or more orders not found' }, { status: 404 });
  }

  if (parsed.data.vendor_id != null) {
    const wrong = orders.some((o) => o.vendor_id !== parsed.data.vendor_id);
    if (wrong) {
      return NextResponse.json({ error: 'Orders must belong to the specified vendor' }, { status: 400 });
    }
  }

  await db
    .update(partnerApiOrdersTable)
    .set({ is_test_order: parsed.data.is_test_order, updated_at: new Date() })
    .where(inArray(partnerApiOrdersTable.id, parsed.data.order_ids));

  logger.info('Admin: partner orders test flags updated', {
    orderIds: parsed.data.order_ids,
    is_test_order: parsed.data.is_test_order,
    count: parsed.data.order_ids.length,
  });

  return NextResponse.json({
    success: true,
    updated_count: parsed.data.order_ids.length,
    is_test_order: parsed.data.is_test_order,
  });
}

export const PATCH = withApiLogger('admin-partner-api-orders-test-flags', patchHandler);
