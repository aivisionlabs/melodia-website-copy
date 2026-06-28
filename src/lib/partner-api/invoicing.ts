/**
 * Partner API invoicing — candidates, validation, invoice creation.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiInvoiceLineItemsTable,
  partnerApiInvoicesTable,
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  type SelectPartnerApiOrder,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import {
  computeFlatUnitLine,
  flatUnitDefaultsSchema,
  flatUnitLineInputSchema,
  formatMoney,
  getInvoiceProductRegistration,
  parseMoney,
  isInvoiceableTemplatedSongOrderStatus,
  type InvoiceProductType,
} from '@/lib/partner-api/invoice-products';
import { logger } from '@/lib/logger';

export type CandidateBucket =
  | 'billable'
  | 'test'
  | 'already_invoiced'
  | 'excluded';

export type InvoiceCandidateRow = {
  order_id: number;
  external_order_id: string;
  recipient_name: string | null;
  status: string;
  completed_at: string | null;
  amount_charged: string | null;
  currency: string | null;
  is_test_order: boolean;
  bucket: CandidateBucket;
  exclude_reason: string | null;
};

function orderCompletedAt(order: SelectPartnerApiOrder): Date {
  return order.completed_at ?? order.updated_at;
}

function isInPeriod(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export async function listInvoicedOrderIds(orderIds: number[]): Promise<Set<number>> {
  if (orderIds.length === 0) return new Set();
  const rows = await db
    .select({ order_id: partnerApiInvoiceLineItemsTable.order_id })
    .from(partnerApiInvoiceLineItemsTable)
    .where(inArray(partnerApiInvoiceLineItemsTable.order_id, orderIds));
  return new Set(rows.map((r) => r.order_id));
}

export async function fetchInvoiceCandidates(params: {
  vendor_id: number;
  product_type: InvoiceProductType;
  period_start: Date;
  period_end: Date;
}): Promise<{
  vendor: SelectPartnerApiVendor;
  billable: InvoiceCandidateRow[];
  test: InvoiceCandidateRow[];
  already_invoiced: InvoiceCandidateRow[];
  excluded: InvoiceCandidateRow[];
}> {
  const registration = getInvoiceProductRegistration(params.product_type);
  if (!registration) {
    throw Object.assign(new Error('Unsupported product_type for invoicing'), { status: 400 });
  }

  const vendors = await db
    .select()
    .from(partnerApiVendorsTable)
    .where(eq(partnerApiVendorsTable.id, params.vendor_id))
    .limit(1);
  if (vendors.length === 0) {
    throw Object.assign(new Error('Vendor not found'), { status: 404 });
  }
  const vendor = vendors[0];

  const orders = await db
    .select()
    .from(partnerApiOrdersTable)
    .where(
      and(
        eq(partnerApiOrdersTable.vendor_id, params.vendor_id),
eq(partnerApiOrdersTable.product_type, params.product_type),
      ),
    )
    .orderBy(partnerApiOrdersTable.created_at);

  const orderIds = orders.map((o) => o.id);
  const invoicedSet = await listInvoicedOrderIds(orderIds);

  const billable: InvoiceCandidateRow[] = [];
  const test: InvoiceCandidateRow[] = [];
  const already_invoiced: InvoiceCandidateRow[] = [];
  const excluded: InvoiceCandidateRow[] = [];

  for (const order of orders) {
    const completedAt = orderCompletedAt(order);
    if (!order.completed_at) {
      logger.warn('Invoice candidate using updated_at as completed_at fallback', {
        orderId: order.id,
      });
    }

    const base: Omit<InvoiceCandidateRow, 'bucket' | 'exclude_reason'> = {
      order_id: order.id,
      external_order_id: order.external_order_id,
      recipient_name: order.recipient_name,
      status: order.status,
      completed_at: completedAt.toISOString(),
      amount_charged: order.amount_charged,
      currency: order.currency,
      is_test_order: order.is_test_order,
    };

    const push = (bucket: CandidateBucket, exclude_reason: string | null) => {
      const row: InvoiceCandidateRow = { ...base, bucket, exclude_reason };
      if (bucket === 'billable') billable.push(row);
      else if (bucket === 'test') test.push(row);
      else if (bucket === 'already_invoiced') already_invoiced.push(row);
      else excluded.push(row);
    };

    if (vendor.sandbox) {
      push('excluded', 'sandbox_vendor');
      continue;
    }
    if (invoicedSet.has(order.id)) {
      push('already_invoiced', 'already_invoiced');
      continue;
    }
    if (order.is_test_order) {
      push('test', 'test_order');
      continue;
    }
    if (!isInPeriod(completedAt, params.period_start, params.period_end)) {
      push('excluded', 'outside_period');
      continue;
    }

    if (params.product_type === 'customer_templated_song') {
      if (!isInvoiceableTemplatedSongOrderStatus(order.status)) {
        push('excluded', 'order_not_completed');
        continue;
      }
      push('billable', null);
      continue;
    }
  }

  return { vendor, billable, test, already_invoiced, excluded };
}

/** MLD-{YYYY}-{MM}-{VENDOR_SLUG}-{NNNNN} — sequence resets per vendor per calendar month (period_start). */
export function partnerInvoiceNumberPrefix(vendorSlug: string, periodStart: Date): string {
  const year = periodStart.getFullYear();
  const month = String(periodStart.getMonth() + 1).padStart(2, '0');
  const slugPart = vendorSlug.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return `MLD-${year}-${month}-${slugPart}-`;
}

