# Testing Guide — Tier 2 Reference

Load this file when writing, running, or debugging tests.

## Testing Approach

No unit test framework is configured. All testing is done via integration-style `test:*` scripts that exercise real services, plus manual curl/browser testing.

## Test Scripts

All scripts are in `scripts/` at the repo root.

```bash
npm run test:emails                           # Send test emails via Resend
npm run test:webhook                          # Fire test webhook payloads
npm run test:vendor-api                       # Test Partner API end-to-end
npm run test:customer-templated-vendor-order  # Test customer_templated_song vendor order flow
npm run test:youtube-metadata                 # Test YouTube URL metadata extraction (RapidAPI)
npm run test:youtube-download                 # Test YouTube audio download
npm run test:tts                              # Test ElevenLabs TTS
npm run test:r2-upload                        # Test Cloudflare R2 upload
npm run simulate:vendor-flow                  # Simulate full vendor order flow end-to-end
npm run test:voice-profiles                   # Test admin voice profile library (CRUD + sample audio upload)
npm run test:rj-show-revisions                # Test GET /revisions history and POST /revise for RJ shows
npm run test:templated-songs-lyrics           # Test GET /api/templated-songs includeLyrics query param
npm run test:unit                             # Run vitest unit tests (if any are present)
```

## What to Test Manually

When adding a new feature, validate through the actual flow:

1. **API routes** — use `curl` or a REST client against `localhost:3000`
2. **Webhooks** — use `npm run test:webhook` or replay events via the payment provider dashboard
3. **Emails** — use `npm run test:emails` to send to a real inbox
4. **DB changes** — run `npm run db:check` after generating migrations

### Demo mode for local testing

Set `DEMO_MODE=true` in `.env.local` to test the song creation flow without hitting real Suno API. In demo mode:
- `isDemoTaskId()` returns true for demo task IDs
- `song-status` returns progressive mock variants based on elapsed time
- Vendor flow `approve-lyrics` simulates completion in-process after 3 seconds
- Outbound emails and WhatsApp notifications are suppressed

Set `EMAIL_DEMO=true` to suppress email sends independently of demo mode (useful for testing non-Suno paths without sending real emails).

### Testing the Partner (B2B) API locally

Use a sandbox vendor API key. The simulate endpoint fires real webhooks with valid signatures:

```bash
# Create a test order
curl -X POST http://localhost:3000/api/v1/partner/orders \
  -H "Authorization: Bearer <sandbox_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"product_type":"customer_templated_song","external_order_id":"test-1","template_id":1,"recipient_name":"Test"}'

# Simulate completion (sandbox only)
curl -X POST http://localhost:3000/api/v1/partner/orders/{order_id}/simulate \
  -H "Authorization: Bearer <sandbox_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"outcome":"complete"}'
```

Use `PARTNER_API_SIMULATE_SECRET` to access the admin simulate route directly in development.

### Testing the Suno webhook locally

The `POST /api/demo/suno-webhook` route simulates a Suno callback when `DEMO_MODE=true`. Send `{ taskId, callbackType? }` for a task ID that exists in the DB.

### Testing RJ show audio pipeline

The `scripts/test-youtube-url-metadata.ts` script validates YouTube URL resolution via RapidAPI. Run with `npx tsx scripts/test-youtube-url-metadata.ts <youtube_url>`.

## No Mocking Policy

Tests hit real services (DB, email, webhooks). Do not introduce mocked test infrastructure — keep tests close to production behavior.

## Linting

```bash
npm run lint   # ESLint — run before committing
```

TypeScript type errors surface during `npm run build`. Run build to catch type issues before deploying.

## Cron job testing

The log cleanup cron (`GET /api/cron/cleanup-logs`) requires `Authorization: Bearer {CRON_SECRET}` header. Test locally:

```bash
curl -X GET http://localhost:3000/api/cron/cleanup-logs \
  -H "Authorization: Bearer <CRON_SECRET_value>"
```
