import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiInvoicesTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  createPartnerInvoice,
  getInvoiceWithDetails,
} from '@/lib/partner-api/invoicing';
import { generateInvoicePdfBuffer } from '@/lib/partner-api/generate-invoice-pdf';
import { uploadToR2 } from '@/lib/storage/upload';
import type { InvoiceProductType } from '@/lib/partner-api/invoice-products';

export const runtime = 'nodejs';

async function getHandler(req: NextRequest, ctx: { logger: any }) {
  const { logger } = ctx;
  if (!(await requireAdmin(logger))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get('vendor_id');
  const productType = searchParams.get('product_type');
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20),
  );

  const conditions = [];
  if (vendorId) {
    const vid = Number.parseInt(vendorId, 10);
    if (!Number.isNaN(vid) && vid > 0) {
      conditions.push(eq(partnerApiInvoicesTable.vendor_id, vid));
    }
  }
  if (productType) {
    conditions.push(eq(partnerApiInvoicesTable.product_type, productType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(partnerApiInvoicesTable)
    .where(whereClause);

  const rows = await db
    .select({
      id: partnerApiInvoicesTable.id,
      vendor_id: partnerApiInvoicesTable.vendor_id,
      vendor_name: partnerApiVendorsTable.name,
      invoice_number: partnerApiInvoicesTable.invoice_number,
      product_type: partnerApiInvoicesTable.product_type,
      period_start: partnerApiInvoicesTable.period_start,
      period_end: partnerApiInvoicesTable.period_end,
      currency: partnerApiInvoicesTable.currency,
      pricing_model: partnerApiInvoicesTable.pricing_model,
      billable_quantity: partnerApiInvoicesTable.billable_quantity,
      subtotal: partnerApiInvoicesTable.subtotal,
      created_at: partnerApiInvoicesTable.created_at,
    })
    .from(partnerApiInvoicesTable)
    .innerJoin(
      partnerApiVendorsTable,
      eq(partnerApiInvoicesTable.vendor_id, partnerApiVendorsTable.id),
    )
    .where(whereClause)
    .orderBy(desc(partnerApiInvoicesTable.created_at))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  logger.info('Admin: partner invoices listed', { count: rows.length, vendorId, page });

  return NextResponse.json({
    success: true,
    invoices: rows.map((r) => ({
      ...r,
      period_start: r.period_start.toISOString(),
      period_end: r.period_end.toISOString(),
      created_at: r.created_at.toISOString(),
      subtotal: String(r.subtotal),
    })),
    total: countRow?.total ?? 0,
    page,
    pageSize,
  });
}

const createSchema = z.object({
  vendor_id: z.number().int().positive(),
  product_type: z.enum(['customer_templated_song', 'rj_show']),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  currency: z.string().min(3).max(10).default('INR'),
  pricing_defaults: z.unknown(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(z.unknown()).min(1),
});

async function postHandler(req: NextRequest, ctx: { logger: any }) {
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const period_start = new Date(parsed.data.period_start);
  const period_end = new Date(parsed.data.period_end);
  if (Number.isNaN(period_start.getTime()) || Number.isNaN(period_end.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  period_start.setHours(0, 0, 0, 0);
  period_end.setHours(23, 59, 59, 999);

  try {
    const { invoiceId, invoice_number } = await createPartnerInvoice(
      {
        vendor_id: parsed.data.vendor_id,
        product_type: parsed.data.product_type as InvoiceProductType,
        period_start,
        period_end,
        currency: parsed.data.currency,
        pricing_defaults: parsed.data.pricing_defaults,
        notes: parsed.data.notes ?? null,
        lines: parsed.data.lines,
      },
      null,
    );

    const detail = await getInvoiceWithDetails(invoiceId);
    if (!detail) {
      throw new Error('Invoice not found after create');
    }

    let pdf_storage_key: string | null = null;
    try {
      const pdfBuffer = await generateInvoicePdfBuffer(detail);
      const key = `partner-invoices/${parsed.data.vendor_id}/${invoice_number}.pdf`;
      await uploadToR2(pdfBuffer, key, 'application/pdf');
      pdf_storage_key = key;
      await db
        .update(partnerApiInvoicesTable)
        .set({ pdf_storage_key: key })
        .where(eq(partnerApiInvoicesTable.id, invoiceId));
    } catch (pdfErr) {
      logger.error('Admin: invoice PDF upload failed (invoice still created)', {
        invoiceId,
        error: String(pdfErr),
      });
    }

    logger.info('Admin: partner invoice created', {
      invoiceId,
      invoice_number,
      vendorId: parsed.data.vendor_id,
      productType: parsed.data.product_type,
      lineCount: parsed.data.lines.length,
      pdfUploaded: Boolean(pdf_storage_key),
    });

    const refreshed = await getInvoiceWithDetails(invoiceId);

    return NextResponse.json({
      success: true,
      invoice: refreshed
        ? {
            id: refreshed.invoice.id,
            invoice_number: refreshed.invoice.invoice_number,
            vendor_name: refreshed.vendor_name,
            product_type: refreshed.invoice.product_type,
            subtotal: String(refreshed.invoice.subtotal),
            billable_quantity: refreshed.invoice.billable_quantity,
            currency: refreshed.invoice.currency,
            pdf_url: `/api/admin/partner-api/invoices/${invoiceId}/pdf`,
          }
        : { id: invoiceId, invoice_number },
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : 'Failed to create invoice';
    logger.error('Admin: partner invoice create failed', { error: message, status });
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withApiLogger('admin-partner-api-invoices-list', getHandler);
export const POST = withApiLogger('admin-partner-api-invoices-create', postHandler);
