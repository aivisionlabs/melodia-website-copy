# API Routes — Tier 2 Reference

Load this file when working on API routes, middleware, or key product flows.

## API Route Pattern

```typescript
export const runtime = 'nodejs';

async function handler(req: NextRequest) { ... }
export { handler as GET, handler as POST };
```

## Middleware Wrappers

Available in `src/lib/api/` and `src/lib/logger/`:
- `withRateLimit` — Upstash Redis-backed rate limiting
- `withApiLogger` — request/response logging (`src/lib/logger/api-middleware.ts`)
- `createApiTimer` — performance timing (`src/lib/logger/api-middleware.ts`)
- `createContextLogger` — scoped logger with request context

## API Route Directory Map (`src/app/api/`)

42 route directories as of April 2026:

| Directory | Method(s) | Purpose |
|-----------|-----------|---------|
| `admin/` | various | Admin-only routes (see below) |
| `approve-lyrics/` | POST | Approve a lyrics draft and trigger song generation |
| `auth/` | GET/POST | NextAuth.js auth handlers |
| `blog/` | GET/POST | Blog post CRUD |
| `categories/` | GET | List song categories |
| `change-requests/` | GET/POST | Customer change requests for songs |
| `christmas-audio/` | GET | Christmas special audio feature |
| `contact/` | POST | Contact form submission + email |
| `create-song-request/` | POST | Create song request record, trigger lyrics gen |
| `cron/cleanup-logs/` | GET | Cron: prune `application_logs` older than `LOG_RETENTION_DAYS` |
| `debug/logs/` | GET | Dev-only log inspection endpoint |
| `demo/` | POST | Demo webhook simulation for local development |
| `download-audio/` | GET | Proxy audio download with range support |
| `fetch-lyrics/` | GET | Fetch lyrics for a song request |
| `generate-lyrics/` | POST | LLM lyrics generation |
| `generate-song/` | POST | Trigger Suno song generation from an approved draft |
| `internal/rj-show/generate-script/` | POST | Internal: generate RJ show script |
| `internal/rj-show/process-segments/` | POST | Internal: process RJ show audio segments |
| `library-song/` | GET | Fetch a single library song |
| `logs/` | POST | Client-side log ingestion |
| `lyrics-versions/` | GET | List lyrics draft versions for a song request |
| `my-songs/` | GET | List user's song requests + generated songs |
| `payments/` | GET/POST | Payment initiation and verification |
| `persona-templates/` | GET | List available personas |
| `process-custom-lyrics/` | POST | Process user-provided raw lyrics into model-ready format |
| `refine-lyrics/` | POST | AI-based lyrics refinement |
| `regenerate-music-style/` | POST | Re-run music style inference |
| `song-feedback/` | POST | Submit song feedback (reasons, rating) |
| `song-lightweight/` | GET | Lightweight song data (no variants) |
| `song-likes/` | POST | Record a song like |
| `song-lyrics/` | GET | Fetch lyrics for a song slug |
| `song-plays/` | POST | Record a song play event |
| `song-requests/` | GET | List song requests (admin context) |
| `song-status/[songId]/` | GET | Poll Suno generation status; updates DB on completion or failure |
| `suno-webhook/` | POST | Suno callback on task completion (user songs, templated instances, library songs) |
| `suno-webhook/templated-songs/instances/` | POST | Suno callback specifically for templated song instances |
| `templated-songs/` | GET/POST | List active templates; generate instances |
| `templated-songs/instances/[slug]/` | GET | Single instance (playback) |
| `templated-songs/instances/[slug]/status/` | GET | Lightweight status for polling |
| `track-utm/` | POST | Record UTM/partner visit |
| `update-lyrics/` | POST | Update lyrics text on a draft |
| `update-music-style/` | POST | Update music style on a draft |
| `users/` | GET/POST | User account management |
| `v1/partner/` | various | Partner (B2B) API — see Partner API section |
| `vendor-order/[orderToken]/` | GET | Co-branded order state polling |
| `vendor-order/[orderToken]/submit/` | POST | Customer form submission + lyrics gen |
| `vendor-order/[orderToken]/revise-lyrics/` | POST | AI lyrics revision |
| `vendor-order/[orderToken]/approve-lyrics/` | POST | Approve lyrics, trigger Suno |
| `vendor-order/[orderToken]/generate-template/` | POST | Generate templated song instance |
| `vendor-order/[orderToken]/rj-show/approve/` | POST | Approve RJ show script |
| `razorpay-webhook/` | POST | Razorpay payment webhook |
| `cashfree-webhook/` | POST | Cashfree payment webhook |

