# Vendor Co-Branded Song Flow

**Product type:** `customer_custom_song`

Vendors (e.g. Winni) integrate with Melodia to offer personalised songs as part of their own customer experience. The vendor creates an order via the Partner API, shares the unique customer link with their customer, and Melodia handles the entire song creation journey on a co-branded page — without any payment UI (the vendor handles billing).

---

## Table of Contents

1. [High-level flow](#1-high-level-flow)
2. [Status state machine](#2-status-state-machine)
3. [API reference](#3-api-reference)
4. [Database schema additions](#4-database-schema-additions)
5. [Limits and business rules](#5-limits-and-business-rules)
6. [Relationship to core flow](#6-relationship-to-core-flow)
7. [Demo mode](#7-demo-mode)
8. [File map](#8-file-map)

---

## 1. High-level flow

```
Vendor                      Partner API                  Customer (browser)
──────                      ───────────                  ──────────────────
POST /api/v1/partner/orders ──────────────────────────→  Creates order (status: pending)
   product_type: customer_custom_song                        Returns customer_link + order_token

Shares customer_link ─────────────────────────────────→  Customer opens link
                                                          /vendor/{slug}/order/{token}

                                                          Fills song details form
                            POST /api/vendor-order/{token}/submit
                            Creates song_request, triggers lyrics generation (async)
                            status: form_submitted → lyrics_generation_inprogress
                                                          (polls every 5 s)

                            status: lyrics_ready_for_review
                                                          Reviews lyrics, optionally requests
                                                          AI revision or edits manually
                            POST /api/vendor-order/{token}/revise-lyrics (0–N times)
                            status: lyrics_ready_for_review → lyrics_generation_inprogress → lyrics_ready_for_review

                                                          Approves lyrics
                            POST /api/vendor-order/{token}/approve-lyrics
                            Crafts audio-model lyrics, triggers Suno (async)
                            status: lyrics_approved → song_generation_inprogress

                            Suno webhook fires ──────────→ status: completed
                                                          Customer listens / downloads

Receives completion webhook ←────────────────────────────  (outbound webhook fired)
```

---

## 2. Status state machine

```
pending
  │  Customer submits form
  ▼
form_submitted
  │  Async lyrics generation starts
  ▼
lyrics_generation_inprogress
  │  LLM completes
  ▼
lyrics_ready_for_review ◄─────────────────────────────────────────────┐
  │                                                                     │
  ├─ Customer requests AI revision ──► lyrics_revision_requested        │
  │                                          │ Async refinement         │
  │                                          ▼                          │
  │                                   lyrics_generation_inprogress ─────┘
  │                                   (loops back to lyrics_ready_for_review)
  │
  └─ Customer approves
        ▼
    lyrics_approved
        │  Async Suno call
        ▼
    song_generation_inprogress
        │  Suno webhook
        ▼
    completed

[Any stage] ──► failed  (terminal, on unrecoverable error)
```

### Status → UI mapping (customer page)

| Status | UI shown | Polling active |
|---|---|---|
| `pending` | Song details form | No |
| `form_submitted` | Loading — "Crafting your lyrics…" | Yes |
| `lyrics_generation_inprogress` | Loading — "Crafting your lyrics…" | Yes |
| `lyrics_ready_for_review` | Lyrics review panel + version tabs | No |
| `lyrics_revision_requested` | Loading — "Refining your lyrics…" | Yes |
| `lyrics_approved` | Loading — "Generating your song…" | Yes |
| `song_generation_inprogress` | Loading — "Generating your song…" | Yes |
| `completed` | Song player + download button | No |
| `failed` | Error message | No |

---

## 3. API reference

### 3.1 Create a vendor order (Partner API)

```
POST /api/v1/partner/orders
Authorization: X-API-Key {vendor_api_key}
```

**Request body:**
```jsonc
{
  "product_type": "customer_custom_song",
  "external_order_id": "your-internal-id",      // required, unique per vendor
  "customer_name": "Priya",                      // optional — pre-fills form greeting
  "occasion": "Adult Birthday",                  // optional — pre-selects occasion in form
  "package_slug": "package_1",                   // optional, default "package_1"
  "webhook_url": "https://your-domain/webhook",  // optional
  "metadata": {}                                 // optional passthrough
}
```

**Response:**
```jsonc
{
  "success": true,
  "order_id": 42,
  "status": "pending",
  "order_token": "550e8400-e29b-41d4-a716-446655440000",
  "customer_link": "https://melodia-songs.com/vendor/winni-sandbox/order/550e8400...",
  "estimated_completion_minutes": 10
}
```

Share `customer_link` with the customer. No other action is required until the completion webhook fires.

---

### 3.2 Completion webhook (outbound)

Delivered when the order reaches `completed` or `failed`.

```jsonc
// completed
{
  "event": "order.completed",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "order_id": 42,
  "external_order_id": "your-internal-id",
  "product_type": "customer_custom_song",
  "data": {
    "status": "completed",
    "customer_link": "https://melodia-songs.com/vendor/winni-sandbox/order/550e8400...",
    "song_slug": "priya-birthday-song-abc123",
    "song_variants": [
      {
        "id": "suno-variant-id",
        "audioUrl": "https://...",
        "streamAudioUrl": "https://...",
        "imageUrl": "https://...",
        "duration": 187,
        "modelName": "V5",
        "variantStatus": "DOWNLOAD_READY"
      }
    ],
    "completed_at": "2025-01-01T12:05:00.000Z",
    "amount_charged": "299.00",
    "currency": "INR"
  }
}
```

Webhook signatures use HMAC-SHA256 (`X-Melodia-Signature` header). The `webhook_secret` for the vendor row is used as the signing key.

---

### 3.3 Order state polling (internal — used by the customer page)

```
GET /api/vendor-order/{orderToken}
```

No authentication required — the token is the secret. Rate-limited.

**Response shape:**
```jsonc
{
  "vendor": { "name": "Winni", "slug": "winni-sandbox", "logo_url": "https://..." },
  "order": {
    "id": 42,
    "status": "lyrics_ready_for_review",
    "customer_name": "Priya",
    "package_slug": "package_1",
    "song_request_id": 101,
    "metadata": {}
  },
  "song_request": {
    "id": 101,
    "status": "processing",
    "occasion": "Adult Birthday",
    "languages": "Hindi + English",
    "lyrics_edits_used": 0
  },
  "lyrics_drafts": [             // all non-archived drafts, newest first
    {
      "id": 55,
      "status": "draft",
      "version": 1,
      "customer_lyrics": "Happy birthday Priya...\n",
      "song_title": "A Birthday Melody",
      "music_style": "Upbeat, Bollywood pop"
    }
  ],
  "user_song": null              // populated once Suno completes
}
```

---

### 3.4 Submit song details form

```
POST /api/vendor-order/{orderToken}/submit
```

**Request body:**
```jsonc
{
  "recipientDetails": "Priya, my best friend",   // required, min 2 chars
  "occasion": "Adult Birthday",
  "languages": "Hindi + English",                // or "From lyrics" if inputMode=lyrics
  "lyricsInputMode": "story",                    // "story" | "lyrics"
  "story": "We met in college 10 years ago...",  // if mode=story
  "inputLyrics": "...",                          // if mode=lyrics (sets custom_lyrics=true on draft)
  "mood": ["Joyful", "Nostalgic"],
  "languagePreferences": "70% Hindi, 30% English",
  "advancedMusicChips": ["Bollywood"],
  "musicStyleNotes": "Include a dhol beat",
  "sourceSongId": null                           // reference song ID, or null
}
```

**Guards:** Order must be `status=pending` with no `song_request_id` yet (409 if already submitted).

**Side effects (async):** Lyrics generation is triggered immediately after the response is sent. The order progresses through `form_submitted → lyrics_generation_inprogress → lyrics_ready_for_review` without any further customer action.

---

### 3.5 Request AI revision

```
POST /api/vendor-order/{orderToken}/revise-lyrics
```

**Request body:**
```jsonc
{
  "refineText": "Make it shorter and add a reference to her dog Max"
}
```

**Guards:**
- Order status must be `lyrics_ready_for_review` or `lyrics_revision_requested`
- `song_request.lyrics_edits_used < package.allowed_lyrics_edits` (default limit: 2) — returns 429 if exceeded

**Side effects (async):** Creates a new `lyrics_drafts` row with `version = prev + 1`. Previous drafts are preserved and remain selectable via the version tab UI.

---

### 3.6 Approve lyrics and trigger song generation

```
POST /api/vendor-order/{orderToken}/approve-lyrics
```

**Request body:**
```jsonc
{
  "lyricsDraftId": 55,            // ID of the draft to approve (any version)
  "customerLyrics": "..."         // optional — manually edited lyrics from customer
}
```

**Guards:** Order status must be exactly `lyrics_ready_for_review`.

**Side effects:**
1. Marks the chosen draft `approved`, sets `song_request.selected_lyrics_draft_id`
2. If `customerLyrics` is provided, overwrites `customer_lyrics` and clears `model_ready_lyrics` to force re-derivation
3. Async: crafts `model_ready_lyrics` via LLM, then triggers Suno song generation
4. Order eventually reaches `completed` via the Suno webhook

---

## 4. Database schema additions

### `partnerApiVendorsTable`

| Column | Type | Notes |
|---|---|---|
| `logo_url` | `text` (nullable) | URL for the co-branded header logo |

### `partnerApiOrdersTable`

| Column | Type | Notes |
|---|---|---|
| `order_token` | `text UNIQUE` (nullable) | UUID generated at order creation; the customer URL secret |
| `customer_name` | `text` (nullable) | Pre-fill from partner; shown as greeting on the form page |
| `package_slug` | `text` (nullable) | Determines lyrics edit limit; default `package_1` |
| `song_request_id` | `integer → songRequestsTable` (nullable) | Set after customer submits form |

**Status enum additions** (full current set):

```
pending · form_submitted · lyrics_generation_inprogress · lyrics_ready_for_review
lyrics_revision_requested · lyrics_approved · song_generation_inprogress · completed · failed
```

### `songRequestsTable`

| Column | Type | Notes |
|---|---|---|
| `partner_api_order_id` | `integer → partnerApiOrdersTable` (nullable) | Marks this request as pre-paid by a partner; suppresses payment requirement |
| `request_source` | `text` | Set to `vendor_partner` for all vendor-flow requests |
| `lyrics_edits_used` | `integer` DEFAULT 0 | Incremented on each AI revision |

### `lyricsDraftsTable` (unchanged schema, vendor-relevant columns)

| Column | Type | Notes |
|---|---|---|
| `version` | `integer` | 1 = initial generation; 2, 3, … = each AI revision |
| `customer_lyrics` | `text` | Display lyrics; may be manually edited by customer |
| `model_ready_lyrics` | `text` (nullable) | Audio-model-ready format; derived at approval time |
| `lyrics_edit_prompt` | `text` (nullable) | Customer's revision instruction text |
| `custom_lyrics` | `boolean` | `true` when customer provided their own lyrics (`lyricsInputMode=lyrics`) |
| `status` | `text` | `draft` → `approved` (or `archived`) |

---

## 5. Limits and business rules

### Lyrics AI edit limit

- Controlled by `packagesTable.allowed_lyrics_edits` (resolved from `order.package_slug`)
- Default: **2 revisions** (`package_1`)
- Tracked in `songRequestsTable.lyrics_edits_used`
- Enforced at the revise-lyrics endpoint; returns HTTP 429 with message `"Lyrics revision limit reached (N revisions allowed)"` if exceeded
- Version tabs remain visible; customer can still approve any previous version

### Order token security

- Generated as `crypto.randomUUID()` — 128-bit entropy, URL-safe
- No expiry — the link remains valid indefinitely (useful if customer opens it days later)
- Grants access to exactly one order; cannot be used to access other orders

### Idempotency

- Submitting the form twice returns 409 Conflict (checked via `order.status !== 'pending'` and `order.song_request_id !== null`)
- Approving lyrics twice is safe — the second call is rejected because the order is no longer in `lyrics_ready_for_review`

### Rate limiting

| Endpoint | Rate limit key |
|---|---|
| GET state polling | `vendor.order.state` |
| POST submit | `vendor.order.submit` |
| POST revise-lyrics | `vendor.order.revise_lyrics` |
| POST approve-lyrics | `vendor.order.approve_lyrics` |

---

## 6. Relationship to core flow

The vendor flow deliberately **reuses the core service layer** but keeps vendor-specific routing and orchestration isolated. No core routes are modified.

### What the vendor flow calls directly

| Core service | Used where | Purpose |
|---|---|---|
| `generateLyrics(formData)` | `submit/route.ts` | Same LLM call as the main flow |
| `buildSongFormData(request)` | `submit/route.ts` | Same form-data transformer |
| `refineLyrics(...)` | `revise-lyrics/route.ts` | Same revision LLM call |
| `craftAudioModelLyrics(...)` | `approve-lyrics/route.ts` | Same audio-model prep |
| `generateSong(lyricsDraftId, songRequestId)` | `approve-lyrics/route.ts` | Same Suno call |
| `deliverPartnerWebhook(...)` | `approve-lyrics/route.ts` + `suno-webhook/route.ts` | Same outbound webhook infra |

### What the vendor flow does NOT touch

- `src/app/api/create-song-request/route.ts` — not called
- `src/app/api/generate-lyrics/route.ts` — not called
- `src/app/api/payments/*` — not called (no payment step)
- `src/app/(app)/generate-lyrics/[songRequestId]/page.tsx` — not rendered
- `src/app/(app)/song-options/[songId]/page.tsx` — not rendered

### UI component reuse

| Component | Used in vendor flow | Notes |
|---|---|---|
| `CreatePageOccasionSection` / `CreatePageOccasionSheet` | Yes | Identical occasion picker |
| `CreatePageRecipientSection` | Yes | Identical recipient input |
| `CreatePageStoryLyricsSection` | Yes | Identical story + lyrics toggle |
| `CreatePageLanguageSection` / `CreatePageLanguageSheet` | Yes | Identical language selector |
| `CreatePageMusicSection` | Yes | Identical moods + template carousel |
| `SongOptionsDisplay` | Yes | Song player — rendered with `renderHeader` / `disableNavigation` / `allowRejection={false}` props to suppress Melodia-specific chrome |
| `VariantSwitcher` | Via `SongOptionsDisplay` | Navigation side-effect disabled via `disableNavigation` |
| `SongCreationLoadingScreen` | Yes | Same loading animations |
| `LyricsReviewPanel` | Yes | Vendor-specific component; callback-based, no payment logic |

### How the Suno webhook connects back

The core `suno-webhook` handler calls `completePartnerOrderIfLinked(songRequestId, ...)` after every successful song completion. This function:

1. Checks `songRequest.partner_api_order_id` — if null, does nothing (not a vendor order)
2. Updates `partnerApiOrdersTable.status = 'completed'`
3. Fires the outbound completion webhook to the vendor's `webhook_url`

This is the **only place where the core webhook knows about vendor orders**. The check is additive — it does not alter the core completion logic.

### Separation of concerns summary

| Layer | Vendor code location | Core code called |
|---|---|---|
| Customer URL / page | `src/app/vendor/[vendorSlug]/order/[orderToken]/` | — |
| Order state API | `src/app/api/vendor-order/[orderToken]/route.ts` | — |
| Form submission + lyrics gen | `src/app/api/vendor-order/[orderToken]/submit/route.ts` | `generateLyrics`, `buildSongFormData` |
| Lyrics revision | `src/app/api/vendor-order/[orderToken]/revise-lyrics/route.ts` | `refineLyrics` |
| Approve + song gen | `src/app/api/vendor-order/[orderToken]/approve-lyrics/route.ts` | `craftAudioModelLyrics`, `generateSong` |
| Order creation | `src/lib/partner-api/order-creators.ts` (customer_custom_song entry) | — |
| Completion hook | `src/app/api/suno-webhook/route.ts` → `completePartnerOrderIfLinked` | `deliverPartnerWebhook` |
| Shared resolver | `src/lib/vendor-order/resolve.ts` | DB query only |

---

## 7. Demo mode

When `DEMO_MODE=true` environment variable is set, Suno never fires real webhooks. The `approve-lyrics` route handles this by simulating completion directly in-process after a 3-second delay:

1. Sets `userSongsTable.song_variants = DEMO_SONG_VARIANTS` and `status = 'completed'`
2. Sets `songRequestsTable.status = 'completed'`
3. Sets `partnerApiOrdersTable.status = 'completed'`

`DEMO_SONG_VARIANTS` is defined in `src/lib/demo-mode.ts` and contains real Melodia-hosted audio URLs suitable for testing.

The customer page's polling detects `status = 'completed'` and transitions to the song player automatically.

---

## 8. File map

```
src/
├── app/
│   ├── vendor/
│   │   └── [vendorSlug]/order/[orderToken]/
│   │       ├── page.tsx                    Server component — resolves vendor + order, SSR
│   │       └── order-flow-client.tsx       Client state machine — polls, renders steps
│   │
│   └── api/
│       ├── v1/partner/orders/
│       │   └── route.ts                    Partner API — create + list orders
│       └── vendor-order/[orderToken]/
│           ├── route.ts                    GET — order state polling
│           ├── submit/route.ts             POST — form submission + lyrics gen
│           ├── revise-lyrics/route.ts      POST — AI lyrics revision
│           └── approve-lyrics/route.ts     POST — approval + song generation
│
├── components/
│   ├── lyrics/
│   │   └── LyricsReviewPanel.tsx           Lyrics review UI — editable, AI edit bar, version-aware
│   ├── SongOptionsDisplay.tsx              Song player — extended with renderHeader / disableNavigation / allowRejection
│   └── VariantSwitcher.tsx                 Song variant tabs — navigation controlled by parent
│
└── lib/
    ├── vendor-order/
    │   └── resolve.ts                      Shared resolver: orderToken → { order, vendor }
    ├── partner-api/
    │   ├── order-creators.ts               customer_custom_song product creator registered here
    │   └── outbound-webhook.ts             Delivery + signing for vendor webhooks
    └── demo-mode.ts                        DEMO_SONG_VARIANTS + isDemoModeEnabled()
```

### Core files touched by vendor flow integration

| File | What was added |
|---|---|
| `src/lib/db/schema.ts` | `logo_url` on vendors; `order_token`, `customer_name`, `package_slug`, `song_request_id` on orders; expanded status enum; `partner_api_order_id` + `lyrics_edits_used` on song requests |
| `src/app/api/suno-webhook/route.ts` | `completePartnerOrderIfLinked()` called after song completion |
| `src/components/SongOptionsDisplay.tsx` | `renderHeader`, `disableNavigation`, `allowRejection` props added |
| `src/components/VariantSwitcher.tsx` | Removed internal `router.push` — parent owns navigation |
