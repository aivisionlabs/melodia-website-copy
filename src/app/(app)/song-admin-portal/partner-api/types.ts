export interface PartnerApiVendor {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  webhook_url: string | null;
  invoice_legal_entity_name: string | null;
  invoice_address: string | null;
  invoice_gst_number: string | null;
  invoice_mobile: string | null;
  sandbox: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  default_price: string | null;
  default_price_currency: string | null;
}

export interface PartnerApiCredential {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface ProductPrice {
  id: number;
  product_type: string;
  product_label: string;
  price: string;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_TYPES = [
  {
    value: "customer_templated_song",
    label: "Templated Song (Customer UI)",
    description:
      "Customer browses templates on a co-branded page, picks one, and enters the recipient name. Suno generates after submission.",
  },
  {
    value: "customer_custom_song",
    label: "Custom Song (Customer UI)",
    description:
      "Customer fills a story form on a co-branded page. LLM generates personalised lyrics, customer reviews and approves, then Suno generates the song.",
  },
] as const;

export interface VendorFormState {
  name: string;
  slug: string;
  logo_url: string;
  webhook_url: string;
  invoice_legal_entity_name: string;
  invoice_address: string;
  invoice_gst_number: string;
  invoice_mobile: string;
  sandbox: boolean;
  active: boolean;
  default_price: string;
  currency: string;
}

// Keyed by product_type value
export type PricingFormState = Record<
  string,
  { price: string; currency: string }
>;

export const emptyVendorForm: VendorFormState = {
  name: "",
  slug: "",
  logo_url: "",
  webhook_url: "",
  invoice_legal_entity_name: "",
  invoice_address: "",
  invoice_gst_number: "",
  invoice_mobile: "",
  sandbox: false,
  active: true,
  default_price: "",
  currency: "INR",
};

export function buildEmptyPricingForm(): PricingFormState {
  return Object.fromEntries(
    PRODUCT_TYPES.map((p) => [p.value, { price: "", currency: "INR" }]),
  );
}

export type ProductTypeValue = (typeof PRODUCT_TYPES)[number]["value"];

export interface YouTubeLinkEntry {
  url: string;
  start_seconds: string;
  end_seconds: string;
}

export interface CreateOrderForm {
  product_type: ProductTypeValue;
  external_order_id: string;
  webhook_url: string;
  // customer_templated_song + customer_custom_song
  customer_name: string;
  customer_mobile: string;
  occasion: string;
  package_slug: string;
  /** Song recipient; optional for templated song (stored on order when set). */
  recipient_name: string;
}

export interface CreateOrderResult {
  order_id: number;
  status: string;
  // customer-facing
  customer_link?: string;
  order_token?: string;
}
