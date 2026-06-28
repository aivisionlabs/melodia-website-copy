# Environment Variables Documentation

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables.

---

### Database

```env
DATABASE_URL=postgresql://user:password@localhost:5432/melodia
```

Use only `DATABASE_URL`. `POSTGRES_URL` is not used by this project.

---

### NextAuth.js Authentication

```env
# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3000
```

---

### Google OAuth

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Redirect URI (must be added in Google Cloud Console):
- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://yourdomain.com/api/auth/callback/google`

---

### Google Cloud Vertex AI (Lyrics / LLM)

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1          # alias: GOOGLE_CLOUD_LOCATION
GOOGLE_CLOUD_VERTEX_AI_MODEL=gemini-2.5-flash   # alias: GOOGLE_VERTEX_MODEL
GOOGLE_VERTEX_REVIEW_MODEL=gemini-2.5-flash     # optional; model used for AI review pass
GOOGLE_VERTEX_METADATA_MODEL=gemini-2.5-flash # optional; cheap model for auto tags + listing descriptions (lyrics drafts + admin songs)

# JSON string of Google service account credentials (required in serverless)
GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

Notes:
- `GOOGLE_VERTEX_MODEL` takes precedence over `GOOGLE_CLOUD_VERTEX_AI_MODEL` in most places; set both for consistency
- If `GCS_CREDENTIALS_JSON` is not set, falls back to Application Default Credentials (ADC) — does not work in Vercel
- `LYRICS_REVIEW_ENABLED=true` enables the optional AI review pass after lyrics generation

---

### Suno API (Music Generation)

```env
SUNO_API_URL=https://api.sunoapi.org/api/v1
SUNO_API_KEY=your-suno-api-key
```

---

### Payment Provider

```env
# Select provider: 'razorpay' (default) or 'cashfree'
PAYMENT_PROVIDER=razorpay
NEXT_PUBLIC_PAYMENT_PROVIDER=razorpay   # client-side provider hint

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cashfree
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
CASHFREE_RETURN_URL=https://yourdomain.com/payment/return
```

---

### Upstash Redis (Rate Limiting)

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

---

### Email Service (Resend)

```env
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@melodia.com
EMAIL_PROVIDER=resend        # optional; defaults to 'resend'
EMAIL_DEMO=false             # set 'true' to suppress all outbound emails (independent of DEMO_MODE)
```

---

### WhatsApp Notifications (TryOwBot)

```env
TRYOWBOT_APP_ID=your-tryowbot-app-id
TRYOWBOT_API_KEY=your-tryowbot-api-key
TRYOWBOT_SEND_URL=https://api.tryowbot.com/...   # optional override
TRYOWBOT_DEFAULT_COUNTRY_CODE=+91
TRYOWBOT_ORDER_CREATED_APINAME=order_created
TRYOWBOT_ORDER_COMPLETED_APINAME=order_completed
TRYOWBOT_DEMO_TEST_SEND=false    # set 'true' to enable test sends in demo mode
TRYOWBOT_DEMO_TEST_APINAME=demo_test   # API name used for demo test sends
```

---

### Partner API

```env
PARTNER_API_SIMULATE_SECRET=your-simulate-secret   # guards /api/admin/partner-api/simulate
INTERNAL_API_SECRET=your-internal-api-secret       # guards /api/internal/* and some admin routes
```

---

### Cron

```env
CRON_SECRET=your-cron-secret    # guards GET /api/cron/cleanup-logs
LOG_RETENTION_DAYS=30           # optional; defaults to 30
```

---

### Application / UI

```env
NEXT_PUBLIC_BASE_URL=https://melodia-songs.com    # canonical base URL (used in share links, emails)
NEXT_PUBLIC_STORY_CHARACTER_LIMIT=700             # story textarea char limit (defaults to 700)
NEXT_PUBLIC_SHOW_RECIPIENT_NAME_TRANSLITERATION=false  # show native-script name suggestions on /create and /create-song (default: off; set to "true" to enable)
MEDIA_BASE_URL=https://media.melodia-songs.com    # optional; CDN base for media URLs
```

---

### Analytics

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TJW2DN7ND5   # Google Analytics 4
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX               # Google Tag Manager (optional; can manage GA4 via GTM)
```

---

### Logging

```env
LOG_LEVEL=info               # debug | info | warn | error | fatal (default: info)
LOG_PRETTY=false             # true for human-readable output in dev
DEBUG_MODE=false             # verbose debug logging
DISABLE_LOG_STORAGE=false    # true to skip DB log writes
LOG_STORAGE_MIN_LEVEL=info   # minimum level stored to application_logs table
```

---

### Demo Mode (Development)

```env
DEMO_MODE=true   # use mock data; skip real Suno and outbound email calls
```

---

## Important Notes

1. Never commit `.env.local` to version control
2. `NEXTAUTH_SECRET` must be minimum 32 characters
3. In production, set `NEXT_PUBLIC_BASE_URL` and `NEXTAUTH_URL` to your production domain
4. `GOOGLE_VERTEX_MODEL` / `GOOGLE_CLOUD_VERTEX_AI_MODEL` — use a stable Gemini model name; `gemini-2.5-flash` or `gemini-2.5-pro` as appropriate
5. Suno API endpoint: `SUNO_API_URL` defaults to `https://api.sunoapi.org/api/v1` (third-party Suno API wrapper, not the official suno.ai API)
6. All sensitive keys should be stored securely in production (e.g. Vercel Environment Variables)
