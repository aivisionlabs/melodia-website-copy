# Internal Routes (`/api/internal/`)
Auth: `INTERNAL_API_SECRET` header.

POST `/rj-show/generate-script` · POST `/rj-show/process-segments`

RJ Show lifecycle: `script_pending → script_generating → script_ready → script_approved → producing → completed`

Key files: `rj-show-service.ts` · `youtube/download.ts` + `rapidapi-client.ts` · `elevenlabs/tts.ts` · `audio-processing/convert.ts` + `stitch.ts` · `storage/upload.ts`
DB: `rj_shows`, `rj_show_segments`, `rj_voice_profiles`