export function nextPartnerInvoiceNumber(
  existingInvoiceNumbers: string[],
  prefix: string,
): string {
  let maxNum = 0;
  for (const invoice_number of existingInvoiceNumbers) {
    if (!invoice_number.startsWith(prefix)) continue;
    const suffix = invoice_number.slice(prefix.length);
    const n = Number.parseInt(suffix, 10);
    if (Number.isFinite(n) && n > maxNum) maxNum = n;
  }
  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export async function generateInvoiceNumber(
  vendorId: number,
  periodStart: Date,
): Promise<string> {
  const vendors = await db
    .select({ slug: partnerApiVendorsTable.slug })
    .from(partnerApiVendorsTable)
    .where(eq(partnerApiVendorsTable.id, vendorId))
    .limit(1);

  const vendor = vendors[0];
  if (!vendor) {
    throw Object.assign(new Error('Vendor not found'), { status: 404 });
  }

  const prefix = partnerInvoiceNumberPrefix(vendor.slug, periodStart);
  const rows = await db
    .select({ invoice_number: partnerApiInvoicesTable.invoice_number })
    .from(partnerApiInvoicesTable)
    .where(
      and(
        eq(partnerApiInvoicesTable.vendor_id, vendorId),
        sql`${partnerApiInvoicesTable.invoice_number} like ${prefix + '%'}`,
      ),
    );

  return nextPartnerInvoiceNumber(
    rows.map((r) => r.invoice_number),
    prefix,
  );
}

export type CreateInvoiceInput = {
  vendor_id: number;
  product_type: InvoiceProductType;
  period_start: Date;
  period_end: Date;
  currency: string;
  pricing_defaults: unknown;
  notes?: string | null;
  lines: unknown[];
};

export type ComputedInvoiceLine = {
  order_id: number;
  line_amount: string;
  pricing_breakdown: Record<string, unknown>;
  external_order_id: string;
  recipient_name: string | null;
  completed_at: Date | null;
};

export async function computeInvoiceLines(
  input: CreateInvoiceInput,
): Promise<{
  registration: NonNullable<ReturnType<typeof getInvoiceProductRegistration>>;
  pricing_defaults: Record<string, unknown>;
  lines: ComputedInvoiceLine[];
  subtotal: string;
}> {
  const registration = getInvoiceProductRegistration(input.product_type);
  if (!registration) {
    throw Object.assign(new Error('Unsupported product_type'), { status: 400 });
  }

  const orderIds = (input.lines as { order_id: number }[]).map((l) => l.order_id);
  if (orderIds.length === 0) {
    throw Object.assign(new Error('At least one line is required'), { status: 400 });
  }

  const orders = await db
    .select()
    .from(partnerApiOrdersTable)
    .where(inArray(partnerApiOrdersTable.id, orderIds));

  if (orders.length !== orderIds.length) {
    throw Object.assign(new Error('One or more orders not found'), { status: 400 });
  }

  const invoicedSet = await listInvoicedOrderIds(orderIds);
  const vendorRows = await db
    .select()
    .from(partnerApiVendorsTable)
    .where(eq(partnerApiVendorsTable.id, input.vendor_id))
    .limit(1);
  const vendor = vendorRows[0];
  if (!vendor) {
    throw Object.assign(new Error('Vendor not found'), { status: 404 });
  }

  const computed: ComputedInvoiceLine[] = [];
  let subtotalNum = 0;

  if (registration.pricing_model === 'flat_unit') {
    const defaults = flatUnitDefaultsSchema.parse(input.pricing_defaults);
    const unitPrice = parseMoney(defaults.unit_price);

    for (const raw of input.lines) {
      const lineIn = flatUnitLineInputSchema.parse(raw);
      const order = orders.find((o) => o.id === lineIn.order_id);
      if (!order) continue;
      validateOrderForLine(order, vendor, input, invoicedSet, registration.value);

      const { line_amount, breakdown } = computeFlatUnitLine(unitPrice);
      subtotalNum += line_amount;
      computed.push({
        order_id: order.id,
        line_amount: formatMoney(line_amount),
        pricing_breakdown: breakdown as unknown as Record<string, unknown>,
        external_order_id: order.external_order_id,
        recipient_name: order.recipient_name,
        completed_at: order.completed_at,
      });
    }

    return {
      registration,
      pricing_defaults: { unit_price: formatMoney(unitPrice) },
      lines: computed,
      subtotal: formatMoney(subtotalNum),
    };
  }

  throw Object.assign(new Error(`Unsupported pricing model: ${registration.pricing_model}`), {
    status: 400,
  });
}

function validateOrderForLine(
  order: SelectPartnerApiOrder,
  vendor: SelectPartnerApiVendor,
  input: CreateInvoiceInput,
  invoicedSet: Set<number>,
  productType: string,
) {
  if (order.vendor_id !== input.vendor_id) {
    throw Object.assign(new Error(`Order ${order.id} does not belong to vendor`), { status: 400 });
  }
  if (order.product_type !== productType) {
    throw Object.assign(new Error(`Order ${order.id} has wrong product_type`), { status: 400 });
  }
  if (vendor.sandbox) {
    throw Object.assign(new Error('Cannot invoice sandbox vendor'), { status: 400 });
  }
  if (order.is_test_order) {
    throw Object.assign(new Error(`Order ${order.id} is a test order`), { status: 400 });
  }
  if (invoicedSet.has(order.id)) {
    throw Object.assign(new Error(`Order ${order.id} is already invoiced`), { status: 400 });
  }
  if (productType === 'customer_templated_song') {
    if (!isInvoiceableTemplatedSongOrderStatus(order.status)) {
      throw Object.assign(
        new Error(
          `Order ${order.id} must be completed or song_generation_inprogress to invoice`,
        ),
        { status: 400 },
      );
    }
  } else if (order.status !== 'completed') {
    throw Object.assign(new Error(`Order ${order.id} is not completed`), { status: 400 });
  }
  const completedAt = orderCompletedAt(order);
  if (!isInPeriod(completedAt, input.period_start, input.period_end)) {
    throw Object.assign(new Error(`Order ${order.id} is outside billing period`), { status: 400 });
  }
}

export async function createPartnerInvoice(
  input: CreateInvoiceInput,
  pdfStorageKey: string | null,
): Promise<{ invoiceId: number; invoice_number: string }> {
  const { registration, pricing_defaults, lines, subtotal } = await computeInvoiceLines(input);

  const invoice_number = await generateInvoiceNumber(input.vendor_id, input.period_start);

  return await db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(partnerApiInvoicesTable)
      .values({
        vendor_id: input.vendor_id,
        invoice_number,
        product_type: input.product_type,
        period_start: input.period_start,
        period_end: input.period_end,
        currency: input.currency,
        pricing_model: registration.pricing_model,
        pricing_defaults,
        billable_quantity: lines.length,
        subtotal,
        notes: input.notes ?? null,
        status: 'issued',
        pdf_storage_key: pdfStorageKey,
      })
      .returning({ id: partnerApiInvoicesTable.id, invoice_number: partnerApiInvoicesTable.invoice_number });

    if (!invoice) {
      throw new Error('Failed to create invoice');
    }

    await tx.insert(partnerApiInvoiceLineItemsTable).values(
      lines.map((line) => ({
        invoice_id: invoice.id,
        order_id: line.order_id,
        line_amount: line.line_amount,
        pricing_breakdown: line.pricing_breakdown,
        external_order_id: line.external_order_id,
        recipient_name: line.recipient_name,
        completed_at: line.completed_at,
      })),
    );

    return { invoiceId: invoice.id, invoice_number: invoice.invoice_number };
  });
}

export async function getInvoiceWithDetails(invoiceId: number) {
  const invoices = await db
    .select({
      invoice: partnerApiInvoicesTable,
      vendor_name: partnerApiVendorsTable.name,
      vendor_slug: partnerApiVendorsTable.slug,
      invoice_legal_entity_name: partnerApiVendorsTable.invoice_legal_entity_name,
      invoice_address: partnerApiVendorsTable.invoice_address,
      invoice_gst_number: partnerApiVendorsTable.invoice_gst_number,
      invoice_mobile: partnerApiVendorsTable.invoice_mobile,
    })
    .from(partnerApiInvoicesTable)
    .innerJoin(
      partnerApiVendorsTable,
      eq(partnerApiInvoicesTable.vendor_id, partnerApiVendorsTable.id),
    )
    .where(eq(partnerApiInvoicesTable.id, invoiceId))
    .limit(1);

  if (invoices.length === 0) return null;

  const lineItems = await db
    .select()
    .from(partnerApiInvoiceLineItemsTable)
    .where(eq(partnerApiInvoiceLineItemsTable.invoice_id, invoiceId))
    .orderBy(partnerApiInvoiceLineItemsTable.id);

  return { ...invoices[0], line_items: lineItems };
}
