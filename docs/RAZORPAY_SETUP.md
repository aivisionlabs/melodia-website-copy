## Razorpay Payment Integration Setup (Melodia Website)

This guide explains how to enable real payments with Razorpay in the Melodia website, what’s already implemented, what’s missing, and what you need to provide.

### What you need to provide (from your side)
- **Razorpay account**: Test and Live modes enabled; complete KYC and activation.
- **API keys**:
  - Test: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - Live: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (live set)
- **Webhook secret**: A string you define in Razorpay Dashboard → Webhooks.
- **Webhook events to enable**: `order.paid`, `payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`.
- **Branding**: Display name “Melodia”, support email, contact number, and logo URL (for Checkout).
- **Legal links (public URLs)**: Terms & Conditions, Privacy Policy, Refund/Cancellation Policy (Razorpay requires these for go-live review).
- **Pricing**: Final INR price for song generation (e.g., ₹299) and tax/GST handling decision.
- **Production domain(s)**: Final domain(s) for Checkout and webhook allowlisting (if applicable on infra).

### What’s already implemented in this repo
- API and DB scaffolding:
  - `POST /api/payments/create-order` → creates a Razorpay Order and logs a `payments` row.
  - `POST /api/payments/verify` → verifies `razorpay_signature` on client callback and marks payment completed.
  - DB tables in `src/lib/db/schema.ts`: `payments`, `payment_webhooks` (for logs), linkage to `user_songs` via `payment_id`.
  - Razorpay helpers in `src/lib/razorpay.ts` (Orders, signature verification, refunds, DEMO mode).
- Payment → Song generation hand-off:
  - Existing simulated endpoints `POST /api/payment/create` and `POST /api/payment/success` already trigger `/api/generate-song` after “payment”.

### Gaps to go live (what we still need to add/finish)
1. Frontend Checkout integration (open Razorpay Checkout and send callback to `/api/payments/verify`).
2. Webhook endpoint: `POST /api/payments/webhook` with signature verification and idempotent processing.
3. Enforce “payment required” before calling `/api/generate-song` (gate via DB check, not just UI).
4. Replace simulated endpoints on `payment/page.tsx` to use the real create-order + verify flow.
5. QA flows for failures/refunds and reconcile statuses with DB.

### Official docs (reference)
- Razorpay Standard Checkout: `https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/`
- Orders API (Create Order): `https://razorpay.com/docs/api/orders/`
- Payments and Capture: `https://razorpay.com/docs/api/payments/`
- Webhooks: `https://razorpay.com/docs/webhooks/`
- Node SDK: `https://github.com/razorpay/razorpay-node`

### Environment variables
Add these to `.env.local` (test) and your production environment (live):

```env
# Razorpay (Test or Live depending on environment)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Optional: keep AI in demo while enabling payments
DEMO_MODE=false
```

Note: The server returns `key` from `RAZORPAY_KEY_ID` to the client in `/api/payments/create-order`. You do not need a `NEXT_PUBLIC_` key if using the provided API.

### Install dependency

```bash
npm install razorpay
```

### End-to-end flow (intended live flow)
1. User clicks Pay → client calls `POST /api/payments/create-order` with `{ songRequestId, amount }`.
2. Server creates a Razorpay Order (amount in paise), inserts `payments` row with `status = pending`, and returns `{ orderId, amount, currency, key, paymentId }`.
3. Client loads Razorpay Checkout and opens with `order_id` and the returned `key`.
4. On success callback, Razorpay returns `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }` to the client handler.
5. Client immediately `POST /api/payments/verify` with those 3 fields.
6. Server verifies signature, marks `payments.status = completed`, optionally attaches to `user_songs.payment_id`.
7. Client then calls the existing hand-off (`/api/payment/success`) which triggers `/api/generate-song` to start generation.
8. Independently, Razorpay sends webhook(s) → our `/api/payments/webhook` validates signature and upserts state. Webhook is the source of truth for edge cases.

### Frontend wiring (what to build)
- Replace current simulate-only flow in `src/app/payment/page.tsx`:
  - Call `POST /api/payments/create-order` with `{ songRequestId, amount }`.
  - Dynamically load Razorpay Checkout script: `https://checkout.razorpay.com/v1/checkout.js`.
  - Open Checkout with options: `key`, `order_id`, `prefill` (name/email if available), `notes` (songRequestId), `handler` (success callback), `modal.ondismiss` (handle close), `theme.color`.
  - In `handler`, `POST /api/payments/verify` with `razorpay_*` fields; on success, call `/api/payment/success` to kick off `/api/generate-song`.

### Webhook endpoint (to add)
- Create `src/app/api/payments/webhook/route.ts`:
  - Read raw body and `x-razorpay-signature` header.
  - Verify with `verifyWebhookSignature(body, signature)` from `src/lib/razorpay.ts`.
  - Log the payload to `payment_webhooks` and update the related `payments` row:
    - `order.paid`/`payment.captured` → `status = completed`
    - `payment.failed` → `status = failed`
    - `refund.processed` → `status = refunded`
  - Idempotency: upsert by `razorpay_event_id`.
  - Return 200 quickly; do heavy work asynchronously if needed.

### Enforcing payment before generation
- In `POST /api/generate-song`, add a server-side check that the `song_request_id` has a `payments` row with `status = completed`.
- If not paid, return 402 (Payment Required) with a helpful message.

### Database notes
- Tables already present in `src/lib/db/schema.ts`:
  - `payments` for tracking order/payment state
  - `payment_webhooks` for webhook logs
- `user_songs.payment_id` exists for linking a successful payment to a created song.

### QA checklist (Test Mode)
- Create Order returns `{ orderId, key }` and stores a `payments` row.
- Checkout success path calls `/api/payments/verify` and DB becomes `completed`.
- Webhook delivers `order.paid`/`payment.captured` and we process idempotently.
- Failure paths:
  - User closes Checkout → no DB change; UI shows retry.
  - Payment failure → `status = failed`; UI shows retry.
- Refund path updates `payments.status = refunded` via webhook.
- After verify, `/api/payment/success` triggers `/api/generate-song` and status polling continues to work.

### Go-live checklist
- Live keys and webhook secret configured in production.
- Webhook URL added in Razorpay Dashboard and verified.
- Legal pages publicly accessible and linked from footer.
- Support email/phone and logo appear correctly in Checkout.
- Amounts are correct (₹ to paise conversion server-side only).
- Monitoring/logging for payment errors and webhook processing.

### Security and compliance
- Signature verification for both client callback and webhooks is mandatory and implemented server-side only.
- Do not trust client-provided amounts; server controls amount when creating Orders.
- Store minimal PII; never store card/UPI details (Razorpay handles PCI DSS).
- Use HTTPS for all prod URLs.

### Useful file references
- `src/app/api/payments/create-order/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/lib/razorpay.ts`
- `src/lib/db/schema.ts` (`payments`, `payment_webhooks`)
- `src/app/payment/page.tsx` (replace simulate-only flow)

### Next actions summary
1) Implement client Checkout on `payment/page.tsx` using the existing APIs.
2) Add `POST /api/payments/webhook` route and dashboard configuration.
3) Add a server-side “paid” check in `/api/generate-song`.
4) Run end-to-end tests in Test Mode, then switch to Live.



