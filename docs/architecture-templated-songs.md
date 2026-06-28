# Templated Songs — Architecture & Approach

## 1. High-level picture

Melodia has **two distinct song-creation paths**:

| Aspect | **Custom songs** (existing) | **Templated songs** (this feature) |
|--------|-----------------------------|-------------------------------------|
| **Entry** | Homepage form → lyrics → generate | Templates page → pick template → enter name → generate |
| **Data** | `song_requests` → `lyrics_drafts` → `user_songs` | `templated_songs` (templates) → `templated_song_instances` (outputs) |
| **Ownership** | User/anonymous via song_request | User/anonymous via instance (`user_id` / `anonymous_user_id`) |
| **Consumer surface** | My Songs, lyrics-display, song options | `/templated` (hub), `/templated/song/[slug]` (playback) |
| **Admin surface** | Song admin, dashboard, requests | Song admin → Templated songs (CRUD, process lyrics, create song) |

They share: **Suno** (audio), **personas** (voice), **auth** (user + anonymous cookie), **webhook** (task completion). They do **not** share the same tables or the same “My content” list (by design: different product flows).

---

## 2. Architectural principles

### 2.1 Clear boundaries

- **Templates** = admin-owned, consumer read-only. Stored in `templated_songs`; exposed via public `GET /api/templated-songs` (active only, ordered).
- **Instances** = consumer-owned outputs. Stored in `templated_song_instances`; scoped by identity for “my” list.

So:

- **Consumer** never creates or edits templates; they only list, preview, and “generate” (which creates an instance).
- **Admin** never “owns” instances; they create and manage templates and their lyrics/persona.

### 2.2 Single source of truth

- All template and instance state lives in the **database**.
- **APIs** are the only way the app reads/writes that state (no direct DB in client).
- **Webhook** updates instance (and template) when Suno completes; **polling** is a fallback for status/UI.

### 2.3 Same auth model as the rest of the app

- **Identity**: `getCurrentUser()` (logged-in) or `getAnonymousCookie()` (anonymous).
- **Generate** and **my-instances** use the same identity so that:
  - Every generated instance is tied to a user or anonymous session.
  - “My generated songs” is exactly: instances where `user_id` or `anonymous_user_id` matches current identity.

### 2.4 Public by slug, private by identity

- **Templates**: list is public (active only); no “private” templates for consumers.
- **Instance by slug**: **public** read (anyone with link can listen). Ownership is only used for “my list” and future features (e.g. delete, re-share).
- **My instances**: **private** — only the owning identity can see this list (via `GET /api/templated-songs/my-instances`).

---

## 3. Recommended approach to the solution

### Step 1: Define the data and API surface (done)

- **Tables**: `templated_songs`, `templated_song_instances` with clear ownership and status.
- **Consumer APIs**:
  - `GET /api/templated-songs` — list active templates.
  - `GET /api/templated-songs/my-instances` — list instances for current identity.
  - `GET /api/templated-songs/instances/[slug]` — get one instance (playback).
  - `GET /api/templated-songs/instances/[slug]/status` — lightweight status (e.g. for polling).
  - `POST /api/templated-songs/generate` — create instance and kick off Suno.

Admin APIs stay under `/api/admin/templated-songs/...`.

### Step 2: One consumer “hub” (done)

- **Single entry point**: `/templated`.
  - **Section 1 — My generated songs**: list from `my-instances`; each row links to `/templated/song/[slug]`; show status (e.g. In progress / Ready).
  - **Section 2 — Browse templates**: list from `GET /api/templated-songs`; preview + “Use template” → name → Generate.

This keeps “all templates” and “all my instances” in one place without fragmenting the UX.

### Step 3: Navigation and discovery

- **Header**: “Templates” → `/templated` (done).
- Optional: from homepage or “Library”, a small CTA like “Try a template” → `/templated` so both paths (custom vs template) are discoverable.

### Step 4: Consistency with the rest of the app

- **Loading / error**: same patterns as My Songs and other app pages (e.g. loading states, toast or inline errors).
- **Auth**: no extra login required for templates; anonymous users can generate and see “my instances” in the same session (cookie).
- **Rate limiting / cost**: keep `POST .../generate` behind the existing rate limit and monitor Suno usage.

### Step 5: Optional future unification (product decision)

- **Option A (current)**: “My Songs” = only custom flow; “Templates” page = templates + “My generated songs” from templates. Clear separation.
- **Option B**: “My Songs” (or a unified “My content”) could later show both custom songs and templated instances in one list, with filters or tabs. That would require a unified API or client merge and a clear UX for “type” (custom vs template).

Recommendation: **keep Option A** until there is a product need for a single “My content” view; the current split keeps the mental model simple and avoids overloading My Songs.

---

## 4. Summary: how to approach any change

1. **Boundary**: Is this about templates (admin) or instances (consumer)? Use the right table and API.
2. **Identity**: Use `getCurrentUser` + `getAnonymousCookie` for anything “my” or for create.
3. **APIs**: Add or extend under `/api/templated-songs/` (public) or `/api/admin/templated-songs/` (admin); use logging and existing middleware.
4. **UI**: Prefer one hub (`/templated`) for consumer template + instance UX; add sub-routes only when the hub would become too heavy (e.g. `/templated/my-songs` only if we want a dedicated URL for “my instances”).
5. **Docs**: Keep this doc and the project-context rule in sync when adding new routes or tables.

This gives a clear, scalable approach for the templated feature and keeps it aligned with the rest of Melodia’s architecture.
