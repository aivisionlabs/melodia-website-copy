# Melodia — Product Details

## Product Overview

**Melodia** is India’s personalized song creation platform. Users create custom songs for loved ones using AI-generated lyrics (Google Gemini) and studio-style music (Suno API). Songs can be in Hindi, Tamil, Telugu, and 20+ languages, for occasions like weddings, birthdays, anniversaries, and more.

**Tagline:** Create personalized songs for any occasion.

**Website:** https://www.melodia-songs.com

---

## Core Value Proposition

- **Personalized songs** — Lyrics and music tailored to recipient, occasion, mood, and story.
- **Multi-language** — Hindi, Tamil, Telugu, English, and many more.
- **Occasion-led** — Wedding (Sangeet, Haldi, Mehendi), birthday, anniversary, friendship, apology, corporate, farewell, lullaby, devotional, and others.
- **Two creation paths** — **Custom songs** (full flow: story → lyrics → song options → music) and **Templated songs** (pick a template → enter name → generate).
- **Flexible delivery** — Instant (self-serve packages) or within 24 hours (expert Maestro package).

---

## User Types

| Type | Description |
|------|-------------|
| **Anonymous** | Can create songs and pay without signing up; identity via cookie/session. |
| **Registered** | Account (email/password); content and payments tied to profile. |
| **Admin** | Song admin portal: manage songs, templated songs, personas, partners, blog, etc. |
| **Partner / vendor (B2B)** | Integrates via the Partner API; receives customer links and outbound webhooks; billing stays on the vendor’s side (no Melodia checkout on the co-branded journey). |

Anonymous and registered users share the same consumer flows; registration is optional until the user chooses to create an account.

---

## Product Flows

### 1. Custom Song Creation (Primary Flow)

End-to-end journey:

1. **Homepage** → “Start Creating Your Song” → **Pricing**
2. **Pricing** → Choose package (Starter / Creator / Maestro) → **Create song request**
3. **Create song request** → Fill form (recipient, occasion, languages, mood, story, contact) → Submit
4. **Generate lyrics** → AI generates lyrics (Gemini); user can **Edit with AI** (within package limits) and switch **lyrics versions**
5. **Song options** → Choose music/style options for generation (`/song-options/[songId]`) before audio is sent to Suno
6. **Generate song** → Suno creates music; user sees status (e.g. “View progress” then “Listen”)
7. **My Songs** → List of requests/songs; **Listen**, **View progress**, **Retry** (if failed), **Variant selection** when multiple versions exist
8. **Payment** — Can be required before or after generation depending on product/flow (Razorpay/Cashfree)

Optional: **Use this style** — From library/song page, user can start a custom song “in the style of” an existing song (uses persona/source song).

### 2. Templated Songs Flow

Simpler path for users who want a ready-made song with minimal input:

1. **Templates hub** (`/templated`) — “My generated songs” (list) + “Browse templates”
2. **Browse templates** → Pick template → Enter name (and any required fields) → **Generate**
3. **My generated songs** → Status (In progress / Ready) → Open song → **Play** at `/templated/song/[slug]`

Templates are admin-created and read-only for consumers; each “Generate” creates an **instance** owned by the user or anonymous session.

### 3. Partner / Vendor (B2B) Flow

Vendors embed Melodia’s personalised songs in their own checkout or CRM. Melodia exposes a **Partner API** (authenticated orders, optional per-order webhooks) and a **co-branded customer link** (no Melodia payment UI on that journey).

Typical shape:

1. Vendor calls **POST** Partner API to create an order (product types include custom songs and templated-song variants — see partner docs).
2. Vendor shares **`customer_link`** with their end customer.
3. Customer opens **`/vendor/{vendorSlug}/order/{orderToken}`** and completes the song journey (form, lyrics, options, etc., depending on product type).
4. On completion, Melodia notifies the vendor via **outbound webhook** (e.g. playback URL when successful).

**When music generation fails** (Suno error or terminal failure), linked **partner orders** are marked **failed**, vendors receive a **failed** payload on the outbound webhook, and **internal ops** can get a one-time email alert so failed consumer or partner-linked songs can be retried from the admin **User Generated Songs** tools where applicable.

See [VENDOR_FLOW.md](./VENDOR_FLOW.md), [PARTNER_API.md](./PARTNER_API.md), and [PARTNER_API_PRODUCT_TYPES.md](./PARTNER_API_PRODUCT_TYPES.md).

### 4. Library & Occasions

- **Library** — Browse existing songs (e.g. samples, showcase); optional “Use this style” to start a custom song.
- **Occasions** — SEO/content pages (e.g. birthday, anniversary, wedding, Sangeet, Haldi, Mehendi) that funnel users into creation or pricing.

---

## Pricing & Packages

| Package | Price (INR) | Highlights | Delivery |
|--------|-------------|------------|----------|
| **Starter** | ₹299 | AI lyrics, 2 song variants | Instant |
| **Creator** | ₹599 | Smart lyrics, 4 “magic” edits, song template selection | Instant |
| **Maestro** | ₹999 | Expert-crafted lyrics, unlimited iterations, best pronunciation | Within 24 hours |

