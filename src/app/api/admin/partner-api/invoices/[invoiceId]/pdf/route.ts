import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partnerApiInvoicesTable } from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getInvoiceWithDetails } from '@/lib/partner-api/invoicing';
import { generateInvoicePdfBuffer } from '@/lib/partner-api/generate-invoice-pdf';

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

  try {
    const buffer = await generateInvoicePdfBuffer(detail);
    logger.info('Admin: partner invoice PDF generated', {
      invoiceId,
      invoice_number: detail.invoice.invoice_number,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${detail.invoice.invoice_number}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    logger.error('Admin: partner invoice PDF failed', {
      invoiceId,
      error: String(e),
    });
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

export const GET = withApiLogger('admin-partner-api-invoice-pdf', getHandler);
