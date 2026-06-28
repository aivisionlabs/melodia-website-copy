# Melodia Partner API — FNP (Ferns N Petals) Integration

This document describes how **FNP (Ferns N Petals)** integrates with Melodia's Partner API to offer personalised songs as an add-on gift product across FNP's gifting platforms (web, mobile app, and franchise network).

---

## Table of contents

1. [Partnership overview](#partnership-overview)
2. [Base URL and authentication](#base-url-and-authentication)
3. [Errors and rate limits](#errors-and-rate-limits)
4. [List sample songs](#list-sample-songs)
5. [List templates](#list-templates)
6. [Create an order (customer link flow)](#create-an-order-customer-link-flow)
7. [Create an order (partner-driven flow)](#create-an-order-partner-driven-flow)
8. [List orders](#list-orders)
9. [Get order detail](#get-order-detail)
10. [Webhooks](#webhooks)
11. [Sandbox testing](#sandbox-testing)
12. [FNP-specific integration notes](#fnp-specific-integration-notes)
13. [Further reading](#further-reading)

---

## Partnership overview

FNP is India's largest gifting platform with 450+ outlets and a significant online presence. The Melodia integration enables FNP to offer personalised songs as:

- **Add-on to existing gift orders** (e.g. flowers + personalised birthday song)
- **Standalone "Song Gift" product** in FNP's gifting catalogue
- **Franchise POS integration** where store staff create orders on behalf of walk-in customers

### Recommended product types for FNP

| FNP use case | Melodia product type | Why |
|---|---|---|
| Quick add-on at checkout (customer picks template + enters name) | `customer_templated_song` | Fast (~3 min), minimal friction, customer self-service |
| Premium "Story Song" gift (customer tells their story, AI writes lyrics) | `customer_custom_song` | High personalisation, premium positioning |
| Franchise POS (store staff enters name, selects template) | `customer_templated_song` (with `template_id` + `recipient_name` in the create call) | Server starts generation immediately; no customer self-service page required |
| Bulk corporate gifting (FNP corporate handles details) | `customer_templated_song` (same as POS) | Partner supplies names and template in the API call |

---

## Base URL and authentication

- **Base URL:** `https://api.melodia-songs.com`
- **API prefix:** `/api/v1/partner`

Every request must include the FNP-issued API key:

```http
Authorization: Bearer <your_api_key>
```

Melodia issues separate keys for:
- **Sandbox** — safe for integration testing; orders simulate completion
- **Production** — live song generation; billed per order

Missing or invalid keys receive **401 Unauthorized**. Do not expose keys in client-side code, mobile app bundles, or public repositories.

### Key management

FNP will receive credentials via the Melodia admin portal. Each credential has:
- A **name** (e.g. "FNP Web Production", "FNP Mobile App", "FNP Franchise POS")
- An optional **expiry date**
- An **active/inactive** toggle

Multiple credentials can coexist per environment.

---

## Errors and rate limits

**Errors** use a consistent JSON shape:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Human-readable message.",
    "request_id": "req_abc123"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | object | Always present on error responses. |
| `error.code` | string | Machine-readable code (e.g. `VALIDATION_ERROR`, `PRICE_NOT_CONFIGURED`, `TEMPLATE_NOT_FOUND`, `INTERNAL_ERROR`). |
| `error.message` | string | Human-readable explanation; safe to log. Do not rely on exact wording for branching logic. |
| `error.request_id` | string | Correlation id — include when contacting Melodia support. |

### Common error codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired API key |
| `VALIDATION_ERROR` | 400 | Request body fails schema validation |
| `TEMPLATE_NOT_FOUND` | 404 | `template_id` does not exist or is inactive |
| `PRICE_NOT_CONFIGURED` | 400 | No active price for the requested `product_type` |
| `ORDER_NOT_FOUND` | 404 | Order ID does not exist or belongs to another vendor |
| `DUPLICATE_EXTERNAL_ORDER` | 409 | `external_order_id` already used (non-idempotent retry) |
| `RATE_LIMITED` | 429 | Too many requests — back off and retry |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

**Rate limits** apply per API key. Expect approximately:
- **~100 requests/min** for read endpoints (GET)
- **~30 requests/min** for write endpoints (POST)

**429 Too Many Requests** may include a `Retry-After` header (seconds) — back off and retry.

---

## List sample songs

**Endpoint:** `GET /api/v1/partner/sample`

Returns curated library tracks for showcase purposes — use for listening previews in FNP's product detail page or checkout flow.

### Request

#### Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | `1` | Page index (1-based). Values below `1` are treated as `1`. |
| `limit` | integer | No | `10` | Page size. Clamped between `1` and `100` (inclusive). |

#### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <api_key>` |

### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` when the list was returned successfully. |
| `songs` | array | Page of library songs (see below). |
| `pagination` | object | Pagination metadata. |

#### Each object in `songs`

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Melodia internal id for this library song. |
| `title` | string | Display title of the track. |
| `slug` | string | URL-friendly slug. |
| `language` | string \| null | Language label (e.g. "Hindi", "Tamil, English"). |
| `categories` | array | Occasion/category tags. Each: `{ id, name, slug }`. |
| `thumbnail_url` | string \| null | Absolute URL for cover art. |
| `song_url` | string \| null | Absolute URL for preview audio. |
| `lyrics` | string \| null | Full lyrics text if stored. |

#### Pagination object

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page (1-based). |
| `limit` | number | Page size used. |
| `total_count` | number | Total showcase songs. |
| `total_pages` | number | `ceil(total_count / limit)`. |
| `has_next_page` | boolean | `true` if more pages exist. |
| `has_previous_page` | boolean | `true` if `page > 1`. |

Responses may include `Cache-Control` headers for CDN-friendly caching.

### Example

```bash
curl -sS -X GET "https://api.melodia-songs.com/api/v1/partner/sample?page=1&limit=10" \
  -H "Authorization: Bearer FNP_API_KEY"
```

---

## List templates

**Endpoint:** `GET /api/v1/partner/templates`

Returns available song templates. Use this to show template options in FNP's UI or to get valid `template_id` values for `customer_templated_song` orders.

### Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `occasion` | string | No | — | Filter by occasion slug (e.g. `birthday`, `anniversary`). |
| `page` | integer | No | `1` | Page index (1-based). |
| `limit` | integer | No | `10` | Page size (1–100). |

### Example

```bash
curl -sS -X GET "https://api.melodia-songs.com/api/v1/partner/templates?occasion=birthday&limit=20" \
  -H "Authorization: Bearer FNP_API_KEY"
```

---

## Create an order (customer link flow)

Use this when FNP does **not** collect full song details on its side. Melodia generates a **one-time customer URL** that FNP shares with the buyer. The customer completes the song creation journey on a **co-branded Melodia page** (with FNP logo and branding).

**Endpoint:** `POST /api/v1/partner/orders`

### Request headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <api_key>` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | Unique string per logical purchase. Retries with the same key return the existing order. |

### Request body fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_type` | string | Yes | `customer_templated_song` or `customer_custom_song` | Selects the co-branded journey type. |
| `external_order_id` | string | Yes | 1–500 chars | FNP's stable order or line-item reference (e.g. FNP cart ID). Must be unique per new order. |
| `customer_name` | string | No | 1–200 chars | Recipient greeting on the co-branded page. |
| `customer_mobile` | string | No | 8–15 digits (E.164) | End-customer phone. Melodia sends the song creation link via WhatsApp to this number. |
| `occasion` | string | No | — | Pre-selects occasion in the form (e.g. `"Adult Birthday"`, `"Wedding Anniversary"`). |
| `category_slug` | string | No | — | For `customer_templated_song` only — filters templates shown to customer. |
| `package_slug` | string | No | Default `"package_1"` | Determines lyrics revision limit. |
| `webhook_url` | string | No | Valid HTTPS URL | Per-order webhook override. |
| `idempotency_key` | string | No | Max 500 chars | Same as `Idempotency-Key` header. |
| `metadata` | object | No | — | Arbitrary JSON passthrough stored on the order. |

### Two customer-facing product types

| | **Template song (customer UI)** | **Fully custom song (customer UI)** |
|---|-------------------------------|-------------------------------------|
| **`product_type`** | `customer_templated_song` | `customer_custom_song` |
| **Customer experience** | Co-branded page: browse templates by occasion, pick one, enter recipient name → Melodia generates song from template. | Co-branded page: full story/occasion/language/mood form → AI writes lyrics → customer reviews + revises → approves → Melodia generates song. |
| **Typical FNP use** | Quick add-on at checkout; "Add a song" upsell. | Premium "Story Song" standalone product. |
| **Estimated completion** | **3 minutes** (after customer completes the page). | **5–10 minutes** (full journey). |

### Example — customer template song

```bash
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer FNP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fnp-order-2026-04-18-001" \
  -d '{
    "product_type": "customer_templated_song",
    "external_order_id": "FNP-WEB-78901",
    "customer_name": "Riya",
    "customer_mobile": "+919876543210",
    "category_slug": "birthday",
    "package_slug": "package_1",
    "webhook_url": "https://api.fnp.com/webhooks/melodia",
    "metadata": {
      "fnp_cart_id": "CART-78901",
      "channel": "web",
      "gift_bundle_id": "roses-song-combo"
    }
  }'
```

### Example — fully custom song

```bash
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer FNP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fnp-order-2026-04-18-002" \
  -d '{
    "product_type": "customer_custom_song",
    "external_order_id": "FNP-WEB-78902",
    "customer_name": "Aarav",
    "customer_mobile": "9876543210",
    "occasion": "Wedding Anniversary",
    "package_slug": "package_1",
    "webhook_url": "https://api.fnp.com/webhooks/melodia",
    "metadata": {
      "fnp_cart_id": "CART-78902",
      "channel": "mobile-app"
    }
  }'
```

### Response (200 OK)

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` when the order was created (or replayed idempotently). |
| `order_id` | number | Melodia's internal partner order id. |
| `status` | string | Initially `pending` until the customer finishes steps on Melodia. |
| `order_token` | string (UUID) | Secret embedded in `customer_link`. Do not expose in logs. |
| `customer_link` | string (URL) | `https://<host>/vendor/fnp/order/<order_token>`. Share with the customer. |
| `estimated_completion_minutes` | number | `3` for template, `5` for custom (indicative, not SLA). |
| `customer_mobile` | string | Echoed back when provided. |

### Example response

```json
{
  "success": true,
  "order_id": 156,
  "status": "pending",
  "order_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer_link": "https://melodia-songs.com/vendor/fnp/order/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "estimated_completion_minutes": 3,
  "customer_mobile": "+919876543210"
}
```

---

## Create an order (partner-driven flow)

Use this when FNP collects the recipient name and template selection on its own UI (e.g. franchise POS, corporate bulk gifting). Melodia generates the song immediately — no customer interaction.

**Endpoint:** `POST /api/v1/partner/orders`

### Request body fields (partner-driven)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_type` | string | Yes | Must be `customer_templated_song` | Partner-driven template generation (immediate Suno job when `template_id` + `recipient_name` are set). |
| `external_order_id` | string | Yes | 1–500 chars | FNP's order reference. |
| `template_id` | number | Yes | Valid active template ID | Use `GET /templates` to browse available templates. |
| `recipient_name` | string | Yes | 2–15 chars | Name inserted into template lyrics. |
| `webhook_url` | string | No | Valid HTTPS URL | Per-order webhook override. |
| `metadata` | object | No | — | Arbitrary passthrough. |

### Example — franchise POS order

```bash
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer FNP_FRANCHISE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fnp-franchise-gurugram-001" \
  -d '{
    "product_type": "customer_templated_song",
    "external_order_id": "FNP-POS-GGN-12345",
    "template_id": 42,
    "recipient_name": "Meera",
    "metadata": {
      "franchise_code": "FNP-GGN-04",
      "store_name": "FNP Gurugram Sector 29",
      "staff_id": "STAFF-042"
    }
  }'
```

### Response (200 OK)

```json
{
  "success": true,
  "order_id": 157,
  "status": "song_generation_inprogress",
  "order_token": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "customer_link": "https://melodia-songs.com/vendor/fnp/order/b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "estimated_completion_minutes": 3
}
```

Generation starts immediately. Optional tracking URL (`customer_link`) is returned if you need deep-linking; completion still arrives via webhook with `playback_url`.

---

## List orders

**Endpoint:** `GET /api/v1/partner/orders`

Returns orders belonging to the authenticated vendor with cursor-based pagination.

### Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | — | Filter by status: `pending`, `processing`, `completed`, `failed`, etc. |
| `from` | string | No | — | ISO 8601 datetime — include orders created on or after this time. |
| `to` | string | No | — | ISO 8601 datetime — include orders created on or before this time. |
| `cursor` | string | No | — | Cursor from a previous response's `next_cursor` for pagination. |
| `limit` | integer | No | `50` | Page size (max 100). |

### Example

```bash
curl -sS -X GET "https://api.melodia-songs.com/api/v1/partner/orders?status=completed&from=2026-04-01T00:00:00Z&limit=20" \
  -H "Authorization: Bearer FNP_API_KEY"
```

### Response (200 OK)

```json
{
  "success": true,
  "orders": [
    {
      "order_id": 156,
      "external_order_id": "FNP-WEB-78901",
      "product_type": "customer_templated_song",
      "status": "completed",
      "amount_charged": "299.00",
      "currency": "INR",
      "customer_link": "https://melodia-songs.com/vendor/fnp/order/a1b2c3d4...",
      "created_at": "2026-04-18T10:30:00Z",
      "completed_at": "2026-04-18T10:35:00Z"
    }
  ],
  "next_cursor": "eyJpZCI6MTU1fQ==",
  "has_more": true
}
```

---

## Get order detail

**Endpoint:** `GET /api/v1/partner/orders/{id}`

Returns full details for a single order including product-specific fields.

### Example

```bash
curl -sS -X GET "https://api.melodia-songs.com/api/v1/partner/orders/156" \
  -H "Authorization: Bearer FNP_API_KEY"
```

### Response (200 OK) — completed customer_templated_song

```json
{
  "success": true,
  "order_id": 156,
  "external_order_id": "FNP-WEB-78901",
  "product_type": "customer_templated_song",
  "status": "completed",
  "customer_name": "Riya",
  "customer_mobile": "+919876543210",
  "amount_charged": "299.00",
  "currency": "INR",
  "playback_url": "https://melodia-songs.com/vendor/fnp/birthday-song-riya-x7k",
  "song_title": "Happy Birthday Riya",
  "instance_slug": "birthday-song-riya-x7k",
  "metadata": {
    "fnp_cart_id": "CART-78901",
    "channel": "web",
    "gift_bundle_id": "roses-song-combo"
  },
  "created_at": "2026-04-18T10:30:00Z",
  "completed_at": "2026-04-18T10:35:00Z"
}
```

---

## Webhooks

Melodia delivers outbound webhooks to FNP when orders reach terminal states (`completed` or `failed`).

### Webhook URL resolution

1. **Per-order `webhook_url`** (in the create request) — highest priority
2. **Vendor-level `webhook_url`** (configured in Melodia admin) — fallback

### Signature verification

Every webhook includes an HMAC-SHA256 signature:

```
X-Melodia-Webhook-Signature: sha256=<hex_digest>
```

**Verification (Node.js example):**

```javascript
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, webhookSecret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}
```

### Event: `order.completed`

```json
{
  "event": "order.completed",
  "timestamp": "2026-04-18T10:35:00.000Z",
  "order_id": 156,
  "external_order_id": "FNP-WEB-78901",
  "product_type": "customer_templated_song",
  "data": {
    "status": "completed",
    "playback_url": "https://melodia-songs.com/vendor/fnp/birthday-song-riya-x7k",
    "song_title": "Happy Birthday Riya",
    "duration_seconds": 180,
    "completed_at": "2026-04-18T10:35:00.000Z",
    "amount_charged": "299.00",
    "currency": "INR"
  }
}
```

### Event: `order.failed`

```json
{
  "event": "order.failed",
  "timestamp": "2026-04-18T10:35:00.000Z",
  "order_id": 157,
  "external_order_id": "FNP-POS-GGN-12345",
  "product_type": "customer_templated_song",
  "data": {
    "status": "failed",
    "error_message": "Song generation service temporarily unavailable",
    "failed_step": "suno_api_call",
    "completed_at": "2026-04-18T10:37:00.000Z"
  }
}
```

### Retry schedule

If FNP's webhook endpoint returns a non-2xx status or times out (10s), Melodia retries:

| Attempt | Delay after failure |
|---------|-------------------|
| 1 | 30 seconds |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 24 hours |

After 5 failed attempts, the delivery is marked exhausted. FNP can still poll `GET /orders/{id}` to check order status.

---

## Sandbox testing

FNP receives a **sandbox API key** for integration testing. Sandbox orders do not create a new song based on the user input (Real song production is only restricted to production systems as of now, when you need to test the full flow, we will share the production api keys.) — they simulate the full lifecycle.

### Simulate order completion/failure

**Endpoint:** `POST /api/v1/partner/orders/{id}/simulate`

```bash
# Simulate successful completion
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders/42/simulate" \
  -H "Authorization: Bearer FNP_SANDBOX_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "outcome": "complete" }'

# Simulate failure
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders/42/simulate" \
  -H "Authorization: Bearer FNP_SANDBOX_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "outcome": "fail" }'
```

**Rules:**
- Only works with sandbox vendor keys (production keys receive **403 Forbidden**)
- Only works on non-terminal orders (completed/failed orders receive **400**)
- Triggers the same webhook delivery as production orders

### Metadata simulation

Include `"simulate": "failure"` in the `metadata` field at order creation to immediately fail the order:

```json
{
  "product_type": "customer_templated_song",
  "external_order_id": "fnp-test-fail",
  "template_id": 4,
  "recipient_name": "Test",
  "metadata": { "simulate": "failure" }
}
```

---

## FNP-specific integration notes

### 1. Multi-channel support

FNP operates across web, mobile app, and franchise stores. We recommend:
- **Separate API credentials per channel** (e.g. `FNP Web`, `FNP Mobile`, `FNP Franchise`) for tracking and rate limiting
- Use `metadata.channel` to tag the source for analytics

### 2. Gift bundle integration

When a song is part of a gift bundle (e.g. "Roses + Song Combo"), include the bundle reference in metadata:

```json
{
  "metadata": {
    "gift_bundle_id": "roses-song-combo",
    "parent_order_id": "FNP-MAIN-99999"
  }
}
```

This helps correlate Melodia orders with FNP's main order for support and reconciliation.

### 3. Customer link delivery

FNP has two options for sharing the `customer_link`:
- **Provide `customer_mobile`** — Melodia sends the link via WhatsApp automatically
- **Omit `customer_mobile`** — FNP delivers the link through its own channels (email, SMS, in-app notification)

### 4. Co-branded page

The customer-facing page at `/vendor/fnp/order/{token}` displays:
- FNP logo (configured via `logo_url` on the vendor record)
- FNP brand name in the header
- Full Melodia song creation experience without Melodia payment UI

### 5. Franchise POS considerations

For walk-in customers at franchise stores:
- Use `customer_templated_song` with `template_id` and `recipient_name` on create (staff selects template + enters name)
- Include `franchise_code` and `staff_id` in metadata for attribution
- The playback URL from the completion webhook can be displayed on the store's screen or sent to the customer via SMS

---
