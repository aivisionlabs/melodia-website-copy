# Melodia Partner API — Winni integration

This document describes how **Winni** calls Melodia’s Partner API to:

1. **List sample songs** from Melodia’s public library (previews and marketing).
2. **Create vendor orders** that return a **`customer_link`**, which Melodia sends to the end customer, who can open a **co-branded Melodia page** and create their song.

---

## Table of contents

1. [Base URL and authentication](#base-url-and-authentication)
2. [Errors and rate limits](#errors-and-rate-limits)
3. [List sample songs](#list-sample-songs)
4. [Create an order (customer link flow)](#create-an-order-customer-link-flow)
5. [Further reading](#further-reading)

---

## Base URL and authentication

- **Base URL:** `https://api.melodia-songs.com`
- **API prefix:** `/api/v1/partner`

Every request must include your API key:

```http
Authorization: Bearer <your_api_key>
```

Melodia issues keys per vendor. Missing or invalid keys receive **401 Unauthorized**. Do not expose keys in client-side code or public repositories.

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
| `error.code` | string | Machine-readable code (e.g. `VALIDATION_ERROR`, `PRICE_NOT_CONFIGURED`, `INTERNAL_ERROR`). |
| `error.message` | string | Human-readable explanation; safe to log. Do not rely on exact wording for branching logic. |
| `error.request_id` | string | Correlation id—include when contacting Melodia support. |

Include **`request_id`** when contacting Melodia support.

**Rate limits** apply per API key. Expect on the order of **~100 GET requests per minute** for read endpoints (confirm limits in your contract). **429 Too Many Requests** may include **`Retry-After`** (seconds)—back off and retry.

---

## List sample songs

**Endpoint:** `GET /api/v1/partner/sample`

Returns curated library tracks Melodia exposes for showcase and displaying as sample songs in the Winni's checkout flow. Use this for **listening previews**.

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
| `Accept` | No | Optional; response body is JSON. |

### Response (200 OK)

#### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` when the list was returned successfully. |
| `songs` | array | Page of library songs |
| `pagination` | object | See [Pagination object (sample songs)](#pagination-object-sample-songs) below. |

Responses may include **`Cache-Control`** (e.g. `public, s-maxage=86400, stale-while-revalidate=604800`) for CDN-friendly caching.

#### Each object in `songs`

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Melodia internal id for this library song row. |
| `title` | string | Display title of the track. |
| `slug` | string | URL-friendly slug for this song. |
| `language` | string \| null | Language label or mix (e.g. comma-separated) as stored on the song. |
| `categories` | array | Zero or more occasion/category tags. Each element has `id` (number), `name` (string), `slug` (string). |
| `thumbnail_url` | string \| null | Absolute URL for cover art from the selected audio variant, if available. |
| `song_url` | string \| null | Absolute URL for preview audio (selected variant), if available. |
| `lyrics` | string \| null | Full lyrics text for this library track, if stored. |

#### Pagination object (sample songs)

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page (1-based), echo of the request. |
| `limit` | number | Page size used for this response. |
| `total_count` | number | Total number of showcase songs matching the backend filter. |
| `total_pages` | number | `ceil(total_count / limit)`. |
| `has_next_page` | boolean | `true` if a higher `page` value would return more items. |
| `has_previous_page` | boolean | `true` if `page` > 1. |

### Example

```bash
curl -sS -X GET "https://api.melodia-songs.com/api/v1/partner/sample?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Example response (200 OK)

```json
{
  "success": true,
  "songs": [
    {
      "id": 123,
      "title": "Example library title",
      "slug": "example-song-slug",
      "language": "Hindi",
      "categories": [
        { "id": 2, "name": "Birthday", "slug": "birthday" }
      ],
      "thumbnail_url": "https://media.melodia-songs.com/.../cover.jpg",
      "song_url": "https://media.melodia-songs.com/.../audio.mp3",
      "lyrics": "Lyrics for this library track..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_count": 48,
    "total_pages": 5,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

---

## Create an order (customer link flow)

Use this when you **do not** collect full song details on Winni’s side: Melodia generates a **one-time customer URL**. After your server-side `POST`, an order is created on Melodia's platform and Melodia will share **`customer_link`** with the buyer via whatsapp.

**Endpoint:** `POST /api/v1/partner/orders`

### Request headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <api_key>`. |
| `Content-Type` | Yes | `application/json`. |
| `Idempotency-Key` | No | Unique string per logical purchase (e.g. UUID or your order id). If you **retry** with the same key, Melodia returns the **existing** order instead of creating a duplicate. See [Idempotent replay](#idempotent-replay) below. |

You can also send the idempotency value in the JSON body as **`idempotency_key`** (same semantics as the header; use one or the other in practice).

### Common request body fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_type` | string | Yes | Must be `customer_templated_song` or `customer_custom_song` for the flows in this document. | Selects which co-branded journey the customer sees. |
| `external_order_id` | string | Yes | 1–500 characters. | **Your** stable order or reference id (e.g. Winni cart id). Must be unique per new order. |
| `recipient_name` | string | No | 1–200 characters if provided. | Song's Recipient name, omit if not available  |
| `customer_mobile` | string | No | After trim: max **40** characters; optional leading **`+`**; only digits and common spacing/punctuation (`-` `(` `)` `.`). Must contain **8–15 digits** total (international E.164). Examples: `9876543210`, `+919876543210`, `+44 20 7946 0958`. | Optional **end-customer phone number** for Melodia to store on the order, Melodia will send song creation link on this number. |
| `idempotency_key` | string | No | Max 500 characters. | Same meaning as the **`Idempotency-Key`** header. |
| `metadata` | object | No | Arbitrary JSON object. | Optional passthrough stored on the order. Sandbox vendors may use `metadata.simulate: "failure"` only in test environments to force an immediate failed order—see internal testing docs; not for production. |

### Two product types that return `customer_link`

| | **Template song (customer UI)** | **Fully custom song (customer UI)** |
|---|-------------------------------|-------------------------------------|
| **`product_type`** | `customer_templated_song` | `customer_custom_song` |
| **Customer experience** | Co-branded page: browse Melodia **templates**, pick one, enter **recipient name** → Melodia generates 2 songs from that template. | Co-branded page: full **story / occasion / language / mood** form → **AI writes lyrics** → customer reviews (and optional AI revisions) → approves → Melodia generates 2 songs. |
| **Typical use** | You want a short, template-based gift without a long form. | You want a deeply personalised song from the customer’s story. |
| **`estimated_completion_minutes` in response** | **3** (indicative after customer completes the page). | **5** (indicative; full journey is longer in wall-clock time). |

### Example — template song (`customer_templated_song`)

```bash
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: winni-order-2026-04-15-001" \
  -d '{
    "product_type": "customer_templated_song",
    "external_order_id": "winni-internal-12345",
    "customer_name": "Priya",
    "customer_mobile": "9876543210",
    "occasion": "birthday",
    "package_slug": "package_1",
    "webhook_url": "https://api.winni.in/webhooks/melodia"
  }'
```

### Example — fully custom song (`customer_custom_song`)

```bash
curl -sS -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: winni-order-2026-04-15-002" \
  -d '{
    "product_type": "customer_custom_song",
    "external_order_id": "winni-internal-67890",
    "customer_name": "Aisha",
    "customer_mobile": "+919876543210",
    "occasion": "Adult Birthday",
    "package_slug": "package_1",
    "webhook_url": "https://api.winni.in/webhooks/melodia"
  }'
```

### Response (200 OK) — successful create

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` when the order was created (or replayed idempotently—see below). |
| `order_id` | number | Melodia’s internal partner order id. Use in support tickets and when correlating webhooks. |
| `status` | string | For these product types, initially **`pending`** until the customer finishes steps on Melodia. Other statuses appear after progress or terminal states. |
| `order_token` | string (UUID) | Secret embedded in **`customer_link`**. Do not expose in client-side logs or analytics. |
| `customer_link` | string (URL) | Absolute HTTPS URL: `https://<host>/vendor/<vendor_slug>/order/<order_token>`. **Share this** with the end customer. Host and **`vendor_slug`** are assigned at onboarding. |
| `estimated_completion_minutes` | number | Rough hint only—not a SLA. **3** for `customer_templated_song`, **5** for `customer_custom_song` at creation time. |
| `customer_mobile` | string | Echoed back for confirmation.|

Melodia also persists `customer_mobile` on the order; **`GET /api/v1/partner/orders`** and **`GET /api/v1/partner/orders/:id`** include it when stored.

### Example response (200 OK)

```json
{
  "success": true,
  "order_id": 42,
  "status": "pending",
  "order_token": "550e8400-e29b-41d4-a716-446655440000",
  "customer_link": "https://melodia-songs.com/vendor/your-vendor-slug/order/550e8400-e29b-41d4-a716-446655440000",
  "estimated_completion_minutes": 3,
  "customer_mobile": "9876543210"
}
```

(`customer_mobile` appears only when it was sent on the request.)

### Idempotent replay {#idempotent-replay}

If you send the **same** `Idempotency-Key` / `idempotency_key` as a **previous** successful create for your vendor, Melodia returns **200** with the **existing** order:

```json
{
  "success": true,
  "order_id": 42,
  "status": "pending"
}
```

### Security note

Treat **`order_token`** like a password: anyone with the **`customer_link`** can open that order’s co-branded page. Deliver the link only to the intended recipient channel.
