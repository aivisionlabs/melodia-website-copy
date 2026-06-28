# DB Schema & Query Patterns — Tier 2 Reference

Load this file when working on database schema, migrations, or query logic.

## Schema Location

- Schema definition: `src/lib/db/schema.ts`
- Migrations: `drizzle/migrations/`
- Query modules: `src/lib/db/queries/` (organized by select/insert/update)

## Query Pattern

Use Drizzle ORM — avoid raw SQL unless absolutely necessary.

```typescript
import { db } from '@/lib/db';
import { songsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const song = await db.query.songsTable.findFirst({
  where: eq(songsTable.id, songId),
});
```

---

## Two-Phase Lyrics Architecture (migration 0066)

Lyrics are stored in two columns within `lyrics_drafts` to separate user-facing display from AI model input:

- `customer_lyrics` — user-facing display version (romanized/transliterated; what the user sees and edits)
- `model_ready_lyrics` — audio-model-ready format (native script, proper structure; what gets sent to Suno)

`model_ready_lyrics` is populated **only at approval time** via `craftAudioModelLyrics()`. This separation prevents user edits from corrupting the generation-ready format.

Separately, `lyrics_draft_reviews` (one row per draft) stores the compact AI review report when `LYRICS_REVIEW_ENABLED=true`.

---

## Complete Table Reference

### Core song tables

| Table | Variable | Purpose |
|-------|----------|---------|
| `songs` | `songsTable` | Admin/library songs — curated, publicly visible |
| `song_categories` | `songCategoriesTable` | Many-to-many: songs ↔ categories |
| `song_request_songs` | `songRequestSongsTable` | Many-to-many: song_requests ↔ songs (reference songs) |
| `categories` | `categoriesTable` | Canonical occasion categories with display order |
| `song_requests` | `songRequestsTable` | User song creation requests (all flows) |
| `user_songs` | `userSongsTable` | Generated songs owned by users (custom flow output) |
| `lyrics_drafts` | `lyricsDraftsTable` | Lyrics versions per request; versioned, one approved |
| `lyrics_draft_reviews` | `lyricsDraftReviewsTable` | AI review report per draft (compact, one-to-one with draft) |
| `user_song_variant_reviews` | `userSongVariantReviewsTable` | Per-variant feedback from users (append-only) |
| `song_feedback_reasons` | `songFeedbackReasonsTable` | Canonical feedback reason codes (dynamic) |
| `change_requests` | `changeRequestsTable` | Customer change requests for songs (admin flow) |

### LLM audit

| Table | Variable | Purpose |
|-------|----------|---------|
| `llm_pipeline_step_outputs` | `llmPipelineStepOutputsTable` | Per-step LLM output audit trail per song request |
| `application_logs` | `applicationLogsTable` | Structured server logs (7–30 day retention, pruned by cron) |

### Personas

| Table | Variable | Purpose |
|-------|----------|---------|
| `personas` | `personasTable` | Suno voice personas (style references) |
| `persona_associations` | `personaAssociationsTable` | Links personas to library songs or user songs |

### Templated songs

| Table | Variable | Purpose |
|-------|----------|---------|
| `templated_songs` | `templatedSongsTable` | Admin-created templates with `{{NAME}}` placeholders |
| `templated_song_instances` | `templatedSongInstancesTable` | Consumer-generated instances from templates |
| `templated_song_categories` | `templatedSongCategoriesTable` | Many-to-many: templated songs ↔ categories |
| `templated_instance_feedback_events` | `templatedInstanceFeedbackEventsTable` | Append-only feedback events for templated instances |

### Partner / B2B API

| Table | Variable | Purpose |
|-------|----------|---------|
| `partner_api_vendors` | `partnerApiVendorsTable` | B2B vendor accounts (API keys, webhook secrets, sandbox flag) |
| `partner_api_credentials` | `partnerApiCredentialsTable` | Hashed API keys per vendor |
| `partner_api_orders` | `partnerApiOrdersTable` | B2B orders (templated song, custom song) |
| `partner_api_product_prices` | `partnerApiProductPricesTable` | Per-vendor per-product pricing |
| `partner_webhook_deliveries` | `partnerWebhookDeliveriesTable` | Outbound webhook delivery log with retry tracking |

### Auth / User

| Table | Variable | Purpose |
|-------|----------|---------|
| `users` | `usersTable` | Registered user accounts |
| `anonymous_users` | `anonymousUsersTable` | Anonymous session records |
| `account` | `accountTable` | OAuth accounts (NextAuth DrizzleAdapter) |
| `session` | `sessionTable` | Database sessions (NextAuth DrizzleAdapter) |
| `verificationToken` | `verificationTokenTable` | Email verification tokens (NextAuth) |
| `email_verification_codes` | `emailVerificationCodesTable` | OTP codes for email verification |
| `admin_users` | `adminUsersTable` | Admin portal user accounts |

