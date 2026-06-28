# API Routes

## Song Creation Flow
1. `POST /api/create-song-request` → record + email
2. LLM → `lyrics_drafts`; optional review → `lyrics_draft_reviews`
3. `POST /api/refine-lyrics` or `POST /api/update-lyrics`
4. `POST /api/approve-lyrics` → `model_ready_lyrics`, triggers Suno
5. `GET /api/song-status/[songId]` → polls Suno; complete → variants + email

**Failure path:** always call `failPartnerOrderIfLinked` + `maybeNotifyOpsUserSongGenerationFailed`

## Middleware
`withRateLimit` (Upstash) · `withApiLogger` · `createApiTimer` / `createContextLogger`

Demo mode: `isDemoTaskId()` in `src/lib/demo-mode.ts`
