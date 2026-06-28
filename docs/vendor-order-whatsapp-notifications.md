# Vendor order notifications — partner webhook + TryOWBot WhatsApp

This document describes the **vendor / partner order notification layer** used for B2B flows: when to send the **partner outbound webhook**, when to send a **customer WhatsApp** via **TryOWBot**, and how **idempotency** works under concurrent Suno callbacks and polling.

Implementation lives primarily in:

- `src/lib/vendor-order/notifications.ts` — policy + dispatcher + DB-backed idempotency
- `src/lib/whatsapp/tryowbot.ts` — minimal TryOWBot HTTP client
- `src/lib/partner-api/outbound-webhook.ts` — webhook payload builders + `deliverPartnerWebhook`

## Goals

- **Centralize policy** so routes do not hard-code “send WhatsApp here”.
- **Keep partner webhooks first-class** (existing delivery + retry logging unchanged).
- **WhatsApp as an optional channel**, driven by env + product type + mode.
- **Safe under concurrency** (webhook + polling + duplicate callbacks).

## Concepts

### Events

The dispatcher supports notification **events**:

- `order.created` — emitted after a partner order row is created and product-specific setup runs (see call sites below).
- `order.completed` — emitted when a vendor-facing order reaches a terminal “song ready” style completion for customer song products (see call sites below).

Events are explicit so future lifecycle hooks (for example `order.lyrics_ready`) can be added without rewriting routes.

### Channels

For each event, the system may use:

1. **Partner webhook** — `deliverPartnerWebhook(...)` when a `WebhookPayload` is supplied to the dispatcher.
2. **Customer WhatsApp (TryOWBot)** — template send using shared credentials + per-use-case **campaign `apiname`**.

WhatsApp is **not** a replacement for webhooks by default for `order.completed`: see **modes** below.

## Policy defaults (`EVENT_POLICIES`)

Configured in `src/lib/vendor-order/notifications.ts`:

- **`order.created`**
  - Default WhatsApp **mode**: `fallback_without_webhook`
    - Meaning: send WhatsApp **only if** the partner has **no** webhook target configured on the order **and** no vendor-level webhook URL.
  - Default eligible product types: **`customer_custom_song` only** (full custom — share customer order link after creation).
  - Template env var key: `TRYOWBOT_ORDER_CREATED_APINAME`

- **`order.completed`**
  - Default WhatsApp **mode**: `fallback_without_webhook`
    - Same webhook-suppression rule as above.
  - Default eligible product types: **`customer_templated_song` only** (template/vendor song generation finished).
  - Template env var key: `TRYOWBOT_ORDER_COMPLETED_APINAME`

**Full custom song completion** (`customer_custom_song` when the song is ready) uses **partner webhook only** — no TryOWBot on that lifecycle step. **`rj_show`** and **`customer_templated_song`** on `order.created` do not trigger WhatsApp from the dispatcher (creation notification is only for full custom orders).

## Environment variables

### TryOWBot credentials (shared)

- `TRYOWBOT_APP_ID`
- `TRYOWBOT_API_KEY`
- `TRYOWBOT_SEND_URL` (optional; defaults to `https://web.tryowbot.com/api/v1/send`)
- `TRYOWBOT_DEFAULT_COUNTRY_CODE` (optional; e.g. `91` — if partners send **10-digit local** numbers without a country code, we prefix this before calling TryOWBot. Omit if you have international-format numbers or multiple countries.)

### TryOWBot campaign names (`apiname`)

These must match approved TryOWBot **API Campaign** names in the TryOWBot dashboard:

- `TRYOWBOT_ORDER_CREATED_APINAME`
- `TRYOWBOT_ORDER_COMPLETED_APINAME`

There is **no** alternate/legacy env fallback in code: if the relevant `TRYOWBOT_*_APINAME` is missing, WhatsApp is skipped for that event.

### WhatsApp mode overrides (per event)

The dispatcher reads:

- `VENDOR_ORDER_WHATSAPP_MODE_ORDER_CREATED`
- `VENDOR_ORDER_WHATSAPP_MODE_ORDER_COMPLETED`

Allowed values:

- `disabled` — never send WhatsApp for that event (even if templates/creds exist).
- `fallback_without_webhook` — send WhatsApp only when **no** partner webhook URL exists (order override or vendor default).
- `always` — send WhatsApp whenever other prerequisites pass (mobile, token, template, product allowlist), even if a webhook exists.

If unset, the code uses the **default mode** from `EVENT_POLICIES`.

### Product-type allowlists (optional overrides)

Comma-separated lists:

- `VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_CREATED`
- `VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_COMPLETED`

Special case:

- `none` means **no product types** are eligible for WhatsApp for that event (empty allowlist).

If unset, the defaults from `EVENT_POLICIES` apply (`customer_custom_song` for `order.created`, `customer_templated_song` for `order.completed`).