### Payments

| Table | Variable | Purpose |
|-------|----------|---------|
| `payments` | `paymentsTable` | Payment records (Razorpay / Cashfree) |
| `payment_webhooks` | `paymentWebhooksTable` | Incoming payment webhook logs |
| `packages` | `packagesTable` | Pricing packages with feature flags |

### Partners (UTM / affiliate)

| Table | Variable | Purpose |
|-------|----------|---------|
| `partners` | `partnersTable` | UTM/affiliate partners (cake shops, influencers) |
| `partner_visits` | `partnerVisitsTable` | Visit tracking with UTM data |

### Rate limiting / security

| Table | Variable | Purpose |
|-------|----------|---------|
| `rate_limit_violations` | `rateLimitViolationsTable` | Violation log per IP/endpoint |
| `blocked_ips` | `blockedIpsTable` | IP block list (temporary/permanent) |
| `rate_limit_analytics` | `rateLimitAnalyticsTable` | Daily rate limit analytics |

### Content

| Table | Variable | Purpose |
|-------|----------|---------|
| `blog_posts` | `blogPostsTable` | Blog posts with HTML content (SEO) |
| `audit_log_events` | `auditLogEventsTable` | Audit trail for entity changes |

---

## Key Column Notes

### `song_requests`

| Column | Notes |
|--------|-------|
| `user_id` / `anonymous_user_id` | Exactly one set; determines ownership |
| `partner_api_order_id` | Non-null → payment handled by partner, suppresses Melodia payment requirement |
| `request_source` | `'vendor_partner'` for vendor flow; `'similar_style'` for "use this style" |
| `lyrics_edits_used` | Incremented on each AI revision; checked against `packages.allowed_lyrics_edits` |
| `selected_lyrics_draft_id` | FK to `lyrics_drafts`; set on approval |
| `lyrics_input_mode` | `'story'` (default) or `'lyrics'` (user-provided lyrics) |

### `user_songs`

| Column | Notes |
|--------|-------|
| `song_variants` | JSONB array; each variant has `id`, `audioUrl`, `streamAudioUrl`, `imageUrl`, `variantStatus` |
| `approved_lyrics_id` | FK to `lyrics_drafts` |
| `service_provider` | `'SU'` = Suno |
| `status` | `'processing'` → `'completed'` or `'failed'` |

### `lyrics_drafts`

| Column | Notes |
|--------|-------|
| `customer_lyrics` | Display lyrics (romanized); user edits this |
| `model_ready_lyrics` | Audio-model format; set only at approval time via LLM |
| `version` | 1 = initial; 2, 3, … = each AI revision |
| `status` | `'draft'` → `'approved'` (or `'archived'`) |
| `custom_lyrics` | `true` when user provided their own lyrics |

### `templated_song_instances`

| Column | Notes |
|--------|-------|
| `partner_api_order_id` | Set for B2B-sourced instances |
| `singalong_lyrics_enabled` | Controls singalong lyrics display |
| `song_variants` | Same structure as `user_songs.song_variants` |

### `partner_api_orders`

| Column | Notes |
|--------|-------|
| `order_token` | UUID; used as customer-facing URL token (no auth needed, token is the secret) |
| `product_type` | `'customer_templated_song'` \| `'customer_custom_song'` \| `'rj_show'` |
| `status` | See enum below |

### `partner_api_orders` status enum

```
pending → form_submitted → lyrics_generation_inprogress → lyrics_ready_for_review
→ lyrics_revision_requested → lyrics_approved → song_generation_inprogress → completed
                                                                            → failed (any stage)
processing   ← legacy / RJ show coarse state
```

### `rj_shows` status enum

```
script_pending → script_generating → script_ready → script_approved → producing → completed
                                                                                 → failed
```

---

## Migration Workflow

```bash
npm run db:generate  # After changing schema.ts — generates SQL migration file
npm run db:migrate   # Apply pending migrations to DB
npm run db:check     # Validate migration files are consistent
npm run db:push      # Bypass migration files — push schema directly (dev only)
```

Always generate a migration file for production schema changes (do not use `db:push` in prod).

Some foreign key constraints are defined in SQL migrations rather than the schema (e.g. `song_requests.selected_lyrics_draft_id`, `song_requests.partner_api_order_id`) to avoid circular references in Drizzle.
