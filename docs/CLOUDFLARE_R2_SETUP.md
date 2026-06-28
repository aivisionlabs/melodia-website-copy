# Cloudflare R2 Storage Setup

## Buckets

| Bucket | Domain | Purpose |
|---|---|---|
| `melodia-media` | `media.melodia-songs.com` | Song audio, cover images (library, customer, templated) |
| `melodia-songs-partner-media` | `partner-media.melodia-songs.com` | RJ show audio, voice profiles |

## R2 Folder Layout

```
melodia-media/
├── library-songs/{songId}/
│   ├── primary.mp3              ← songs.song_url
│   ├── variant-1.mp3            ← songs.song_url_variant_1
│   ├── v0.mp3  v1.mp3  …        ← songs.suno_variants[idx].audioUrl
│   └── v0-cover.jpg  v1-cover.jpg  …
├── customer-songs/{userSongId}/
│   ├── v0.mp3  v1.mp3  …        ← user_songs.song_variants[idx].audioUrl
│   └── v0-cover.jpg  v1-cover.jpg  …
├── templated-songs/{templateId}/
│   └── v0.mp3  v1.mp3  …        ← templated_songs.song_variants[idx].audioUrl
├── templated-instances/{instanceId}/
│   └── v0.mp3  v1.mp3  …        ← templated_song_instances.song_variants[idx].audioUrl
│
melodia-songs-partner-media/
├── rj-shows/{showId}/segments/
├── rj-shows/{showId}/final/show.mp3
└── voice-profiles/{voiceKey}/{languageSlug}.mp3
```

## Environment Variables

```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 s3-compatible access key>    # hex format, from R2 → Manage R2 API Tokens
R2_SECRET_ACCESS_KEY=<r2 s3-compatible secret>    # hex format, only shown once on creation
R2_BUCKET_NAME=melodia-media
R2_PUBLIC_URL=https://media.melodia-songs.com

R2_PARTNER_BUCKET_NAME=melodia-songs-partner-media
R2_PARTNER_PUBLIC_URL=https://partner-media.melodia-songs.com
```

## Creating R2 API Credentials (S3-compatible)

**Important:** The R2 S3 credentials are NOT the same as Cloudflare API tokens.

1. Cloudflare dashboard → **R2 Object Storage** (left sidebar)
2. Top-right: **Manage R2 API Tokens**
3. Create token → Object Read & Write → select bucket → Create
4. Copy the **Access Key ID** (32 hex chars) and **Secret Access Key** (64 hex chars)

Do NOT use tokens from the main "API Tokens" profile page — those produce `cfat_` prefix tokens which are Bearer tokens and are not S3-compatible. They will cause "Unauthorized" errors with the AWS SDK.

## Cloudflare Worker on media.melodia-songs.com

`media.melodia-songs.com` has a Cloudflare Worker that acts as a reverse proxy. **This Worker intercepts ALL requests** before they reach R2.

### What it does

- Paths ending in `.mp3` → proxied to `cdn1.suno.ai{path}` (legacy Suno CDN proxy)
- Paths starting with `/image_` → proxied to `cdn2.suno.ai{path}`
- Everything else → passed through to R2

### Critical: R2-hosted paths must bypass the Suno proxy

When new R2 paths are added (e.g. a new folder prefix), the Worker must be updated to pass them through directly. Otherwise `.mp3` files in those paths will be fetched from `cdn1.suno.ai/{r2-path}` which doesn't exist → 403.

Current R2 prefixes that pass through:
```
/library-songs/
/customer-songs/
/templated-songs/
/templated-instances/
/rj-shows/
/voice-profiles/
/health/
```

### Worker code

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // R2-hosted paths — pass directly through to bucket
    const R2_PREFIXES = [
      '/library-songs/', '/customer-songs/', '/templated-songs/',
      '/templated-instances/', '/rj-shows/', '/voice-profiles/', '/health/',
    ];
    if (R2_PREFIXES.some(p => path.startsWith(p))) {
      return fetch(request);
    }

    // Legacy: proxy Suno CDN paths through this domain
    let upstreamUrl;
    if (path.endsWith('.mp3')) {
      upstreamUrl = `https://cdn1.suno.ai${path}`;
    } else if (path.startsWith('/image_')) {
      upstreamUrl = `https://cdn2.suno.ai${path}`;
    } else {
      return fetch(request);
    }

    const response = await fetch(upstreamUrl, {
      cf: { cacheTtl: 86400, cacheEverything: true },
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://suno.com/',
        'Accept': request.headers.get('Accept') || 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, br',
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
```

## Audio Migration Script

One-time migration script to download Suno CDN files and re-host on R2:

```bash
# Dry run (no DB writes)
DRY_RUN=true npm run migrate:audio-to-r2

# Single table, limited rows
TABLE=songs LIMIT=5 npm run migrate:audio-to-r2

# Resume from a specific ID
TABLE=songs START_FROM_ID=200 npm run migrate:audio-to-r2

# Full migration
npm run migrate:audio-to-r2
```

Control flags: `DRY_RUN`, `SKIP_EXISTING` (default true), `TABLE`, `LIMIT`, `START_FROM_ID`, `CONCURRENCY` (default 3).

Early songs (IDs ~20–50) may have expired erweima.ai proxy URLs and will fail with "This operation was aborted" — this is expected and those records will be caught by the cron catch-up job.

## Swapping the Public URL

If you need to temporarily use the R2 Public Development URL (e.g. while the custom domain Worker is being updated):

1. Update `R2_PUBLIC_URL` in `.env.local` to `https://pub-<hash>.r2.dev`
2. Run the domain swap SQL to update already-stored URLs in the DB:

```sql
UPDATE songs SET
  song_url = REPLACE(song_url, 'https://media.melodia-songs.com', 'https://pub-<hash>.r2.dev'),
  song_url_variant_1 = REPLACE(song_url_variant_1, 'https://media.melodia-songs.com', 'https://pub-<hash>.r2.dev'),
  suno_variants = REPLACE(suno_variants::text, 'https://media.melodia-songs.com', 'https://pub-<hash>.r2.dev')::jsonb
WHERE song_url LIKE '%media.melodia-songs.com%'
   OR song_url_variant_1 LIKE '%media.melodia-songs.com%'
   OR suno_variants::text LIKE '%media.melodia-songs.com%';
-- Repeat for user_songs, templated_songs, templated_song_instances
```
