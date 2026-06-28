/**
 * Vendor Template Song Generate API
 * POST /api/vendor-order/[orderToken]/generate-template
 *
 * Customer selects a template and enters a name on the co-branded page.
 * Creates a templated_song_instance linked to the partner order, then
 * triggers Suno generation asynchronously.
 *
 * Only valid for orders with product_type = 'customer_templated_song' in 'pending' status.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnerApiOrdersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
import {
  checkGenerateTemplateAllowed,
  validateGenerateTemplateBody,
} from '@/lib/vendor-order/generate-template-guards';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import { notifyPartnerOrderFailedByOrderId } from '@/lib/vendor-order/notification-helpers';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ orderToken: string }> },
) {
  const { orderToken } = await params;

  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order, vendor } = resolved;

  const guard = checkGenerateTemplateAllowed(order);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.httpStatus });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const bodyResult = validateGenerateTemplateBody(raw as any);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.httpStatus });
  }

  const { templateId, recipientName } = bodyResult;

  // Transition order to in-progress before firing async work
  await db
    .update(partnerApiOrdersTable)
    .set({ status: 'song_generation_inprogress', updated_at: new Date() })
    .where(eq(partnerApiOrdersTable.id, order.id));

  const sandbox = vendor.sandbox ?? false;
  logger.info('vendor generate-template: scheduling Suno generation', {
    orderId: order.id,
    templateId,
    sandbox,
  });
  after(async () => {
    try {
      await generateTemplatedInstanceForIdentity({
        templateId,
        name: recipientName,
        partnerApiOrderId: order.id,
        sandbox,
        logger: {
          info: (msg, data) =>
            logger.info(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
          warn: (msg, data) =>
            logger.warn(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
          error: (msg, data) =>
            logger.error(msg, { ...data, vendorSlug: vendor.slug, orderId: order.id }),
        },
      });
    } catch (err) {
      logger.error('vendor generate-template: failed to generate instance', {
        orderId: order.id,
        templateId,
        error: String(err),
      });
      await db
        .update(partnerApiOrdersTable)
        .set({ status: 'failed', updated_at: new Date() })
        .where(eq(partnerApiOrdersTable.id, order.id));

      void notifyPartnerOrderFailedByOrderId(
        order.id,
        err instanceof Error ? err.message : String(err),
        logger,
        { failedStep: 'template_generation' },
      );
    }
  });

  return NextResponse.json({ success: true });
}

export const POST = withRateLimit('vendor.order.generate_template', handler);
