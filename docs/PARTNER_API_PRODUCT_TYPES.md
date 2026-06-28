# Partner API — Product Types Reference

This document explains every product type available in the Partner API, how they differ, and when to use each one.

---

## The Two Axes

Every product type sits on two independent axes:

**Axis 1 — Who provides the song inputs?**
- **Partner-driven**: The partner provides all required details in the `POST /orders` API call. The customer never interacts with Melodia directly.
- **Customer-facing**: The partner gets back a `customer_link`. The customer opens that link on a Melodia-hosted co-branded page and fills in their own details.

**Axis 2 — What generation pipeline runs?**
- **Template-based**: A pre-authored template with `{{NAME}}` placeholder lyrics is used. The only input required is a recipient name. Suno is called directly with the template's persona and lyrics — no LLM lyrics generation step.
- **Fully custom**: The customer fills a rich story form (recipient details, occasion, languages, story/mood/music style). The LLM generates personalised lyrics, the customer reviews and optionally revises them, then Suno generates the song.

---

## Product Type Matrix

|                         | Template-based pipeline        | Fully custom pipeline     |
|-------------------------|-------------------------------|---------------------------|
| **Partner-driven**      | `customer_templated_song` (pass `template_id` + `recipient_name` in `POST /orders`) | _(not yet implemented)_   |
| **Customer-facing UI**  | `customer_templated_song`               | `customer_custom_song`        |

---

## `customer_templated_song` — Template-based (co-branded UI or partner-instant)

Use the same `product_type` for both journeys below.

### A) Customer picks template (co-branded page)

**Who provides inputs:** The customer (via co-branded UI), after the partner creates the order.
**Pipeline:** Template-based — Suno runs after the customer picks a template and enters a name.

### How it works

```
Partner                         Melodia                         Customer (browser)
──────                          ──────────────────────────────  ──────────────────
POST /api/v1/partner/orders  →  Generates UUID token
  product_type: customer_templated_song    Stores category_slug filter
  category_slug: "birthday"      Returns customer_link
                                                             ←  Opens /vendor/{slug}/order/{token}
                                                                Sees TemplateSongPicker
                                                                (filtered to "birthday" templates)
                                                                Picks a template + enters name
                             ←  POST /api/vendor-order/{token}/generate-template
                                 { templateId, recipientName }
                                 → status: song_generation_inprogress
                                 → calls generateTemplatedInstanceForIdentity (async)

                                 Suno webhook fires
                             →   instance + order → "completed"
                             ←   Outbound webhook: { playback_url, instance_slug, song_title }
                                                                Customer sees song player
                                                                (TemplatedSongVendorDisplay)
```

### Partner API request

```jsonc
{
  "product_type": "customer_templated_song",
  "external_order_id": "ts-ui-001",
  "category_slug": "birthday",      // optional — pre-filters templates shown to customer
  "customer_name": "Priya",         // optional — used as greeting on the page
  "package_slug": "package_1",      // optional — default "package_1"
  "webhook_url": "https://..."      // optional
}
```

### Partner API response

```jsonc
{
  "success": true,
  "order_id": 11,
  "status": "pending",
  "order_token": "550e8400-...",
  "customer_link": "https://melodia-songs.com/vendor/winni-sandbox/order/550e8400-...",
  "estimated_completion_minutes": 3
}
```

### Status flow

```
pending → song_generation_inprogress → completed
                                    → failed
```

### Key characteristics

- Partner only needs to know the category (e.g. "birthday") — the customer picks the specific template
- Suitable when the partner does not have the recipient's name at order creation time
- Customer sees a browsable carousel filtered by `category_slug`; if no `category_slug`, all templates are shown
- Customer cannot modify lyrics — they only pick template + name
- Completion webhook fields follow the same template-instance shape (`playback_url`, `instance_slug`, etc.)

### B) Partner supplies template in `POST /orders` (no picker)

**Who provides inputs:** The partner (`template_id` + `recipient_name` in the create call).
**Pipeline:** Same template-based Suno path — generation starts immediately (`song_generation_inprogress`), optional `customer_link` / `order_token` returned for tracking.

```jsonc
{
  "product_type": "customer_templated_song",
  "external_order_id": "ts-pos-001",
  "template_id": 42,
  "recipient_name": "Ananya"
}
```

---

## `customer_custom_song` — Customer-facing story form

**Who provides inputs:** The customer (via co-branded UI).
**Pipeline:** Fully custom — LLM generates personalised lyrics, then Suno generates the song.

### How it works

