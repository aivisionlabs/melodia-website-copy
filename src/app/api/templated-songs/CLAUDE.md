# Templated Songs (`/api/templated-songs/`)

GET (list) · GET `/my-instances` · POST `/generate` · GET `/instances/[slug]` · GET `/instances/[slug]/status`

On failure: `failPartnerOrderIfLinked()` + `maybeNotifyOpsUserSongGenerationFailed()`
