import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { requireAdmin } from '@/lib/admin/require-admin';
import { fetchInvoiceCandidates } from '@/lib/partner-api/invoicing';
import { INVOICE_PRODUCT_TYPES, type InvoiceProductType } from '@/lib/partner-api/invoice-products';

export const runtime = 'nodejs';

const querySchema = z.object({
  vendor_id: z.coerce.number().int().positive(),
  product_type: z.enum(['customer_templated_song', 'rj_show']),
  from: z.string().min(1),
  to: z.string().min(1),
});

async function getHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    vendor_id: searchParams.get('vendor_id'),
    product_type: searchParams.get('product_type'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const period_start = new Date(parsed.data.from);
  const period_end = new Date(parsed.data.to);
  if (Number.isNaN(period_start.getTime()) || Number.isNaN(period_end.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  period_start.setHours(0, 0, 0, 0);
  period_end.setHours(23, 59, 59, 999);

  try {
    const result = await fetchInvoiceCandidates({
      vendor_id: parsed.data.vendor_id,
      product_type: parsed.data.product_type as InvoiceProductType,
      period_start,
      period_end,
    });

    logger.info('Admin: invoice candidates listed', {
      vendorId: parsed.data.vendor_id,
      productType: parsed.data.product_type,
      billable: result.billable.length,
      test: result.test.length,
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: result.vendor.id,
        name: result.vendor.name,
        slug: result.vendor.slug,
        sandbox: result.vendor.sandbox,
      },
      product_types: INVOICE_PRODUCT_TYPES,
      billable: result.billable,
      test: result.test,
      already_invoiced: result.already_invoiced,
      excluded: result.excluded,
      counts: {
        billable: result.billable.length,
        test: result.test.length,
        already_invoiced: result.already_invoiced.length,
        excluded: result.excluded.length,
      },
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : 'Failed to list candidates';
    logger.error('Admin: invoice candidates failed', { error: message, status });
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withApiLogger('admin-partner-api-invoice-candidates', getHandler);
