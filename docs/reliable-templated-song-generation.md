# Reliable Templated Song Generation

## Context

The partner `customer_templated_song` flow can start generation immediately when a partner supplies `template_id` and `recipient_name`.

Current high-level flow:

1. `POST /api/v1/partner/orders` creates a `partner_api_orders` row.
2. The row is updated to `song_generation_inprogress`.
3. The app generates a personalized templated instance by:
   - converting the recipient name to script,
   - replacing the template placeholder,
   - calling Suno,
   - inserting a `templated_song_instances` row with the Suno task id.
4. Suno calls `/api/suno-webhook/templated-songs/instances` when audio is ready.

The recent bug was caused by step 3 being fired as an unawaited background Promise. In production serverless runtimes, the function can stop as soon as the HTTP response is sent, so the database status changes but the Suno request may never happen.

`after()` is a good tactical fix because it tells Next.js/Vercel to keep the function invocation alive for post-response work. However, this is still not the most durable design for paid/order-critical workflows.

## Recommended Solution

Use a durable job/outbox model backed by the existing Supabase Postgres database.

Instead of doing the entire Suno-start operation inside the request lifecycle, the order API should persist a job and return quickly. A separate worker endpoint should claim queued jobs and process them with retries.

This gives us:

- durable state if a Vercel function is killed,
- clear visibility into the current generation step,
- safe retries for transient LLM/Suno/network failures,
- idempotency so one order does not create duplicate Suno tasks,
- recovery for stuck orders.

## Proposed Data Model

Add a new table via Drizzle migration, for example `templated_song_generation_jobs`.

Suggested columns:

- `id`
- `partner_api_order_id` — nullable for non-partner templated flows if we later reuse it
- `template_id`
- `recipient_name`
- `status` — `queued`, `processing`, `suno_started`, `completed`, `failed`
- `attempt_count`
- `max_attempts`
- `next_attempt_at`
- `locked_at`
- `locked_by`
- `last_error`
- `suno_task_id`
- `templated_song_instance_id`
- `metadata`
- `created_at`
- `updated_at`

Suggested constraints/indexes:

- unique partial index on `partner_api_order_id` where not null, to prevent duplicate jobs per partner order
- index on `(status, next_attempt_at)` for worker polling
- index on `suno_task_id`

No manual SQL should be added directly; generate the migration from Drizzle schema changes.

## Flow With Current Supabase DB

### 1. Order API creates the order and job

Inside `POST /api/v1/partner/orders`, when `customer_templated_song` has `template_id` and `recipient_name`:

1. Validate `recipient_name`.
2. Create/update `partner_api_orders` with status `song_generation_inprogress`.
3. Insert `templated_song_generation_jobs` with status `queued`.
4. Return the order response.

This keeps the partner API fast and avoids depending on post-response work to call Suno.

### 2. Worker claims jobs atomically

Create an internal route such as:

`POST /api/internal/templated-song-generation/process`

The worker should:

1. Select queued jobs where `next_attempt_at <= now()`.
2. Claim a small batch atomically by setting:
   - `status = 'processing'`
   - `locked_at = now()`
   - `locked_by = request id / deployment id`
   - `attempt_count = attempt_count + 1`
3. Process each job.

Use Supabase Postgres as the coordination layer. A common Postgres pattern is `FOR UPDATE SKIP LOCKED`; if Drizzle cannot express the exact claim query cleanly, use a small, well-contained raw SQL query in the worker claim function.

### 3. Worker starts Suno idempotently

For each claimed job:

1. Re-read the partner order and template.
2. Check if a `templated_song_instances` row already exists for `partner_api_order_id`.
3. If it exists and has `suno_task_id`, mark the job as `suno_started` or `completed` depending on instance status.
4. If not, call the templated generation service.
5. Store `suno_task_id` and `templated_song_instance_id` on the job.

This makes retries safe. If the function crashes after Suno starts but before the job is updated, we should still avoid duplicates where possible by checking existing instance rows and by keeping a clear creation order.

Recommended small refactor:

- create the `templated_song_instances` row before calling Suno with status `queued` or `processing`
- then call Suno
- then update the instance with `suno_task_id`

That leaves a visible instance even if the function dies between steps. The current service inserts the instance after Suno returns, so a crash before insert is harder to diagnose.

### 4. Webhook completes the instance and order

The existing Suno webhook remains the completion source of truth:

- update `templated_song_instances.status`
- store variants/audio metadata
- update `partner_api_orders.status` to `completed` when appropriate
- notify partner/customer as today

The job status can be marked `completed` either by the webhook or by the worker after it confirms the instance is complete.

## How To Run This On Vercel

There are two good Vercel-compatible options.

### Option A: Vercel Cron + Internal Worker Route

This is the simplest approach with the current stack.

Add a Vercel Cron that calls:

`POST /api/internal/templated-song-generation/process`

Recommended schedule:

- every 1 minute for production
- worker processes a small batch, for example 5 to 10 jobs
- set `maxDuration = 120` or `300` on the worker route

Security:

- require an internal secret header, for example `x-internal-cron-secret`
- store the secret in Vercel env vars
- reject requests without the secret

Retries:

- on transient errors, set `status = 'queued'`
- set `next_attempt_at` with backoff, for example 1 min, 5 min, 15 min
- after `max_attempts`, set `status = 'failed'` and update the partner order to `failed`

Recovery:

- add a cleanup/recovery step for jobs stuck in `processing` where `locked_at < now() - interval '10 minutes'`
- reset those jobs to `queued` if `attempt_count < max_attempts`

This option uses only Vercel Functions, Vercel Cron, and the current Supabase DB.

### Option B: Vercel Workflow

Use Vercel Workflow if we want a first-class durable multi-step process with explicit steps and retries.

Good fit for this flow:

1. Step: validate/load template and persona.
2. Step: convert recipient name.
3. Step: create/update templated instance.
4. Step: call Suno.
5. Step: persist task id.
6. Wait for webhook/polling to complete, or let webhook remain the completion trigger.

Workflow is cleaner than hand-rolled polling for long-running, multi-step operations, but it adds a new dependency and operational model. If the project wants the smallest change that fits the current architecture, start with Option A.

## Recommended Rollout Plan

### Phase 1: Stabilize Current Implementation

- Keep `after()` for now.
- Set explicit `maxDuration` on the affected routes.
- Add stage logs:
  - generation scheduled
  - background callback started
  - before name conversion
  - before Suno request
  - Suno response received
  - instance inserted
- Add a stuck-order diagnostic query for `song_generation_inprogress` orders with no linked instance.

### Phase 2: Add Outbox Jobs

- Add `templated_song_generation_jobs` table via Drizzle.
- Update order creation to enqueue a job.
- Build the internal worker route.
- Add Vercel Cron.
- Keep `after()` only as a best-effort trigger to call the worker immediately after enqueueing, not as the durable mechanism.

### Phase 3: Improve Idempotency

- Refactor templated instance creation so an instance row exists before Suno is called.
- Add unique protection around `partner_api_order_id`.
- Ensure retry logic never creates duplicate Suno jobs for the same partner order.

## Recommendation

For Melodia’s current Vercel + Supabase setup, the best practical approach is:

1. short term: `after()` + explicit `maxDuration` + better stage logs,
2. medium term: Supabase-backed outbox table + Vercel Cron worker,
3. long term: consider Vercel Workflow if more generation flows need durable, step-based orchestration.

This keeps the architecture simple, avoids introducing an external queue immediately, and gives the partner order flow the reliability expected for paid production traffic.
