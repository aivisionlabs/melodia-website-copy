/**
 * Admin – TryOWBot WhatsApp template test (no order / no song)
 *
 * POST /api/admin/partner-api/test-whatsapp
 *
 * Gated by `TRYOWBOT_DEMO_TEST_SEND=true` or `DEMO_MODE=true`. Uses the same
 * admin auth as partner simulate. Sends the vendor-order template with sample
 * or request-supplied parameters — does not touch `partner_api_orders` idempotency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { getBaseUrlSync } from '@/lib/utils/url';
import { buildVendorOrderTryowbotTemplateParameters } from '@/lib/vendor-order/notifications';
import {
  isTryowbotConfigured,
  isTryowbotDemoTestSendEnabled,
  normalizeWhatsAppToDigits,
  sendTryowbotTemplateMessage,
} from '@/lib/whatsapp/tryowbot';

export const runtime = 'nodejs';

const testBodySchema = z.object({
  /** E.164-style or local number; normalized to digits only. */
  to: z.string().min(1),
  /** TryOWBot API campaign; defaults from env (see handler). */
  apiname: z.string().min(1).optional(),
  vendor_name: z.string().min(1).optional(),
  customer_name: z.string().min(1).optional(),
  order_link: z.string().min(1).optional(),
});

async function requireAdmin(req: NextRequest, logger: { warn: (msg: string, meta?: unknown) => void }): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value === 'true') return true;

  const simulateSecret = process.env.PARTNER_API_SIMULATE_SECRET;
  if (simulateSecret && req.headers.get('x-simulate-secret') === simulateSecret) return true;

  logger.warn('Unauthorized test-whatsapp access');
  return false;
}

function resolveDemoTestApiname(requestApiname?: string): string | null {
  const fromBody = requestApiname?.trim();
  if (fromBody) return fromBody;
  return (
    process.env.TRYOWBOT_DEMO_TEST_APINAME?.trim() ||
    process.env.TRYOWBOT_ORDER_CREATED_APINAME?.trim() ||
    process.env.TRYOWBOT_ORDER_COMPLETED_APINAME?.trim() ||
    null
  );
}

async function postHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;

  try {
    if (!isTryowbotDemoTestSendEnabled()) {
      logger.warn('TryOWBot demo test send blocked: enable TRYOWBOT_DEMO_TEST_SEND or DEMO_MODE');
      return NextResponse.json(
        { error: 'Demo test WhatsApp is disabled. Set TRYOWBOT_DEMO_TEST_SEND=true or DEMO_MODE=true.' },
        { status: 403 },
      );
    }

    if (!(await requireAdmin(req, logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isTryowbotConfigured()) {
      return NextResponse.json({ error: 'TryOWBot credentials are not configured' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = testBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { to, apiname: apinameFromBody, vendor_name, customer_name, order_link } = parsed.data;
    const mobile = normalizeWhatsAppToDigits(to);
    if (!mobile) {
      return NextResponse.json(
        { error: 'Invalid phone: need 10–15 digits after normalization' },
        { status: 400 },
      );
    }

    const apiname = resolveDemoTestApiname(apinameFromBody);
    if (!apiname) {
      return NextResponse.json(
        {
          error:
            'Missing apiname: set in JSON body, or set TRYOWBOT_DEMO_TEST_APINAME, TRYOWBOT_ORDER_CREATED_APINAME, or TRYOWBOT_ORDER_COMPLETED_APINAME',
        },
        { status: 400 },
      );
    }

    const base = getBaseUrlSync().replace(/\/$/, '');
    const parameters = buildVendorOrderTryowbotTemplateParameters({
      vendorName: vendor_name?.trim() || 'Demo Vendor',
      customerName: customer_name?.trim() || 'Test Customer',
      orderLink: order_link?.trim() || `${base}/`,
    });

    logger.info('TryOWBot demo test WhatsApp sending', {
      apiname,
      toSuffix: mobile.slice(-4),
    });

    const result = await sendTryowbotTemplateMessage({
      to: mobile,
      apiname,
      parameters,
    });

    if (!result.ok) {
      logger.error('TryOWBot demo test WhatsApp failed', { error: result.error });
      return NextResponse.json({ ok: false, error: result.error ?? 'Send failed' }, { status: 502 });
    }

    logger.info('TryOWBot demo test WhatsApp sent', {
      toSuffix: mobile.slice(-4),
      tryowbotResponse: result.responseBodyPreview,
    });
    return NextResponse.json({
      ok: true,
      message: 'Template message sent (demo test, no order updated).',
      tryowbotResponse: result.responseBodyPreview,
    });
  } catch (error) {
    logger.error('test-whatsapp endpoint error', error as Error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const POST = withApiLogger('admin-partner-api-test-whatsapp', postHandler);
