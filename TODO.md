# Melodia — Project TODO

Project-level task tracking. Not runtime code. Add new items at the top of the relevant section.

---

## Legend
- `[ ]` Pending · `[~]` In Progress · `[x]` Done · `[!]` Blocked

---

## Backlog

### [SEO] GEO Blog Cluster — remaining batches & wiring
**Status:** `[ ]` Pending
**Priority:** Medium
**Plan file:** `docs/GEO_BLOG_CLUSTER_REMAINING_PLAN.md`

Bidirectional blog ⇄ occasion linking mesh is built & shipped (commit `3b39a2d5`). Remaining:
- [done] **Phase 1 — Batch 5:** seed 9 emotional-cluster blogs (apology, farewell, motivational) + populate their empty `OCCASION_BLOG_LINKS` arrays
- [ ] **Phase 2 — Batch 6:** seed 6 work/festive blogs (corporate-events, festive-holiday) + populate clusters
- [ ] **Phase 3 (optional):** wire missing clusters for occasions that have content but no `OCCASION_BLOG_LINKS` key (devotional-spiritual, birthday, adult-birthday, kids, mothers-day, fathers-day)
- [ ] **Phase 4 (per batch):** build:check → commit → user pushes → after deploy run `indexnow-backfill.ts` → manual Google Search Console reindex

Guardrails: `.env.local` = prod (per-batch auth required); never run IndexNow before pages are live; push is manual.

---

### [FEAT] Partner Tracking Dashboard
**Status:** `[ ]` Pending
**Priority:** Medium
**Scope:** Large (~19 files, 8 implementation phases)
**Plan file:** `.claude/plans/soft-gliding-koala.md`

**What it is:**
A self-serve web portal where each B2B vendor/partner can log in and track their orders, customer notification history (WhatsApp, email), and outbound webhook deliveries. Partners currently interact via API keys only — no web UI exists.

**Phases (do in order):**
- [ ] **Phase 1 — DB schema:** Add `partner_portal_users` + `partner_order_notifications` tables + 3 enums to `src/lib/db/schema.ts`, run `db:generate` + `db:migrate`
- [ ] **Phase 2 — NextAuth extension:** Add `partner-credentials` CredentialsProvider to `src/lib/auth/config.ts`; extend `src/types/next-auth.d.ts` with `vendorId` + `userType`
- [ ] **Phase 3 — Auth middleware:** New `src/lib/auth/partner-portal-middleware.ts` with `withPartnerPortalAuth` HOF
- [ ] **Phase 4 — Admin: create partner users:** `POST /api/admin/partner-api/vendors/[vendorId]/portal-users` + `vendor-portal-users-section.tsx` in admin portal
- [ ] **Phase 5 — Routes + layout:** Login at `/partner-portal/login` (top-level, unguarded); dashboard + order detail under `(partner-portal)` route group with guarded layout
- [ ] **Phase 6 — API routes:** `GET /api/partner-portal/orders` + `GET /api/partner-portal/orders/[orderId]` (hard vendor isolation via JWT `vendorId`)
- [ ] **Phase 7 — UI:** `OrderStatusBadge`, `OrderTimeline`, `NotificationsTable` components; dashboard + order detail pages
- [ ] **Phase 8 — Notification tracking hooks:** `src/lib/vendor-order/notification-logger.ts`; hook into `sendCustomerWhatsApp()` + `sendSongReadyEmail()` + RJ show script-ready

**Key constraints:**
- All DB queries must filter by `vendor_id = JWT.vendorId` — no client-provided vendor scope
- bcrypt work factor 12; `noindex` headers for `/partner-portal/*`; Upstash rate-limiting on login
- No changes to `EmailProvider` interface — logging is a fire-and-forget side effect only

---

## In Progress

_(nothing currently)_

---

## Done

_(nothing yet)_
