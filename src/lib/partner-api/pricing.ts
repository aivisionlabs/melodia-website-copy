/**
 * Partner API Pricing
 *
 * Resolves the price for a given vendor × product_type.
 * Canonical product types are token-first customer flows.
 */

import { db } from '@/lib/db';
import { partnerApiProductPricesTable } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const PRODUCT_TYPES = [
  {
    value: 'customer_templated_song',
    label: 'Templated Song (Customer UI)',
    description: 'Customer browses templates on a co-branded page, picks one, and enters the recipient name. Suno generates after submission.',
  },
  {
    value: 'customer_custom_song',
    label: 'Custom Song (Customer UI)',
    description: 'Customer fills a story form on a co-branded page. LLM generates personalised lyrics, customer reviews and approves, then Suno generates the song.',
  },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]['value'];

export interface ResolvedPrice {
  price: string;
  currency: string;
}

/**
 * Resolve the price for an order.
 * Looks up the active price for (vendor_id, product_type).
 * Returns null if no price is configured for this vendor × product.
 */
export async function resolvePrice(
  vendorId: number,
  productType: string,
): Promise<ResolvedPrice | null> {
  const rows = await db
    .select({
      price: partnerApiProductPricesTable.price,
      currency: partnerApiProductPricesTable.currency,
    })
    .from(partnerApiProductPricesTable)
    .where(
      and(
        eq(partnerApiProductPricesTable.vendor_id, vendorId),
        eq(partnerApiProductPricesTable.product_type, productType),
        isNull(partnerApiProductPricesTable.product_id),
        eq(partnerApiProductPricesTable.active, true),
      ),
    )
    .limit(1);

  return rows.length > 0 ? { price: rows[0].price, currency: rows[0].currency } : null;
}
