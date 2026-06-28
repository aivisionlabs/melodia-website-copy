import fs from 'fs';
import path from 'path';

const MELODIA_INVOICE_LOGO_PATH = path.join(
  process.cwd(),
  'public/images/melodia-logo-transparent.png',
);

let cachedLogoDataUri: string | null = null;

/** Same asset as site HeaderLogo — embedded in PDF as data URI. */
export function getMelodiaInvoiceLogoSrc(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const buffer = fs.readFileSync(MELODIA_INVOICE_LOGO_PATH);
  cachedLogoDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
  return cachedLogoDataUri;
}

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import {
  PartnerInvoicePdfDocument,
  type InvoicePdfData,
} from '@/lib/partner-api/invoice-pdf-document';
import { INVOICE_PRODUCT_TYPES } from '@/lib/partner-api/invoice-products';
import type { getInvoiceWithDetails } from '@/lib/partner-api/invoicing';

type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceWithDetails>>>;

export function buildInvoicePdfData(detail: InvoiceDetail): InvoicePdfData {
  const productLabel =
    INVOICE_PRODUCT_TYPES.find((p) => p.value === detail.invoice.product_type)?.label ??
    detail.invoice.product_type;

  const defaults = detail.invoice.pricing_defaults as Record<string, unknown>;

  const invoiceDate = detail.invoice.created_at;
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 15);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    logo_src: getMelodiaInvoiceLogoSrc(),
    invoice_number: detail.invoice.invoice_number,
    invoice_date: formatDate(invoiceDate),
    due_date: formatDate(dueDate),
    vendor_name: detail.vendor_name,
    to_legal_entity_name: detail.invoice_legal_entity_name,
    to_address: detail.invoice_address,
    to_gst_number: detail.invoice_gst_number,
    to_mobile: detail.invoice_mobile ?? null,
    product_type_label: productLabel,
    period_start: detail.invoice.period_start.toISOString(),
    period_end: detail.invoice.period_end.toISOString(),
    currency: detail.invoice.currency,
    subtotal: String(detail.invoice.subtotal),
    billable_quantity: detail.invoice.billable_quantity,
    notes: detail.invoice.notes,
    pricing_model: detail.invoice.pricing_model as 'flat_unit',
    unit_price:
      detail.invoice.pricing_model === 'flat_unit'
        ? String((defaults as { unit_price?: string }).unit_price ?? '')
        : undefined,
    line_items: detail.line_items.map((line) => ({
      external_order_id: line.external_order_id,
      recipient_name: line.recipient_name,
      completed_at: line.completed_at?.toISOString() ?? null,
      line_amount: String(line.line_amount),
      pricing_breakdown: line.pricing_breakdown as InvoicePdfData['line_items'][0]['pricing_breakdown'],
    })),
  };
}

export async function generateInvoicePdfBuffer(detail: InvoiceDetail): Promise<Buffer> {
  const data = buildInvoicePdfData(detail);
  const element = React.createElement(PartnerInvoicePdfDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(element as any);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
