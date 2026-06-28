/**
 * Partner API invoice product registry — pricing models per product_type.
 */

import { z } from 'zod';

export const INVOICE_PRODUCT_TYPES = [
  {
    value: 'customer_templated_song' as const,
    label: 'Templated Song (Customer UI)',
    pricing_model: 'flat_unit' as const,
  },
] as const;

export type InvoiceProductType = (typeof INVOICE_PRODUCT_TYPES)[number]['value'];
export type InvoicePricingModel = 'flat_unit';

export const INVOICEABLE_TEMPLATED_SONG_ORDER_STATUSES = [
  'completed',
  'song_generation_inprogress',
] as const;

export type InvoiceableTemplatedSongOrderStatus =
  (typeof INVOICEABLE_TEMPLATED_SONG_ORDER_STATUSES)[number];

export function isInvoiceableTemplatedSongOrderStatus(status: string): boolean {
  return (INVOICEABLE_TEMPLATED_SONG_ORDER_STATUSES as readonly string[]).includes(
    status,
  );
}

export function getInvoiceProductRegistration(productType: string) {
  return INVOICE_PRODUCT_TYPES.find((p) => p.value === productType) ?? null;
}

export const flatUnitDefaultsSchema = z.object({
  unit_price: z.coerce.number().nonnegative(),
});

export const flatUnitLineInputSchema = z.object({
  order_id: z.number().int().positive(),
});

export type FlatUnitBreakdown = {
  model: 'flat_unit';
  unit_price: string;
  quantity: number;
};

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

export function parseMoney(value: string | number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  return Math.round(n * 100) / 100;
}

export function computeFlatUnitLine(unitPrice: number): {
  line_amount: number;
  breakdown: FlatUnitBreakdown;
} {
  const line_amount = parseMoney(unitPrice);
  return {
    line_amount,
    breakdown: {
      model: 'flat_unit',
      unit_price: formatMoney(line_amount),
      quantity: 1,
    },
  };
}
