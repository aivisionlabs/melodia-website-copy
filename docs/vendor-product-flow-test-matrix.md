# Vendor / partner product flows — test matrix (checklist)

Use this as a **manual** release checklist or spreadsheet (Product × Case × Environment × Pass/Fail). For status semantics see [vendor-order-statuses-by-product.md](./vendor-order-statuses-by-product.md).

## Cross-cutting (all flows that use the token)

| ID | Case | Pass criteria |
|----|------|----------------|
| X1 | Invalid `orderToken` on `GET /api/vendor-order/{token}` | HTTP 404 |
| X2 | Valid token | HTTP 200; JSON has `vendor`, `order`, and product-specific keys |
| X3 | Webhook HMAC (if `webhook_url` set) | Delivery; `X-Melodia-Signature` matches `signWebhookPayload` (see unit tests) |
| X4 | Polling (browser) | Transient states: repeated `GET` ~5s apart; terminal: no continued polling |

---

## `customer_custom_song`

| ID | Case | Pass criteria |
|----|------|----------------|
| C1 | Happy path | `pending` → submit → lyrics → review → approve → generation → `completed` (or `DEMO_MODE` completion) |
| C2 | Lyrics revision loop | Revise increases draft version; cap enforced (HTTP 429/409 when over limit) |
| C3 | Double submit | Second `POST .../submit` → 409 |
| C4 | Approve in wrong state | `POST .../approve-lyrics` when not `lyrics_ready_for_review` → 4xx |
| C5 | Stuck order watchdog | After timeout, `GET` can mark `failed` (see API implementation) |
| C6 | Effective status in `GET` | When order row is `song_generation_inprogress` but `user_song` is `completed`, response `order.status` is `completed` |
| C7 | UI | Loaders vs `LyricsReviewPanel` vs `SongOptionsDisplay` / stream-ready variant |

---

## `customer_templated_song` (co-branded name-drop)

| ID | Case | Pass criteria |
|----|------|----------------|
| T1 | Happy path | `pending` → `POST .../generate-template` → `song_generation_inprogress` → instance completes → effective `completed` |
| T2 | Wrong product | `POST .../generate-template` on non–`customer_templated_song` order → 400 |
| T3 | Double generate | Second `POST .../generate-template` → 409 |
| T4 | Instance / Suno failed | Order or instance shows `failed`; UI error state |
| T5 | Early stream | `STREAM_READY` variant may show player before full completion |
| T6 | Polling | Transient: client polls `GET` until terminal |

**Automation:** `npm run test:vendor-api` (Partner API) and `npm run test:customer-templated-vendor-order` (create + generate-template + poll; requires running server and env — see script header).

---

## `rj_show`

| ID | Case | Pass criteria |
|----|------|----------------|
| R1 | Create + script pipeline | `rj_show` in response; moves through `script_pending` / `script_generating` / `script_ready` as applicable |
| R2 | Customer approves script | `POST .../rj-show/approve` when `script_ready` → production starts (when internal worker is configured) |
| R3 | `order.script_ready` webhook | Fires when script is ready (if webhook configured) |
| R4 | Success | `rj_shows.status` `completed`, `final_audio_url` set; partner order `completed` |
| R5 | Failure | `rj_shows` `failed`; UI shows error; note partner order may still be `processing` in some paths |
| R6 | Polling | Transient `rj_show` statuses: periodic `GET` until `completed` or `failed` |
| R7 | Sandbox simulate | Fast path via Partner API simulate (see **RJ test tracks** below) |

### RJ test tracks (how to run)

**Track A — Fast (sandbox / staging)**  
Use the Partner API **simulate** flow for an `rj_show` order so the show and order reach `completed` without full LLM/segment production. Suitable for smoke and webhook checks.  
See: `POST /api/v1/partner/orders/{id}/simulate` (sandbox vendor; refer to route and admin docs).

**Track B — Full (local dev)**  
1. Create `rj_show` order via Partner API.  
2. Wait for `script_ready` (or use sandbox script path).  
3. Call `POST /api/vendor-order/{orderToken}/rj-show/approve` with a valid script body.  
4. Ensure `INTERNAL_API_SECRET` is set and `POST /api/internal/rj-show/process-segments` (or equivalent trigger) can run so `produceShow` executes.  
5. Assert `completed` and audio URL, or `failed` with error surface on the show.

---

## Optional E2E (Playwright)

- **API smoke (no DB seed):** `npx playwright test` — invalid vendor-order token returns 404.  
- **Full UI:** set `PLAYWRIGHT_VENDOR_ORDER_URL` to a real `https://.../vendor/{slug}/order/{token}` in staging; run with `PLAYWRIGHT_BASE_URL` (see `playwright.config.ts`).

---

## CI suggestion

1. `npm run test:unit` — Vitest (webhook signature, effective status, submit guards).  
2. `npm run test:vendor-api` — against staging with secrets (scheduled job, not every PR).  
3. `npx playwright test` — API 404 smoke on PR if `PLAYWRIGHT_BASE_URL` is set.
