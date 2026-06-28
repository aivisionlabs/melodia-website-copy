# Suno Webhook
`POST /api/suno-webhook` · `POST /api/suno-webhook/templated-songs/instances`

callbackType: `text` | `first` | `complete` | `error`

On `complete`: find `user_song` by `metadata.sunoTaskId` → merge variants → email → `completePartnerOrderIfLinked()`
On failure: `failPartnerOrderIfLinked()` + `maybeNotifyOpsUserSongGenerationFailed()`
