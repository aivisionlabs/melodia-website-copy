# GEO Blog Cluster — Remaining Work Plan

**Status:** `[ ]` Pending
**Owner:** picked up in a fresh chat (self-contained — no prior context needed)
**Last updated:** 2026-06-17

## Background (what's already done)

The bidirectional internal-linking mesh is **built and shipped** (commit `3b39a2d5`):

- `src/lib/seo/occasion-blog-links.ts` is the single source of truth. `OCCASION_BLOG_LINKS`
  maps occasion → blog guides. A derived reverse index (`getBlogCluster()`) gives blog →
  occasion + sibling guides, so the two directions can never drift.
- `src/lib/seo/occasion-blog-links.ts` also exports `OCCASION_LABELS` for **all 25 occasion
  slugs**. Any cluster you populate lights up the blog→occasion back-link + "Related reads"
  automatically — **no template edit needed**.
- `src/app/(public)/blog/[slug]/page.tsx` renders the back-link card and cluster-driven
  "Related reads".
- `scripts/indexnow-backfill.ts` is committed; auto-covers static pages, occasions,
  languages, and every published blog.

**The mesh only activates for occasions whose `OCCASION_BLOG_LINKS` array is populated.**
The remaining work is seeding the missing blog batches and wiring their clusters.

---

## Remaining work

### Empty clusters (declared but `[]` in `OCCASION_BLOG_LINKS`)
These occasion slugs render NO related-guides today and produce no back-link target:

- `apology`
- `farewell`
- `motivational`
- `corporate-events`
- `festive-holiday`

### Missing clusters (occasion exists, has blogs, but no key in `OCCASION_BLOG_LINKS` at all)
Optional cleanup — these occasions have content but aren't wired into the mesh:

- `devotional-spiritual` (blogs exist via `seed-devotional-blogs*.ts`)
- `birthday` / `adult-birthday` (blogs exist via `seed-birthday-themes-blogs.ts`)
- `kids` (blogs exist via `seed-kids-birthday-blogs.ts`)
- `mothers-day` (blogs exist via `seed-mothers-day-blogs.ts`; note `update-mothers-day-blog-crosslinks.ts` already exists)
- `fathers-day`

---

## Plan (do in order)

### Phase 1 — Batch 5: Emotional cluster (apology, farewell, motivational) ✅ DONE (commit 95999f83)
- [x] Use `/create-blog` to write **9 posts** (3 per occasion), English. Follow the skill exactly
      (no `<h1>`, no hyphens in prose, CTA → `/pricing`, `published: true`, explicit `category`).
- [x] Seed script: `scripts/seed-emotional-cluster-blogs.ts` — mirrors `seed-social-cluster-blogs.ts`
      (`decode()` helper + idempotent slug-skip loop). Categories: `apology`, `farewell`, `motivational`.
- [x] Ran against prod (authorized) — **9 inserted, 0 skipped**.
- [x] Populated the three empty arrays in `src/lib/seo/occasion-blog-links.ts`.
- [x] `npm run build:check` passed; committed to `main`.
- [ ] **Remaining: push `main` (manual), then run IndexNow once `/blog/<slug>` is live, then GSC reindex.**

### Phase 2 — Batch 6: Work & festive cluster (corporate-events, festive-holiday) ✅ DONE
- [x] Wrote **6 posts** (3 per occasion), English. Categories: `corporate-events`, `festive-holiday`.
- [x] Seed script: `scripts/seed-work-festive-cluster-blogs.ts` (mirrors emotional-cluster seed).
- [x] Ran against prod (authorized) — **6 inserted, 0 skipped**.
- [x] Populated the two empty arrays in `OCCASION_BLOG_LINKS`.
- [x] `npm run build:check` passed.
- [ ] **Remaining: push `main` (manual), then run IndexNow once `/blog/<slug>` is live, then GSC reindex.**

### Phase 3 — Wire the missing clusters ✅ DONE
- [x] Added `OCCASION_BLOG_LINKS` entries for `devotional-spiritual`, `birthday`,
      `adult-birthday`, `kids`, `mothers-day`, `fathers-day` using **already-published**
      blog slugs (verified against a live DB query of 138 published posts — no invented slugs,
      no slug overlap across occasions so each blog back-links to exactly one occasion).
      3 guides per occasion. No seeding required (all blogs already live).
- [x] `npm run build:check` passed.
- [ ] **Remaining: push `main` (manual). No IndexNow needed — blog URLs already indexed; only
      the 6 occasion pages changed (added "Related reads"). Optionally GSC-reindex the 6
      occasion pages: devotional-spiritual, birthday, adult-birthday, kids, mothers-day, fathers-day.**

### Phase 4 — Ship & index (per batch, after deploy)
- [ ] `npm run build:check` → commit (`OCCASION_BLOG_LINKS` edits ship with the deploy).
- [ ] **Push is manual** (permission-gated in-session) — user pushes via `ggpush` or `! git push origin main`.
- [ ] **After the deploy is live** (confirm `/blog/<slug>` returns 200), run:
      `npx tsx -r dotenv/config scripts/indexnow-backfill.ts dotenv_config_path=.env.local`
      — notifies Bing/Copilot/ChatGPT Search. Idempotent. **Do NOT run before pages are live.**
- [ ] **Google does not use IndexNow** — manually request reindexing of the new/changed URLs
      in Google Search Console (occasion pages + new blog URLs).

---

## Guardrails (carry into the new chat)
- `.env.local` points at the **production** Supabase pooler — every seed/indexnow run hits prod.
  Get explicit per-batch authorization before running.
- Seeding only writes DB rows; `/blog/<slug>` pages don't exist until the next deploy. Never run
  IndexNow before the pages are live (you'd be telling engines to crawl 404s).
- `git push` is blocked in-session — hand the push back to the user.
- Verify any blog slug you reference in `OCCASION_BLOG_LINKS` actually exists as a published post
  before committing — a broken entry renders a dead link.
