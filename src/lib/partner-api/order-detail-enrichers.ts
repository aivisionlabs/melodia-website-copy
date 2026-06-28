/**
 * Order Detail Enrichers — product-type registry
 *
 * Each product type registers an enricher that mutates the base response
 * object with product-specific fields. The GET /orders/:id route calls
 * the matching enricher without knowing anything about the product.
 *
 * To add a new product type:
 *   1. Write an enricher function (see examples below).
 *   2. Add it to the ENRICHERS map at the bottom of this file.
 *   Done — the route picks it up automatically.
 */

import { type SelectPartnerApiOrder, type SelectPartnerApiVendor } from '@/lib/db/schema';

export type OrderDetailResponse = Record<string, unknown>;

export interface EnricherContext {
  order: SelectPartnerApiOrder;
  vendor: SelectPartnerApiVendor;
  response: OrderDetailResponse; // mutate this in place
}

export type ProductEnricher = (ctx: EnricherContext) => Promise<void>;

// ─── customer order flows ─────────────────────────────────────────────────────

const enrichCustomerOrderFlow: ProductEnricher = async ({ order, vendor, response }) => {
  if (order.order_token) {
    response.customer_link = `https://melodia-songs.com/vendor/${vendor.slug}/order/${order.order_token}`;
    response.order_token = order.order_token;
  }
  if (order.customer_name) response.customer_name = order.customer_name;
  if (order.song_request_id) response.song_request_id = order.song_request_id;
  if (order.status === 'completed' || order.status === 'failed') {
    response.completed_at = order.completed_at?.toISOString();
  }
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add new product types here — no other file needs to change.

const ENRICHERS: Record<string, ProductEnricher> = {
  customer_templated_song: enrichCustomerOrderFlow,
  customer_custom_song: enrichCustomerOrderFlow,
};

/**
 * Enrich a base order response with product-specific fields.
 * Falls back to a no-op for unknown product types.
 */
export async function enrichOrderDetail(ctx: EnricherContext): Promise<void> {
  const enricher = ENRICHERS[ctx.order.product_type];
  if (enricher) await enricher(ctx);
}
