/**
 * Vendor Order Resolver
 *
 * Shared helper to resolve a vendor + order by orderToken.
 * Used by all /api/vendor-order/[orderToken]/* endpoints.
 */

import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface ResolvedVendorOrder {
  order: typeof partnerApiOrdersTable.$inferSelect;
  vendor: typeof partnerApiVendorsTable.$inferSelect;
}

/**
 * Resolve vendor and order by orderToken.
 * Returns null if not found, inactive, or unsupported product type.
 * Supports: customer_custom_song, customer_templated_song, rj_show
 */
export async function resolveVendorOrder(
  orderToken: string,
): Promise<ResolvedVendorOrder | null> {
  const rows = await db
    .select({
      order: partnerApiOrdersTable,
      vendor: partnerApiVendorsTable,
    })
    .from(partnerApiOrdersTable)
    .innerJoin(
      partnerApiVendorsTable,
      eq(partnerApiOrdersTable.vendor_id, partnerApiVendorsTable.id),
    )
    .where(
      and(
        eq(partnerApiOrdersTable.order_token, orderToken),
        inArray(partnerApiOrdersTable.product_type, [
          'customer_custom_song',
          'customer_templated_song',
          'rj_show',
        ]),
        eq(partnerApiVendorsTable.active, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0];
}