```
Partner                         Melodia                         Customer (browser)
──────                          ──────────────────────────────  ──────────────────
POST /api/v1/partner/orders  →  Generates UUID token
  product_type: customer_custom_song  Returns customer_link
  occasion: "birthday"
                                                             ←  Opens /vendor/{slug}/order/{token}
                                                                Fills story form:
                                                                  recipient details, occasion,
                                                                  languages, story, mood,
                                                                  music style
                             ←  POST /api/vendor-order/{token}/submit
                                 → Creates song_request
                                 → Triggers LLM lyrics generation (async)
                                 status: form_submitted → lyrics_generation_inprogress

                                 LLM completes
                                 status: lyrics_ready_for_review
                                                                Customer reviews lyrics
                                                                (edits manually or requests AI revision)
                             ←  POST /revise-lyrics (0–N times, limit per package)
                                 status: lyrics_generation_inprogress → lyrics_ready_for_review

                                                                Customer approves lyrics
                             ←  POST /approve-lyrics
                                 → LLM crafts audio-model lyrics
                                 → Triggers Suno (async)
                                 status: lyrics_approved → song_generation_inprogress

                                 Suno webhook fires
                             →   userSong + order → "completed"
                             ←   Outbound webhook: { song_slug, song_variants, customer_link }
                                                                Customer listens + downloads
                                                                (SongOptionsDisplay)
```

### Partner API request

```jsonc
{
  "product_type": "customer_custom_song",
  "external_order_id": "fcs-001",
  "customer_name": "Priya",          // optional — greeting on form page
  "occasion": "Adult Birthday",      // optional — pre-selects occasion in form
  "package_slug": "package_1",       // optional — controls AI revision limit (default 2)
  "webhook_url": "https://..."       // optional
}
```

### Partner API response

```jsonc
{
  "success": true,
  "order_id": 12,
  "status": "pending",
  "order_token": "...",
  "customer_link": "https://melodia-songs.com/vendor/winni-sandbox/order/...",
  "estimated_completion_minutes": 10
}
```

### Status flow

```
pending
  → form_submitted
  → lyrics_generation_inprogress
  → lyrics_ready_for_review  ←──────────────────────────────┐
      → lyrics_revision_requested                            │
      → lyrics_generation_inprogress ────────────────────────┘
  → lyrics_approved
  → song_generation_inprogress
  → completed
  → failed (at any stage)
```

### Key characteristics

- Most personalised output — the song is built around the customer's story
- Customer actively participates: fills form, reviews/edits lyrics, approves
- Longest flow: ~10 minutes end-to-end
- AI revision limit controlled by `package.allowed_lyrics_edits` (default 2)
- Completion webhook includes `song_variants` (audio URLs for all Suno variants)

---

## Side-by-side comparison

| | `customer_templated_song` (picker) | `customer_templated_song` (instant API) | `customer_custom_song` |
|---|---|---|---|
| **Input source** | Customer (UI) | Partner (`template_id` + `recipient_name`) | Customer (UI) |
| **Pipeline** | Template-based | Template-based | LLM + Suno |
| **Customer page** | `/vendor/{slug}/order/{token}` | Optional link for tracking | `/vendor/{slug}/order/{token}` |
| **Partner must supply** | `category_slug` (optional) | `template_id` + `recipient_name` | `occasion` (optional) |
| **Customer supplies** | template choice + recipient name | — (unless using link) | recipient details, story, languages, mood, music style |
| **LLM lyrics step** | No | No | Yes |
| **Customer reviews lyrics** | No | No | Yes (with AI revision option) |
| **Estimated time** | ~3 min | ~3 min | ~10 min |
| **Song variants** | 2 (Suno default) | 2 (Suno default) | 2 (Suno default) |
| **Completion webhook** | `playback_url`, `instance_slug`, `song_title` | same | `song_slug`, `song_variants`, `customer_link` |
| **Polling endpoint** | `GET /api/vendor-order/{token}` | `GET /api/vendor-order/{token}` | `GET /api/vendor-order/{token}` |

---

## Choosing the right product type

| Scenario | Recommended type |
|---|---|
| Partner knows exactly which template and whose name to use | `customer_templated_song` with `template_id` + `recipient_name` on create |
| Partner wants to offer template browsing; customer picks the template | `customer_templated_song` |
| Partner wants a fully personalised song built from the customer's story | `customer_custom_song` |
| Partner wants speed with some customer personalisation | `customer_templated_song` |
| Partner wants maximum personalisation and doesn't mind a longer flow | `customer_custom_song` |

---

## Shared infrastructure

All product types use the same:
- `partnerApiOrdersTable` — single table, `product_type` column differentiates rows
- `partner_api_orders.order_token` — UUID secret that backs the customer link
- `deliverPartnerWebhook()` — HMAC-SHA256 signed outbound webhook on completion/failure
- `withRateLimit` middleware on all vendor-order endpoints
- `resolveVendorOrder()` — shared helper that validates `order_token` and product type before any endpoint handler runs

---

## What does NOT exist yet

A "partner-driven fully custom song" — where the partner provides the story/details in the API call and Melodia generates lyrics + song without any customer interaction. This would complete the 2×2 matrix. If needed, it would follow the same `PRODUCT_CREATORS` registry pattern with a new product type key.