- All packages include download and sharing.
- Song template selection is not allowed in Starter.
- Maestro includes expert review and refinement for pronunciation and quality.

---

## Key Features (Summary)

| Feature | Description |
|--------|-------------|
| **AI lyrics** | Gemini (Vertex AI) generates lyrics from recipient, occasion, mood, story; supports refinements and versioning. |
| **Music generation** | Suno API turns approved lyrics into full songs; multiple variants per song. |
| **Lyrics versioning** | Multiple drafts per request; user can switch versions and approve one for song generation. |
| **Song variants** | Suno returns multiple variants; user selects preferred one; selection stored. |
| **Similar-style / “Use this style”** | Start from a library song; system uses persona/source song for style. |
| **Templated songs** | Pre-made templates; user fills name (and any fields); instant generation path. |
| **Payment** | Razorpay/Cashfree; supports both anonymous and registered users. |
| **My Songs** | Single list of user’s content (custom flow); status badges and actions (Listen, View progress, Retry, Variant selection). |
| **Search & filters** | On My Songs (e.g. by status) for easier discovery. |
| **Partner / Vendor API** | B2B orders, idempotent creation, vendor-scoped lists/detail, co-branded customer URLs, signed outbound webhooks. |
| **Generation failure handling** | User-facing **Retry**; partner orders transition to **failed** with vendor webhook; deduped internal ops alerts for investigation and admin retry where supported. |
| **Analytics & tracking** | Funnel events (pricing view, package select), CTA clicks, player events; partner/UTM tracking where applicable. |

---

## Technical Snapshot

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS.
- **Backend:** Next.js API routes; no direct DB access from client.
- **Database:** PostgreSQL (e.g. Supabase) with Drizzle ORM.
- **AI:** Google Vertex AI (Gemini) for lyrics; Suno API for music.
- **Auth:** NextAuth for registered users; anonymous cookie for guests.
- **Payments:** Razorpay / Cashfree (see payment docs for details).

---

## Main User-Facing Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, how it works, testimonials, CTA to pricing. |
| `/pricing` | Package selection and continuation to create-song-request. |
| `/create-song-request` | Song request form (recipient, occasion, languages, mood, story, contact). |
| `/generate-lyrics/[songRequestId]` | Lyrics generation, edit with AI, versions; continues to song options / generation. |
| `/song-options/[songId]` | Music and generation options before Suno is invoked. |
| `/my-songs` | User’s songs and requests; status, Listen, View progress, Retry, variants. |
| `/my-songs/[slug]` | Single song page — playback, lyrics, variant selection. |
| `/templated` | Templated hub — my generated songs + browse templates. |
| `/templated/song/[slug]` | Templated song instance playback. |
| `/vendor/[vendorSlug]/order/[orderToken]` | Co-branded partner order journey (custom or templated product types per order). |
| `/library` | Browse library songs; “Use this style” entry. |
| `/song/[songId]` | Public song page (e.g. library/sample). |
| `/occasions/*` | Occasion-specific landing pages. |
| `/about`, `/faq`, `/contact`, `/blog`, `/privacy`, `/terms`, `/refund` | Info and legal. |
| `/payment` | Payment flow (post-selection of package/request). |
| `/login`, `/signup`, `/profile`, `/forgot-password`, etc. | Auth and profile. |

---

## Status Flows

- **Song request:** `pending` → `processing` → `completed`
- **Lyrics:** `pending` → `draft` → `approved`
- **User song:** `draft` → `processing` → `ready` or `failed`
- **Partner API order (high level):** progresses through states such as `pending` → `processing` → `completed`, or **`failed`** when generation cannot complete (vendor notified via webhook).

---

## Out of Scope (Current Product)

- No in-app social sharing (beyond link/share).
- No subscription model in this document (one-time packages only).
- No collaborative editing or multi-user ownership of a single song.

---

## Related Documentation

- [api-routes.md](./api-routes.md) — API route map, flows, service layer, and middleware.
- [schema.md](./schema.md) — Complete DB schema and query patterns.
- [architecture-templated-songs.md](./architecture-templated-songs.md) — Templated songs design and boundaries.
- [VENDOR_FLOW.md](./VENDOR_FLOW.md) — Co-branded vendor journey (custom song product type).
- [vendor-order-statuses-by-product.md](./vendor-order-statuses-by-product.md) — Order status state machines by product type.
- [PARTNER_API.md](./PARTNER_API.md) — B2B Partner API contract (templated songs).
- [PARTNER_API_PRODUCT_TYPES.md](./PARTNER_API_PRODUCT_TYPES.md) — All supported product types.
- [SUNO_INTEGRATION.md](./SUNO_INTEGRATION.md) — Suno integration and states.
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) — Complete env var reference.

---

*This document describes the Melodia product as implemented in the codebase. For implementation details and API contracts, refer to the linked docs.*
