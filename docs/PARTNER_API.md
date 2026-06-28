# **Melodia Partner API — B2B Integration Guide**

This document describes how B2B providers integrate with Melodia to offer **personalized templated songs**. It covers authentication, listing templates, placing orders, and receiving completion webhooks.

---

## **Table of contents**

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL and versioning](#base-url-and-versioning)
4. [Rate limiting](#rate-limiting)
5. [Sandbox testing](#sandbox-testing)
6. [Fetch templated songs](#1-fetch-templated-songs)
7. [Create an order (personalized song)](#2-create-an-order-personalized-song)
8. [Webhook: order completion](#3-webhook-order-completion)
9. [Error handling](#error-handling)
10. [Idempotency](#idempotency)
11. [Quick reference](#quick-reference)

---

## **Overview**

* **Flow**: You fetch available song templates (by occasion), show them in your UI, customer can listen to the song and view the lyrics, and when a customer chooses a template and provides a name and once the payment is captured on the Partner's platform, you create an order with Melodia. Melodia generates the personalized song and notifies you via a **webhook** when it is ready (or if it failed).

* **Product**: Templated songs only in this document (personalized songs generated from a template; the recipient's name is inserted into the song).

* **Security**: All Partner API requests require an **API key** (Bearer token). Webhooks are **signed** so you can verify they come from Melodia.

---

## **Authentication**

Every request to the Partner API must include your API key in the `Authorization` header:

```http
Authorization: Bearer <your_api_key>
```

* **Obtaining an API key**: Melodia will create a Partner API vendor for your organization and issue one or more API keys. Keys are tied to your vendor account; never share them or commit them to source control.

* **Invalid or missing key**: Requests without a key or with an invalid/expired key receive `401 Unauthorized`.

**Example (curl):**

```bash
curl -X GET "https://api.melodia-songs.com/api/v1/partner/templates?occasion=birthday&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## **Base URL and versioning**

* **Base URL**: `https://api.melodia-songs.com`

* **Path prefix**: All Partner endpoints live under `/api/v1/partner`. The `v1` prefix is stable; future breaking changes will be introduced under a new version (e.g. `v2`).

---

## **Rate limiting**

* Requests are rate-limited **per API key** (and thus per vendor).

* Typical limits (confirm with Melodia for your contract):

  * **GET /templates**: e.g. 100 requests per minute.

  * **POST /orders**: e.g. 30 requests per minute.

* When the limit is exceeded, the API returns **429 Too Many Requests** with a `Retry-After` header (seconds). Use exponential backoff and respect `Retry-After` when present.

---

## **Sandbox testing**

You can test your integration **without incurring real API costs** (no live lyrics or song generation) by using a **sandbox API key**. Sandbox and production use the **same base URL**: `https://api.melodia-songs.com`. There is no separate sandbox domain or environment.

**How it works**

* When you onboard as a partner, Melodia can issue you a **sandbox API key** (in addition to or before your production key). Requests that use this key are treated as sandbox: same endpoints, same request/response shape, but with **demo behavior**.

* **In sandbox mode:**

  * **GET /templates** returns the same template list as production (real data).

  * **POST /orders** The order is created and moves to a completed state.

  * **Webhooks** are sent to your `webhook_url` with the same payload shape and signing, but the `playback_url` points to a demo player page.

* Sandbox orders are **excluded from billing and receivables**; they are for integration testing only.

**Testing flow**

1. Integrate against `https://api.melodia-songs.com` using your **sandbox API key** (same `Authorization: Bearer <sandbox_key>` header).
2. Call `GET /templates`, `POST /orders`, and handle webhooks exactly as you would in production. Verify webhook signature verification, idempotency, and error handling.
3. After creating an order, use the **Simulate endpoint** (described below) to trigger completion or failure on your own — no manual intervention from Melodia required.
4. When you are ready to go live, switch your integration to your **production API key**. No URL or endpoint changes — only the key changes.

**Important:** Sandbox is determined by the **API key** (each key is tied to either a sandbox or a production vendor). There is no per-request flag (e.g. no `sandbox: true` in the body). Use the key provided for testing for all sandbox requests.

---

### Simulate order completion or failure (sandbox only)

`POST /api/v1/partner/orders/{order_id}/simulate`

Sandbox vendors can self-service trigger an order to move to `completed` or `failed` state, firing the partner webhook exactly as the real song generation flow would. This allows you to test your full end-to-end integration — including webhook receipt, signature verification, and `playback_url` handling — without any involvement from Melodia.

> **This endpoint is only available for sandbox API keys.** Calling it with a production key returns `403 Forbidden`.

**Alternatively — instant failure at order creation time**

If you want to test failure handling without a two-step flow, pass this in the `POST /orders` body:

```json
{
  "metadata": { "simulate": "failure" }
}
```

The order is immediately marked `failed` (skips processing entirely) and an `order.failed` webhook is fired. Use this for quick smoke-testing of your failure path; use the simulate endpoint when you need the full processing → completed/failed lifecycle.

**Headers:**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <your_sandbox_api_key>` |
| `Content-Type` | `application/json` |

**Path parameter:**

| Parameter | Type | Description |
|---|---|---|
| `order_id` | number | The `order_id` returned from `POST /orders`. Must belong to your vendor account. |

**Request body:**

```json
{
  "outcome": "complete"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `outcome` | string | No | `"complete"` or `"fail"`. Defaults to `"complete"` if omitted. |

**Example — simulate completion:**

```bash
curl -X POST "https://api.melodia-songs.com/api/v1/partner/orders/101/simulate" \
  -H "Authorization: Bearer YOUR_SANDBOX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "outcome": "complete" }'
```

**Response (200 OK — completion):**

```json
{
  "success": true,
  "order_id": 101,
  "simulated": "complete",
  "instance_slug": "birthday-song-for-priya",
  "playback_url": "https://melodia-songs.com/vendor/winni/birthday-song-for-priya",
  "message": "Order marked as completed. Webhook fired (if configured)."
}
```

**Example — simulate failure:**

```bash
curl -X POST "https://api.melodia-songs.com/api/v1/partner/orders/101/simulate" \
  -H "Authorization: Bearer YOUR_SANDBOX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "outcome": "fail" }'
```

**Response (200 OK — failure):**

```json
{
  "success": true,
  "order_id": 101,
  "simulated": "fail",
  "message": "Order marked as failed. Webhook fired (if configured)."
}
```

**What happens when you call this endpoint:**

- For `"outcome": "complete"`: The order is marked `completed`, the song instance is populated with demo audio and image variants, and an `order.completed` webhook is immediately fired to your `webhook_url` with a valid `playback_url`. The signature in `X-Melodia-Webhook-Signature` is real — your verification code will work against it.
- For `"outcome": "fail"`: The order is marked `failed` and an `order.failed` webhook is fired with `amount_charged: "0.00"`.

**Error responses:**

| HTTP | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | API key belongs to a production vendor; simulation is not allowed. |
| 400 | `ORDER_ALREADY_TERMINAL` | The order is already `completed` or `failed`. |
| 400 | `NOT_SIMULATABLE` | The order was not created in sandbox mode. |
| 404 | `ORDER_NOT_FOUND` | The order does not exist or does not belong to your vendor account. |

**Recommended sandbox test sequence (full happy-path flow):**

1. `GET /api/v1/partner/templates?occasion=birthday` → pick a `template_id`
2. `POST /api/v1/partner/orders` → note the `order_id`
3. `GET /api/v1/partner/orders/{order_id}` → confirm `status: "processing"`
4. `POST /api/v1/partner/orders/{order_id}/simulate` with `{ "outcome": "complete" }` → webhook fires
5. Receive and verify the `order.completed` webhook on your server
6. `GET /api/v1/partner/orders/{order_id}` → confirm `status: "completed"`, note `playback_url`
7. Open `playback_url` in a browser → confirm the Melodia player page loads

Repeat steps 2–5 with `"outcome": "fail"` to test your failure handling path.

---

## **1. Fetch templated songs**

Use this endpoint to list song templates, optionally filtered by **occasion**, so you can display them (title, thumbnail, lyrics preview, etc.) and let the user pick one. Results are **paginated**.

**Endpoint:** `GET /api/v1/partner/templates`

**Query parameters:**

| Parameter | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| `occasion` | string | Yes | Filters templates by occasion. Use the **category slug** (e.g. `birthday`, `anniversary`). |
| `page` | number | No | Page number (1-based). Default: `1`. |
| `limit` | number | No | Number of templates per page. Default: `20`. Maximum: `100`. |

**Example request:**

```bash
curl -X GET "https://api.melodia-songs.com/api/v1/partner/templates?occasion=birthday&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example response (200 OK):**

```json
{
  "success": true,
  "templatedSongs": [
    {
      "id": 42,
      "title": "Birthday Wishes",
      "template_title": "Birthday Song for Rahul",
      "slug": "birthday-wishes",
      "language": "English",
      "display_order": 1,
      "description": "Perfect for kids' birthday parties — upbeat and fun.",
      "categories": [
        { "id": 1, "name": "Birthday", "slug": "birthday" }
      ],
      "thumbnail_url": "https://media.melodia-songs.com/cover-42.jpg",
      "song_url": "https://media.melodia-songs.com/sample-song.mp3",
      "template_lyrics": "Happy birthday to you, Rahul..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_count": 45,
    "total_pages": 3,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Response fields (per template):**

| Field | Type | Description |
| :---- | :---- | :---- |
| `id` | number | **templateSongId** — use this when creating an order. |
| `title` | string | Internal/admin title of the template. |
| `template_title` | string | Title for the template song. |
| `slug` | string | URL-friendly identifier for the template. |
| `language` | string | Primary language (e.g. "English", "Hindi"). |
| `display_order` | number | Suggested order for display. |
| `description` | string \| null | Short blurb describing who the template suits best; safe to show in your song picker UI. |
| `categories` | array | List of occasions: `{ id, name, slug }`. Use `slug` for the `occasion` query (e.g. `birthday`, `weddings`). |
| `thumbnail_url` | string | Cover/thumbnail image URL (from the template's selected song variant). |
| `song_url` | string | URL to listen to the template song sample. |
| `template_lyrics` | string | Lyrics with `{{NAME}}` placeholder; Melodia replaces this with the recipient's name when generating the song. |

**Pagination object:**

| Field | Type | Description |
| :---- | :---- | :---- |
| `page` | number | Current page (1-based). |
| `limit` | number | Number of items per page. |
| `total_count` | number | Total number of templates matching the filter (e.g. occasion). |
| `total_pages` | number | Total number of pages (`ceil(total_count / limit)`). |
| `has_next_page` | boolean | `true` if there is a next page. |
| `has_previous_page` | boolean | `true` if there is a previous page (i.e. `page` > 1). |

If no templates match the occasion, `templatedSongs` is an empty array and `pagination.total_count` is `0`. Occasion slugs are lowercase and hyphenated (e.g. `birthday`, `weddings`, `anniversary`, `festive-holiday`).

---

## **2. Create an order (personalized song)**

After the end user selects a template and provides the recipient's name, you call this endpoint to place an order. Melodia will generate the personalized song and send the result to your webhook.

**Endpoint:** `POST /api/v1/partner/orders`

**Headers:**

* `Authorization: Bearer <your_api_key>`
* `Content-Type: application/json`
* Optional: `Idempotency-Key: <unique_string>` — see [Idempotency](#idempotency).

**Request body (templated song order):**

```json
{
  "product_type": "customer_templated_song",
  "external_order_id": "your-order-ref-12345",
  "template_id": 42,
  "recipient_name": "Priya",
  "webhook_url": "https://your-server.com/webhooks/melodia"
}
```

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| `product_type` | string | Yes | Use `"customer_templated_song"` for template-based personalized songs (include `template_id` and `recipient_name` when starting generation from your backend). |
| `external_order_id` | string | Yes | Your own order/reference ID. Returned in the webhook so you can match the callback to your system. |
| `template_id` | number | Yes | **templateSongId** from the templates response. |
| `recipient_name` | string | Yes | Name of the person the song is for (e.g. "Priya"). Min 2, max 15 characters. Melodia uses this to personalize the song (replaces `{{NAME}}` in lyrics/title). |
| `webhook_url` | string | No | URL where Melodia will POST the completion payload. If omitted, the vendor's default webhook URL is used. |
| `idempotency_key` | string | No | Optional idempotency key; see [Idempotency](#idempotency). |

**Example request:**

```bash
curl -X POST "https://api.melodia-songs.com/api/v1/partner/orders" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-abc-123" \
  -d '{
    "product_type": "customer_templated_song",
    "external_order_id": "order-789",
    "template_id": 42,
    "recipient_name": "Priya",
    "webhook_url": "https://your-server.com/webhooks/melodia"
  }'
```

**Example response (200 OK):**

```json
{
  "success": true,
  "order_id": 101,
  "status": "processing",
  "estimated_completion_minutes": 2
}
```

| Field | Type | Description |
| :---- | :---- | :---- |
| `order_id` | number | Melodia's order ID. Use this with `GET /orders/:id` to check status. |
| `status` | string | `"processing"` — song generation has been started. |
| `estimated_completion_minutes` | number | Approximate time until completion (typically ~2 minutes). |

When the song is ready (or if generation fails), Melodia will POST to your `webhook_url` with the outcome. You can also poll `GET /api/v1/partner/orders/:id` until `status` is `completed` or `failed`.

---

## **3. Webhook: order completion**

When the personalized song is ready or generation fails, Melodia sends an HTTP **POST** request to the webhook URL you provided (per order or as your account default).

### **3.1 Webhook URL and signing**

* **URL**: The `webhook_url` in the order, or your vendor's default webhook URL.
* **Method**: POST.
* **Content-Type**: `application/json`.
* **Signing**: The body is signed with **HMAC-SHA256** using your **webhook secret**. Melodia sends the signature in a header so you can verify the request is from Melodia and has not been modified.

**Header:** `X-Melodia-Webhook-Signature`

**Verification (pseudocode):**

```text
signature     = HMAC-SHA256(webhook_secret, raw_request_body)
expected      = "sha256=" + hex(signature)
if request.headers["X-Melodia-Webhook-Signature"] != expected → reject
```

Melodia will provide your **webhook secret** when your partner account is set up. Never expose it in client-side code.

### **3.2 Webhook payload (standard envelope)**

All webhook requests use a common envelope. The `event` field indicates what happened; `data` contains event-specific fields.

**Completed order example:**

```json
{
  "event": "order.completed",
  "timestamp": "2026-03-03T12:00:00Z",
  "order_id": 101,
  "external_order_id": "order-789",
  "product_type": "customer_templated_song",
  "data": {
    "status": "completed",
    "playback_url": "https://melodia-songs.com/vendor/winni/suman-happy-birthday",
    "instance_slug": "suman-happy-birthday",
    "completed_at": "2026-03-03T12:02:15Z",
    "amount_charged": "99.00",
    "currency": "INR"
  }
}
```

**Failed order example:**

```json
{
  "event": "order.failed",
  "timestamp": "2026-03-03T12:00:00Z",
  "order_id": 101,
  "external_order_id": "order-789",
  "product_type": "customer_templated_song",
  "data": {
    "status": "failed",
    "error_message": "Song generation failed",
    "completed_at": "2026-03-03T12:01:00Z",
    "amount_charged": "0.00",
    "currency": "INR"
  }
}
```

### **3.3 Payload fields (templated song)**

| Field (envelope) | Type | Description |
| :---- | :---- | :---- |
| `event` | string | `order.completed` or `order.failed`. |
| `timestamp` | string | ISO 8601 UTC time when the webhook was sent. |
| `order_id` | number | Melodia order ID (matches the one returned from POST /orders). |
| `external_order_id` | string | Your reference ID from the order request. |
| `product_type` | string | `customer_templated_song`. |
| `data` | object | Event-specific payload (see below). |

**`data` for `order.completed`:**

| Field | Type | Description |
| :---- | :---- | :---- |
| `status` | string | `"completed"`. |
| `playback_url` | string | URL to the Melodia player page where the user can listen to and download the generated song. Permanent — does not expire. |
| `instance_slug` | string | Unique slug for this generated instance. |
| `completed_at` | string | ISO 8601 UTC completion time. |
| `amount_charged` | string | Amount charged for the order. |
| `currency` | string | Currency code (e.g. `INR`). |

**`data` for `order.failed`:**

| Field | Type | Description |
| :---- | :---- | :---- |
| `status` | string | `"failed"`. |
| `error_message` | string | Short description of the failure. |
| `completed_at` | string | When the failure was recorded. |
| `amount_charged` | string | `"0.00"` — no charge for failed orders. |
| `currency` | string | Currency code (e.g. `INR`). |

### **3.4 What you should do when receiving the webhook**

1. **Verify the signature** using your webhook secret and the raw request body. Reject requests with an invalid or missing signature (e.g. return 401).
2. **Parse the JSON** and read `event` and `data`.
3. **Match the order** in your system using `external_order_id` (and optionally `order_id`).
4. **For `order.completed`**: Store `playback_url`; show it to the user or embed it in your fulfillment flow. The user can listen to and download the song from the Melodia player page.
5. **For `order.failed`**: Update your order status, log `error_message`, and optionally notify the user or retry (by creating a new order with a new `external_order_id`).
6. **Respond with 2xx** (e.g. 200 OK) quickly so Melodia knows the webhook was received. Do heavy work asynchronously.

If your endpoint does not return 2xx within the timeout (see below), Melodia will retry according to its retry policy. You may receive the same event more than once; use `order_id` + `event` + `timestamp` (from the payload) to deduplicate.

### **3.5 Retries, replay, and ordering**

| Topic | Detail |
| :---- | :---- |
| **Number of retry attempts** | Melodia retries delivery **up to 5 times** if your endpoint does not return a 2xx response or does not respond in time. The first attempt is the initial delivery; up to 5 additional attempts follow. |
| **Retry interval / backoff** | Retries use a **staggered schedule**: approximately **30 seconds**, then **5 minutes**, then **30 minutes**, then **2 hours**, then **24 hours** after the previous attempt. This gives transient failures (e.g. brief downtime) time to recover while avoiding tight loops. |
| **Maximum retry duration** | From the time of the first failed (or timed-out) attempt, retries continue for up to about **24 hours**. After the final attempt, no further automatic retries are made for that event. |
| **Request timeout** | Each attempt (including the first) has a **10-second** timeout. If your server does not respond with 2xx within 10 seconds, the attempt is considered failed and the next retry is scheduled. Implement your handler to acknowledge quickly (e.g. return 200) and process the payload asynchronously. |
| **Manual replay** | If you missed an event (e.g. your endpoint was down for more than 24 hours), you can request **manual replay** of webhook events. Contact Melodia support with the `order_id`(s) and time range; we can re-send the completion payload for those orders. Replay is best-effort and subject to data retention. |
| **Event ordering** | **Ordering is not guaranteed. You may receive the same event more than once (e.g. retries, replays).** Use `order_id` + `event` + `timestamp` (from the payload) to deduplicate and to keep the latest status when the same event is delivered more than once. Process each event independently; do not rely on the order in which events arrive. |

---

## **Error handling**

Errors are returned with a consistent JSON shape:

```json
{
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template not found or inactive.",
    "request_id": "req_abc123"
  }
}
```

* **`code`**: Machine-readable code (e.g. for logging or conditional logic).
* **`message`**: Human-readable description; safe to show in UI.
* **`request_id`**: Correlation ID for support; include it when contacting Melodia.

**Common HTTP status codes:**

| Status | Meaning |
| :---- | :---- |
| 400 | Bad request (invalid body, missing required fields, template not found, etc.). |
| 401 | Unauthorized (missing or invalid/expired API key). |
| 404 | Resource not found (e.g. order ID does not exist or belongs to another vendor). |
| 409 | Conflict (e.g. invalid state for the operation). |
| 429 | Rate limit exceeded; check `Retry-After` header. |
| 500 | Internal server error; retry with backoff. |

---

## **Idempotency**

To avoid duplicate orders when retrying (e.g. after a timeout), send an **idempotency key** with order creation:

* **Header**: `Idempotency-Key: <unique_string>`
* **Or in body**: `"idempotency_key": "<unique_string>"`

The key should be unique per logical order (e.g. UUID or `external_order_id` + timestamp). If you send the same key again for the same vendor, Melodia returns the **existing** order (same `order_id`) instead of creating a new one. Use a **new** key when you intend to create a genuinely new order (e.g. after a previous order failed).

---

## **Quick reference**

| Action | Method | Endpoint | Purpose |
|---|---|---|---|
| List templates | GET | `/api/v1/partner/templates?occasion=<slug>&page=1&limit=20` | Fetch templated songs (paginated; lyrics, thumbnail, etc.) for an occasion. |
| Create order | POST | `/api/v1/partner/orders` | Submit an order (template + recipient name); get `order_id`. |
| Get order | GET | `/api/v1/partner/orders/{order_id}` | Fetch status and details of a single order. |
| Simulate order *(sandbox only)* | POST | `/api/v1/partner/orders/{order_id}/simulate` | Trigger `completed` or `failed` outcome during sandbox testing; fires webhook with real signature. |
| Webhook (Melodia → you) | POST | Your `webhook_url` | Receive `order.completed` or `order.failed` with `playback_url` and details. |

**Authentication:** `Authorization: Bearer <api_key>`

**Sandbox:** Same base URL; use a sandbox API key for testing (no real costs). See [Sandbox testing](#sandbox-testing).

**Webhook verification:** HMAC-SHA256 of body with your webhook secret; header `X-Melodia-Webhook-Signature`.
