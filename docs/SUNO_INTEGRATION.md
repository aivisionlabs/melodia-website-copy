# Suno API Integration

Melodia uses a third-party Suno API wrapper (`sunoapi.org`) — **not** the official suno.ai API.

Base URL: `SUNO_API_URL` (default `https://api.sunoapi.org/api/v1`)
Auth: `Authorization: Bearer SUNO_API_KEY`

---

## Song Generation Flow

### 1. Trigger (`song-generation-service.ts`)

`src/lib/services/song-generation-service.ts` → `generateSong(lyricsDraftId, songRequestId)`

1. Loads `lyrics_drafts` row for the approved draft; calls `craftAudioModelLyrics()` if `model_ready_lyrics` is null
2. Creates a `user_songs` row (`status = 'processing'`)
3. Calls `POST /api/v1/generate` with:
   ```json
   {
     "customMode": true,
     "prompt": "<model_ready_lyrics>",
     "style": "<music_style>",
     "title": "<song_title>",
     "model": "V5_5",
     "callBackUrl": "<NEXT_PUBLIC_BASE_URL>/api/suno-webhook"
   }
   ```
4. Stores the returned `taskId` in `user_songs.metadata.sunoTaskId`

For templated instances, `callBackUrl` is `/api/suno-webhook/templated-songs/instances`.

### 2. Status Polling (`/api/v1/generate/record-info?taskId=<id>`)

Used by `GET /api/song-status/[songId]` and `GET /api/templated-songs/instances/[slug]/status`.

Returns:
```json
{
  "code": 200,
  "data": {
    "taskId": "...",
    "status": "SUCCESS",
    "errorCode": null,
    "errorMessage": null,
    "response": {
      "sunoData": [
        {
          "id": "...",
          "audio_url": "...",
          "stream_audio_url": "...",
          "source_audio_url": "...",
          "source_stream_audio_url": "...",
          "image_url": "...",
          "source_image_url": "...",
          "title": "...",
          "model_name": "V5",
          "duration": 187.5
        }
      ]
    }
  }
}
```

### 3. Completion Webhook

Suno POSTs to the `callBackUrl` when generation progresses.

Callback payload shape:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "callbackType": "complete",
    "task_id": "...",
    "data": [ { "id": "...", "audio_url": "...", ... } ]
  }
}
```

`callbackType` values:
- `text` — lyrics/metadata ready (no audio yet)
- `first` — first audio variant stream-ready
- `complete` — all variants ready with download URLs
- `error` — generation failed

---

## Variant Storage Format

Variants are stored in `user_songs.song_variants` and `templated_song_instances.song_variants` as a JSONB array.

Each variant (normalized by `normalizeSunoVariantToStored()`):
```typescript
{
  id: string;            // Suno variant ID
  title: string;
  imageUrl: string;
  sourceImageUrl: string;
  audioUrl?: string;         // download URL (set on DOWNLOAD_READY)
  sourceAudioUrl?: string;
  streamAudioUrl?: string;   // streaming URL (set on STREAM_READY)
  sourceStreamAudioUrl?: string;
  duration?: number;
  modelName?: string;
  variantStatus: 'PENDING' | 'STREAM_READY' | 'DOWNLOAD_READY';
}
```

`mergeVariantsPreservingUrls()` (in `src/lib/utils/variant-utils.ts`) merges new variant data with stored data without overwriting existing valid URLs — handles partial updates across polling calls and callbacks.

---

## Suno Task Statuses

Raw statuses from Suno API, normalized via `normalizeSunoStatus()` in `src/lib/suno-api.ts`:

| Suno status | Normalized |
|-------------|-----------|
| `SUCCESS`, `complete` | `completed` |
| `CREATE_TASK_FAILED`, `GENERATE_AUDIO_FAILED`, `CALLBACK_EXCEPTION`, `SENSITIVE_WORD_ERROR`, `error` | `failed` |
| Anything else (`PENDING`, `TEXT_SUCCESS`, `FIRST_SUCCESS`, etc.) | `processing` |

`errorCode` being non-null also maps to `failed` regardless of `status`.

---

## Webhook Handlers

### Main webhook (`/api/suno-webhook`)

Handles callbacks for:
- `user_songs` — found by `metadata.sunoTaskId`
- `songs` (admin/library songs) — found by `suno_task_id` column

On `complete` for a user song:
1. Merges variants with `mergeVariantsPreservingUrls()`
2. Sets `user_songs.status = 'completed'`
3. Sets `song_requests.status = 'completed'`
4. Sends song-ready notification email
5. Calls `completePartnerOrderIfLinked(songRequestId, ...)` → marks partner order completed + fires outbound webhook
6. On `error`: calls `failPartnerOrderIfLinked()` + `maybeNotifyOpsUserSongGenerationFailed()`

### Templated instances webhook (`/api/suno-webhook/templated-songs/instances`)

Handles callbacks for `templated_song_instances` only (by `suno_task_id`).

On `complete`:
1. Merges variants
2. Sets `templated_song_instances.status = 'completed'`
3. Calls `completeTemplatedOrderAndNotify()` → marks partner order completed + sends WhatsApp/email if applicable
4. On `error`: calls `maybeNotifyOpsTemplatedInstanceFailed()`

---

## Demo Mode

`DEMO_MODE=true` uses demo task IDs (prefixed with `DEMO_TASK_ID_PREFIX` from `src/lib/demo-mode.ts`).

- `isDemoTaskId(taskId)` → true for demo tasks
- Status poll and vendor-order `GET` return progressive mock variants based on elapsed time since song creation (no real Suno API call)
- Vendor flow `approve-lyrics` completes the order in-process after a 3-second delay
- `DEMO_SONG_VARIANTS` in `src/lib/demo-mode.ts` contains real Melodia-hosted audio for testing

---

## Failure Handling

On failure (either via polling or webhook):

1. `user_songs.status = 'failed'` (or `templated_song_instances.status = 'failed'`)
2. `failPartnerOrderIfLinked(songRequestId, errorMessage, logger)` — if linked to a partner order, marks it failed and fires the vendor's failure webhook
3. `maybeNotifyOpsUserSongGenerationFailed(...)` / `maybeNotifyOpsTemplatedInstanceFailed(...)` — sends a one-time internal alert email to `info@melodia-songs.com`; deduped via `metadata.ops_failure_notified_at`

Admin retry: `POST /api/admin/user-songs/[id]/retry` re-triggers generation for a failed user song.

---

## SunoAPIFactory

`src/lib/suno-api.ts` exports `SunoAPIFactory.getAPI()` which returns the configured Suno API client. All callers should use the factory rather than constructing the client directly.

```typescript
import { SunoAPIFactory, normalizeSunoStatus } from '@/lib/suno-api';

const sunoAPI = SunoAPIFactory.getAPI();
const recordInfo = await sunoAPI.getRecordInfo(taskId);
```

Environment: `SUNO_API_URL` + `SUNO_API_KEY` (also accepts `SUNO_API_TOKEN`).