## WhatsApp payload shape (TryOWBot templates)

Approved template copy (variable numbering must stay in sync with code):

- **Header:** `We've got your {{1}} order!` — {{1}} = vendor display name.
- **Body:** `Hi {{1}}, Click here to access your personalized songs {{2}}. Happy Listening :)` — {{1}} = customer/recipient label, {{2}} = order link.

The integration sends this JSON shape to TryOWBot (`{{n}}` maps to `varn` in each section):

```json
{
  "header": {
    "type": "text",
    "text": {
      "var1": "<vendor display name>"
    }
  },
  "body": {
    "var1": "<recipient label>",
    "var2": "<customer order link>"
  }
}
```

- **Header `var1`** — `vendor.name` (fallback: slug).
- **Body `var1`** — prefers `recipient_name`, then `customer_name`, else `"there"`.
- **Body `var2`** — co-branded customer link from `order_token` + vendor slug (`buildPartnerOrderCustomerLink`).

If you change the template’s variable count or order, update `buildVendorOrderTryowbotTemplateParameters` to match.

### Prerequisites (hard gates)

WhatsApp sends are skipped when any of these fail:

- TryOWBot credentials missing
- Campaign `apiname` missing for that event
- `customer_mobile` missing / not normalizable to digits
- `order_token` missing (cannot build customer link)

## Idempotency: `claimWhatsAppSendSlot`

WhatsApp sends are guarded with a DB-backed claim to prevent duplicate sends when:

- Suno webhook and polling both observe completion
- Duplicate callbacks arrive close together
- Multiple app instances handle requests concurrently

Mechanism:

- Stores per-event keys in `partner_api_orders.metadata`:
  - `notification_whatsapp_<event>_reserved`
  - `notification_whatsapp_<event>_sent_at`
- Claim succeeds only if not already sent and either:
  - no reservation exists, or
  - reservation is stale (older than 15 minutes) to recover from crashed workers

On successful TryOWBot response, reservation is cleared and `sent_at` is written.

On TryOWBot failure, reservation is released so a retry can claim again.

## Where notifications are dispatched (call sites)

### `dispatchVendorOrderNotification` (partner webhook when passed + optional TryOWBot)

#### `order.created`

- `src/app/api/v1/partner/orders/route.ts`
- `src/app/api/admin/partner-api/orders/route.ts`

Only **`customer_custom_song`** orders call the dispatcher (`notifyOrderCreatedByOrderId` early-return for other product types). TryOWBot runs only when policy + mode + mobile/token allow.

#### `order.completed`

- `src/app/api/suno-webhook/templated-songs/instances/route.ts`
- `src/app/api/templated-songs/instances/[slug]/status/route.ts`
- `src/app/api/vendor-order/[orderToken]/route.ts` — **only** when completing a **`customer_templated_song`** order (`completeTemplatedOrderAndNotify`)

TryOWBot for completion applies only to **`customer_templated_song`** per policy.

### Partner webhook only (no TryOWBot)

These deliver `deliverPartnerWebhook` for full custom completion; they do **not** go through `dispatchVendorOrderNotification`:

- `src/app/api/suno-webhook/route.ts` — `customer_custom_song` completion via `song_requests.partner_api_order_id`
- `src/app/api/vendor-order/[orderToken]/route.ts` — full custom completion (`completeCustomSongOrderAndNotify`)
- `src/app/api/vendor-order/[orderToken]/approve-lyrics/route.ts` — demo completion path for full custom

## Operational notes

- **Webhook remains source of truth for integrations** when configured; WhatsApp is intentionally subordinate for `order.completed` unless mode is set to `always`.
- **Do not log full phone numbers** in production logs; current logs use only a short suffix where needed.
- If you need different templates per vendor, the current code uses **global `apiname` env vars**; extending to per-vendor configuration would require schema/env design (not implemented here).

## Quick configuration recipes

### A) Completion WhatsApp only when webhook is absent (default)

- Set TryOWBot credentials
- Set `TRYOWBOT_ORDER_COMPLETED_APINAME`
- Ensure `VENDOR_ORDER_WHATSAPP_MODE_ORDER_COMPLETED` is unset or `fallback_without_webhook`

### B) WhatsApp when the full custom order link is created

- Set `TRYOWBOT_ORDER_CREATED_APINAME`
- Ensure product allowlist includes `customer_custom_song` (default) or use `VENDOR_ORDER_WHATSAPP_PRODUCTS_ORDER_CREATED`
- Set `VENDOR_ORDER_WHATSAPP_MODE_ORDER_CREATED` to `always` or `fallback_without_webhook` depending on whether webhook should suppress WhatsApp

### C) Disable WhatsApp entirely

- Set both modes to `disabled`, or set both product lists to `none`