### Admin routes (`src/app/api/admin/`)

| Subroute | Purpose |
|----------|---------|
| `songs/` | Song management |
| `song-requests/` | Song request management |
| `user-songs/[id]/lyrics/` | Edit user song lyrics (admin) |
| `user-songs/[id]/retry/` | Retry failed user song generation (admin) |
| `templated-songs/` | Templated song CRUD and processing |
| `personas/` | Persona management |
| `partners/` | UTM partner management |
| `partner-api/` | B2B vendor management and simulation |
| `rj-shows/` | RJ show management and invocation |
| `blog/` | Blog post management |
| `analytics/` | Payment and funnel analytics |

---

## Song Creation Flow (Custom)

1. `POST /api/create-song-request` → creates `song_requests` record, sends confirmation email (if email provided)
2. LLM generates lyrics via `generateLyrics()` → stored in `lyrics_drafts`; optional AI review into `lyrics_draft_reviews` (enabled via `LYRICS_REVIEW_ENABLED=true`)
3. User reviews/edits at `/generate-lyrics/[songRequestId]`; edits call `POST /api/refine-lyrics` or `POST /api/update-lyrics`
4. `POST /api/approve-lyrics` → crafts `model_ready_lyrics` via LLM, triggers Suno
5. `GET /api/song-status/[songId]` → polls Suno status; on completion persists variants + sends song-ready email; on failure calls `failPartnerOrderIfLinked()` and `maybeNotifyOpsUserSongGenerationFailed()`
6. Suno also fires `POST /api/suno-webhook` → same completion path (webhook-driven alternative to polling)

## Song Status Polling (`/api/song-status/[songId]`)

- Demo mode (`isDemoTaskId(taskId)`): returns progressive mock variants based on elapsed time since creation; does not call Suno API
- Non-demo completed/failed: reads from DB, normalizes `song_variants` to array, returns stored state
- Non-demo in-progress: calls `SunoAPIFactory.getAPI().getRecordInfo(taskId)`; maps result to `completed` / `failed` / `processing`; on completion persists variants and sends song-ready notification email; on failure calls `failPartnerOrderIfLinked()` + `maybeNotifyOpsUserSongGenerationFailed()`

## Suno Webhook (`/api/suno-webhook`)

Handles four `callbackType` values from Suno: `text`, `first`, `complete`, `error`.

On `complete`:
1. Finds `user_song` by `metadata.sunoTaskId` (or `songs` table by `suno_task_id`)
2. Merges new variant data with stored variants (preserving existing URLs)
3. On user song completion → sends song-ready email, then calls `completePartnerOrderIfLinked()`
4. On templated song instance completion → marks instance completed, fires partner webhook

### `failPartnerOrderIfLinked` (`src/lib/partner-api/fail-partner-order-if-linked.ts`)

Called by both `song-status` poll and `suno-webhook` on failure. Checks `song_request.partner_api_order_id`; if set, marks the partner order `failed` and fires the outbound failure webhook to the vendor.

### `maybeNotifyOpsUserSongGenerationFailed` (`src/lib/song-generation-failure-alerts.ts`)

Deduped internal ops alert (email) fired on user song or templated instance generation failure. Skipped in demo mode or when `EMAIL_DEMO=true`. Prevents duplicate alerts when both polling and webhook fire.

---

## Auth Flow

- Client-side state: `useAuth()` hook from `src/contexts/AuthContext.tsx`
- Anonymous users: cookie-based identity via `getAnonymousCookie()` (`src/lib/auth/cookies.ts`)
- Anonymous sessions merged into registered accounts on login
- Email verification required before login (OTP codes via `email_verification_codes` table)
- NextAuth config: `src/lib/auth/config.ts`; JWT strategy; Google OAuth + email/password providers

