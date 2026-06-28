# 🎵 Melodia - Complete Setup & User Flow Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Flow Diagram](#user-flow-diagram)
3. [Database Schema](#database-schema)
4. [Setup Instructions](#setup-instructions)
5. [Environment Variables](#environment-variables)
6. [Razorpay Integration](#razorpay-integration)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**Melodia** is a personalized song generation platform that:
- Generates custom lyrics using **Google Gemini API**
- Creates songs using **Suno API**
- Processes payments via **Razorpay**
- Supports both **anonymous users** and **registered users**
- Uses **PostgreSQL** database with **Drizzle ORM**

---

## 🔄 User Flow Diagram

### Complete End-to-End User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MELODIA USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────────────┘

1. 🌐 WEBSITE VISIT
   │
   ├─► Anonymous User Created (Auto)
   │   POST /api/users/anonymous
   │   Returns: { anonymous_user_id: "uuid" }
   │
   └─► User lands on homepage (page.tsx)
       - See "Share Requirements" CTA
       - Fill song creation form

2. 📝 SONG REQUEST FORM SUBMISSION
   │
   ├─► User fills form with:
   │   - Recipient name (e.g., "Sarah, my friend")
   │   - Languages (e.g., ["English"])
   │   - Additional details (e.g., "She loves pop music")
   │   - Occasion (optional)
   │   - Mood (optional array)
   │
   └─► POST /api/create-song-request
       Body: {
         recipient_name: "Sarah, my friend",
         languages: ["English"],
         additional_details: "She loves pop music",
         anonymous_user_id: "uuid" (or user_id if registered)
       }
       Response: { success: true, requestId: 123 }

3. 🎵 LYRICS GENERATION
   │
   ├─► POST /api/generate-lyrics-with-storage
       Body: {
         requestId: 123,
         recipient_name: "Sarah, my friend",
         languages: ["English"],
         additional_details: "She loves pop music"
       }
       │
       ├─► Uses Gemini API (or demo mode)
       ├─► Stores lyrics in lyrics_drafts table
       └─► Returns: {
             success: true,
             title: "Song for Sarah",
             lyrics: "Verse 1...",
             draftId: 456
           }

4. 📄 LYRICS REVIEW PAGE
   │
   ├─► Redirects to: /lyrics-display?requestId=123
   │
   ├─► GET /api/lyrics-display?requestId=123
   │   Returns lyrics draft for review
   │
   ├─► User can:
   │   - Review generated lyrics
   │   - Edit lyrics (optional)
   │   - Approve lyrics
   │
   └─► POST /api/approve-lyrics
       Body: { lyricsDraftId: 456 }
       Updates lyrics_drafts.status = 'approved'

5. 💳 PAYMENT FLOW
   │
   ├─► User clicks "Generate Song" (triggers payment)
   │
   ├─► POST /api/payments/create-order
       Body: {
         songRequestId: 123,
         planId: 1,  // Optional pricing plan
         anonymous_user_id: "uuid"
       }
       │
       ├─► Creates Razorpay Order
       ├─► Stores payment record in payments table
       └─► Returns: {
             success: true,
             orderId: "order_xyz",
             amount: 10000,  // in paise (₹100)
             currency: "INR",
             key: "rzp_test_xxx"  // Razorpay key
           }
   │
   ├─► Frontend opens Razorpay Checkout
   │   - User enters payment details
   │   - Completes payment
   │
   ├─► POST /api/payments/verify
       Body: {
         razorpay_payment_id: "pay_xyz",
         razorpay_order_id: "order_xyz",
         razorpay_signature: "signature_hash",
         anonymous_user_id: "uuid"
       }
       │
       ├─► Verifies payment signature
       ├─► Updates payments.status = 'completed'
       └─► Returns: { success: true, paymentId: 789 }

6. 🎤 SONG GENERATION
   │
   ├─► POST /api/generate-song
       Body: {
         title: "Song for Sarah",
         lyrics: "Verse 1...",
         style: "Pop",
         recipient_name: "Sarah",
         requestId: 123,
         userId: null,  // or user_id if registered
         anonymous_user_id: "uuid"
       }
       │
       ├─► Calls Suno API (or demo mode)
       ├─► Creates user_songs record
       ├─► Updates song_requests.status = 'processing'
       └─► Returns: {
             success: true,
             taskId: "suno-task-123",
             songId: 101
           }

7. ⏳ STATUS POLLING
   │
   ├─► GET /api/song-status/[songId]
       │
       ├─► Checks Suno API for completion
       ├─► Updates user_songs.status
       └─► Returns: {
             success: true,
             status: "processing" | "completed" | "failed",
             songUrl: "https://...",
             duration: 180
           }
   │
   └─► Frontend polls every 5-10 seconds until completed

8. 🎵 SONG VARIANTS & SELECTION
   │
   ├─► When status = "completed"
   │
   ├─► GET /api/song-variants/[songId]
       Returns multiple song variants
   │
   ├─► User selects preferred variant
   │
   └─► Updates user_songs.selected_variant

9. 📱 MY SONGS PAGE
   │
   ├─► GET /api/user-content?anonymousUserId=uuid
       │
       ├─► Returns all user's content:
       │   - Song requests (pending/completed)
       │   - Lyrics drafts (draft/approved)
       │   - Songs (processing/completed)
       │
       └─► Dynamic buttons based on status:
           - Draft lyrics → "Generate Song"
           - Processing → "View Progress"
           - Completed → "Listen"
           - Failed → "Retry"
```

### Registered User Flow (Similar, but with authentication)

```
1. POST /api/auth/register (or /api/auth/login)
   ↓
2. Same flow as above, but uses user_id instead of anonymous_user_id
   ↓
3. Data migration: Anonymous data merges with registered account
```

---

## 📊 Database Schema

### Core Tables

#### 1. **users** - Registered User Accounts
```sql
CREATE TABLE "users" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  phone_number TEXT,
  profile_picture TEXT,
  email_verified BOOLEAN DEFAULT false,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 2. **anonymous_users** - Temporary User Sessions
```sql
CREATE TABLE "anonymous_users" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now()
);
```

#### 3. **song_requests** - Song Generation Requests
```sql
CREATE TABLE "song_requests" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  anonymous_user_id UUID REFERENCES anonymous_users(id),
  requester_name TEXT,
  recipient_details TEXT NOT NULL,
  occasion TEXT,
  languages TEXT NOT NULL,
  mood TEXT[],
  song_story TEXT,
  mobile_number TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 4. **lyrics_drafts** - Generated Lyrics with Versioning
```sql
CREATE TABLE "lyrics_drafts" (
  id SERIAL PRIMARY KEY,
  song_request_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  lyrics_edit_prompt TEXT,
  generated_text TEXT NOT NULL,
  song_title TEXT,
  music_style TEXT,
  language TEXT DEFAULT 'English',
  llm_model_name TEXT,
  status TEXT DEFAULT 'draft',  -- draft, needs_review, approved, archived
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 5. **user_songs** - Generated Songs
```sql
CREATE TABLE "user_songs" (
  id SERIAL PRIMARY KEY,
  song_request_id INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now(),
  slug TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'processing',  -- processing, completed, failed
  is_featured BOOLEAN DEFAULT false,
  song_variants JSONB DEFAULT '{}',
  variant_timestamp_lyrics_api_response JSONB DEFAULT '{}',
  variant_timestamp_lyrics_processed JSONB DEFAULT '{}',
  metadata JSONB,
  approved_lyrics_id INTEGER,
  service_provider TEXT DEFAULT 'SU',
  categories TEXT[],
  tags TEXT[],
  add_to_library BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  selected_variant INTEGER,
  payment_id INTEGER  -- Links to payments table
);
```

#### 6. **payments** - Payment Records (Razorpay)
```sql
CREATE TABLE "payments" (
  id SERIAL PRIMARY KEY,
  song_request_id INTEGER,
  user_id INTEGER,
  anonymous_user_id UUID,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',  -- pending, completed, failed, refunded
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  metadata JSONB
);
```

#### 7. **payment_webhooks** - Payment Webhook Logs
```sql
CREATE TABLE "payment_webhooks" (
  id SERIAL PRIMARY KEY,
  razorpay_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  payment_id INTEGER,
  webhook_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  processed_at TIMESTAMP
);
```

#### 8. **songs** - Library Songs (Existing)
```sql
CREATE TABLE "songs" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  title TEXT NOT NULL,
  lyrics TEXT,
  timestamp_lyrics JSONB,
  music_style TEXT,
  service_provider TEXT DEFAULT 'SU',
  song_requester TEXT,
  prompt TEXT,
  song_url TEXT,
  duration INTEGER,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  categories TEXT[],
  tags TEXT[],
  suno_task_id TEXT,
  metadata JSONB
);
```

### Additional Tables (for rate limiting, email verification, etc.)
- `email_verification_codes` - Email OTP codes
- `rate_limit_violations` - Rate limit tracking
- `blocked_ips` - Blocked IP addresses
- `rate_limit_analytics` - Analytics
- `admin_users` - Admin panel users
- `categories` - Song categories
- `song_categories` - Many-to-many mapping

---

## 🚀 Setup Instructions

### Prerequisites
- ✅ Docker & Docker Compose (for PostgreSQL)
- ✅ Node.js 18+ and npm
- ✅ Git

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd melodia-website
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Docker Database
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker ps
# Should see: melodia-postgres container
```

### Step 4: Create Environment File
Create `.env.local` in the root directory:

```env
# Database (Docker PostgreSQL)
DATABASE_URL=postgresql://postgres:melodia2024@localhost:5433/melodia

# NextAuth
NEXTAUTH_SECRET=generate-a-secret-32-characters-or-longer
NEXTAUTH_URL=http://localhost:3000

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Google Gemini (Lyrics Generation)
GEMINI_API_TOKEN=your_gemini_api_key
# OR use Vertex AI:
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_VERTEX_AI_MODEL=gemini-pro
GCS_CREDENTIALS_JSON={"type":"service_account",...}

# Suno API (Music Generation)
SUNO_API_URL=https://api.suno.ai
SUNO_API_KEY=your-suno-api-key

# Demo Mode (set to true for testing without real APIs)
DEMO_MODE=true

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional: Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@melodia.com

# Optional: Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 5: Run Database Migrations
```bash
# Push schema to database
npx drizzle-kit push:pg

# OR verify migrations
npm run db:studio
# Opens Drizzle Studio at http://localhost:4983
```

### Step 6: Start Development Server
```bash
npm run dev
```

The application will be available at:
- **Website**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Drizzle Studio**: http://localhost:4983 (run `npm run db:studio`)

### Step 7: Verify Setup

#### Check Database Connection
```bash
# Test database connection
curl http://localhost:3000/api/verify-db
```

#### Check Anonymous User Creation
```bash
curl http://localhost:3000/api/users/anonymous
# Should return: {"success":true,"anonymous_user_id":"..."}
```

#### Create Test Song Request (Demo Mode)
```bash
curl -X POST http://localhost:3000/api/create-song-request \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_name": "Test User, my friend",
    "languages": ["English"],
    "additional_details": "Test details",
    "anonymous_user_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## 🔑 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5433/melodia` |
| `NEXTAUTH_SECRET` | NextAuth secret (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL for auth callbacks | `http://localhost:3000` |

### Optional Variables (for full functionality)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `RAZORPAY_KEY_ID` | Razorpay test/live key ID | Payment integration |
| `RAZORPAY_KEY_SECRET` | Razorpay test/live secret | Payment integration |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret | Payment webhooks |
| `GEMINI_API_TOKEN` | Google Gemini API key | Lyrics generation |
| `SUNO_API_KEY` | Suno API key | Song generation |
| `DEMO_MODE` | Use demo mode (true/false) | Testing without real APIs |

### Demo Mode
When `DEMO_MODE=true`:
- ✅ No real API calls
- ✅ Mock lyrics generation
- ✅ Mock song generation (completes after 2 minutes)
- ✅ Mock payment verification
- ✅ All data stored in database
- ✅ Perfect for development/testing

---

## 💳 Razorpay Integration

### Current Implementation Status

#### ✅ Already Implemented:
- `POST /api/payments/create-order` - Creates Razorpay order
- `POST /api/payments/verify` - Verifies payment signature
- Payment database tables (`payments`, `payment_webhooks`)
- Razorpay helper functions in `src/lib/razorpay.ts`

#### ⚠️ Still Needed:
- Frontend Checkout integration (Razorpay Checkout popup)
- Webhook endpoint (`POST /api/payments/webhook`)
- Server-side payment verification before song generation

### Setup Razorpay

#### 1. Create Razorpay Account
- Go to https://razorpay.com
- Sign up for test account
- Complete KYC (for live mode)

#### 2. Get API Keys
- Dashboard → Settings → API Keys
- Copy `Key ID` and `Key Secret`
- Add to `.env.local`:
  ```env
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
  ```

#### 3. Configure Webhooks
- Dashboard → Settings → Webhooks
- Add webhook URL: `https://yourdomain.com/api/payments/webhook`
- Events to enable:
  - `order.paid`
  - `payment.authorized`
  - `payment.captured`
  - `payment.failed`
  - `refund.processed`
- Copy webhook secret to `.env.local`:
  ```env
  RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
  ```

#### 4. Test Payment Flow

**Create Order:**
```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "songRequestId": 123,
    "planId": 1,
    "anonymous_user_id": "uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_xyz",
  "amount": 10000,
  "currency": "INR",
  "key": "rzp_test_xxx"
}
```

**Verify Payment** (after user completes on Razorpay):
```bash
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_payment_id": "pay_xyz",
    "razorpay_order_id": "order_xyz",
    "razorpay_signature": "signature_hash",
    "anonymous_user_id": "uuid"
  }'
```

### Payment Flow Integration Points

1. **Before Song Generation**: Check if payment is completed
   ```typescript
   // In /api/generate-song
   const payment = await db.select()
     .from(paymentsTable)
     .where(and(
       eq(paymentsTable.song_request_id, requestId),
       eq(paymentsTable.status, 'completed')
     ));
   
   if (payment.length === 0) {
     return { error: 'Payment required', requiresPayment: true };
   }
   ```

2. **Frontend Checkout**: Add Razorpay Checkout script
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

3. **Webhook Endpoint**: Process Razorpay webhooks
   ```typescript
   // POST /api/payments/webhook
   // Verify signature
   // Update payment status
   // Handle events (paid, failed, refunded)
   ```

---

## 📡 API Endpoints Reference

### Authentication
- `POST /api/users/anonymous` - Create/get anonymous user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Song Creation
- `POST /api/create-song-request` - Create song request
- `POST /api/generate-lyrics-with-storage` - Generate & store lyrics
- `GET /api/lyrics-display` - Get lyrics for review
- `POST /api/approve-lyrics` - Approve lyrics draft
- `POST /api/generate-song` - Start song generation

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/status/[paymentId]` - Get payment status

### Song Status
- `GET /api/song-status/[songId]` - Check song generation status
- `GET /api/song-variants/[songId]` - Get song variants

### User Content
- `GET /api/user-content` - Get all user's content
- `POST /api/delete-content` - Delete user content

See `docs/API_DOCUMENTATION.md` for full API reference.

---

## 🔧 Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to database
```bash
# Check if Docker container is running
docker ps

# Check database logs
docker-compose logs postgres

# Test connection manually
docker exec -it melodia-postgres psql -U postgres -d melodia
```

**Solution**: 
- Ensure Docker is running
- Check `DATABASE_URL` in `.env.local`
- Verify port (5433 in docker-compose.yml)

### Migration Errors

**Problem**: Migrations fail
```bash
# Reset migrations
rm -rf drizzle/.cache
npx drizzle-kit push:pg --force
```

### API Errors

**Problem**: "Payment required" error
- **Cause**: Payment not completed before song generation
- **Solution**: Complete payment flow first

**Problem**: "Lyrics draft not found"
- **Cause**: Lyrics not generated or draft ID incorrect
- **Solution**: Generate lyrics first via `/api/generate-lyrics-with-storage`

### Razorpay Issues

**Problem**: "Invalid signature"
- **Cause**: Webhook secret mismatch
- **Solution**: Verify `RAZORPAY_WEBHOOK_SECRET` matches dashboard

**Problem**: Order creation fails
- **Cause**: Invalid API keys
- **Solution**: Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Demo Mode Not Working

**Problem**: Still hitting real APIs
- **Solution**: Set `DEMO_MODE=true` in `.env.local`
- Restart dev server: `npm run dev`

---

## 📚 Additional Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [API Flow Diagrams](./API_FLOW_DIAGRAMS.md) - Visual flow charts
- [Local Setup](./LOCAL_SETUP.md) - Detailed local setup guide
- [Razorpay Setup](./RAZORPAY_SETUP.md) - Razorpay integration details
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - All env vars explained

---

## ✅ Quick Start Checklist

- [ ] Docker is running
- [ ] `npm install` completed
- [ ] `.env.local` file created with all required variables
- [ ] Database migrations run (`npx drizzle-kit push:pg`)
- [ ] Development server started (`npm run dev`)
- [ ] Test anonymous user creation
- [ ] Test song request creation
- [ ] Test lyrics generation (demo mode)
- [ ] Razorpay keys configured (if using payments)
- [ ] Test payment flow (if using payments)

---

## 🎉 You're Ready!

Once all steps are completed, you can:
1. Visit http://localhost:3000
2. Fill the song creation form
3. Generate lyrics (demo mode)
4. Complete payment (Razorpay test mode)
5. Generate song (demo mode)
6. View your songs in "My Songs" section

**Happy coding! 🎵**


