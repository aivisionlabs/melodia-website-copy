import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getInvoiceWithDetails } from '@/lib/partner-api/invoicing';

export const runtime = 'nodejs';

async function getHandler(
  _req: NextRequest,
  ctx: { logger: any; params: Promise<{ invoiceId: string }> },
) {
  const { logger, params } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId: invoiceIdParam } = await params;
  const invoiceId = Number.parseInt(invoiceIdParam, 10);
  if (Number.isNaN(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: 'Invalid invoice id' }, { status: 400 });
  }

  const detail = await getInvoiceWithDetails(invoiceId);
  if (!detail) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  logger.info('Admin: partner invoice detail', { invoiceId });

  return NextResponse.json({
    success: true,
    invoice: {
      ...detail.invoice,
      period_start: detail.invoice.period_start.toISOString(),
      period_end: detail.invoice.period_end.toISOString(),
      created_at: detail.invoice.created_at.toISOString(),
      subtotal: String(detail.invoice.subtotal),
    },
    vendor_name: detail.vendor_name,
    vendor_slug: detail.vendor_slug,
    line_items: detail.line_items.map((line) => ({
      ...line,
      line_amount: String(line.line_amount),
      completed_at: line.completed_at?.toISOString() ?? null,
      created_at: line.created_at.toISOString(),
    })),
    pdf_url: `/api/admin/partner-api/invoices/${invoiceId}/pdf`,
  });
}

export const GET = withApiLogger('admin-partner-api-invoice-detail', getHandler);