---

## Service Layer (`src/lib/services/`)

| File | Purpose |
|------|---------|
| `llm/llm-lyrics-operation.ts` | Orchestrates lyrics generation (context analysis → lyrics → review → transliteration) |
| `llm/llm-music-style-operation.ts` | Music style inference |
| `llm/llm-audio-model-lyrics-crafter.ts` | Converts `customer_lyrics` to `model_ready_lyrics` at approval time |
| `llm/prompts/` | Prompt builders, one file per concern |
| `song-generation-service.ts` | Top-level Suno song generation (slug generation, DB records, Suno call) |
| `email/email-factory.ts` | Email provider factory (Resend) |
| `rj-show-service.ts` | RJ show orchestration |

---

## RJ Show Feature

AI radio show assembled from segments. Lifecycle: `script_pending → script_generating → script_ready → script_approved → producing → completed`.

Key files:
- `src/lib/services/rj-show-service.ts` — orchestration (generateScript, approveScript, produceShow)
- `src/lib/youtube/download.ts` + `rapidapi-client.ts` — YouTube audio download via RapidAPI
- `src/lib/elevenlabs/tts.ts` — ElevenLabs text-to-speech for RJ narration segments
- `src/lib/audio-processing/convert.ts` + `stitch.ts` — ffmpeg-based audio processing
- `src/lib/storage/upload.ts` — Cloudflare R2 storage for processed audio
- DB tables: `rj_shows`, `rj_show_segments`, `rj_voice_profiles`

---

## Templated Songs Flow

Consumer API:
- `GET /api/templated-songs` — list active templates
- `GET /api/templated-songs/my-instances` — list current identity's instances
- `GET /api/templated-songs/instances/[slug]` — playback data
- `GET /api/templated-songs/instances/[slug]/status` — lightweight poll
- `POST /api/templated-songs/generate` — create instance, trigger Suno

Suno completion routed via `POST /api/suno-webhook/templated-songs/instances` (or the main webhook).

---

## Partner (B2B) API (`/api/v1/partner/`)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/partner/templates` | List templates by occasion (paginated) |
| `POST /api/v1/partner/orders` | Create order (templated song or custom song product types) |
| `GET /api/v1/partner/orders/[id]` | Get single order status |
| `POST /api/v1/partner/orders/[id]/simulate` | Sandbox: simulate completion or failure |
| `POST /api/v1/partner/orders/[id]/retry` | Retry a failed order |
| `POST /api/v1/partner/orders/[id]/approve-script` | Approve RJ show script (partner-side) |

Auth: `Authorization: Bearer <api_key>` (key resolved from `partner_api_credentials` table via hashed lookup).

---

## Payment Webhooks

- Razorpay: `src/app/api/razorpay-webhook/`
- Cashfree: `src/app/api/cashfree-webhook/`
- Suno: `src/app/api/suno-webhook/`

Payment provider selected by `PAYMENT_PROVIDER` env var via `PaymentFactory` (`src/lib/payments/factory.ts`).

---

## Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `GET /api/cron/cleanup-logs` | Daily | Delete `application_logs` rows older than `LOG_RETENTION_DAYS` (default 30 days). Requires `Authorization: Bearer {CRON_SECRET}` header. |

---

## Internal Routes

Protected by `INTERNAL_API_SECRET` header:
- `POST /api/internal/rj-show/generate-script` — trigger async script generation
- `POST /api/internal/rj-show/process-segments` — trigger async segment processing

---

## Demo Mode

When `DEMO_MODE=true`:
- `isDemoTaskId(taskId)` in `src/lib/demo-mode.ts` returns true for task IDs with the demo prefix
- `song-status` returns progressive mock variants without calling Suno API
- `approve-lyrics` in vendor flow simulates completion in-process after 3s delay
- Outbound emails and WhatsApp notifications suppressed (also suppressed when `EMAIL_DEMO=true`)
