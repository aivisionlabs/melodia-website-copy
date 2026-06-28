-- Migration: Add Melodia App Tables
-- Description: Adds all tables from melodia-app integration
-- Date: 2025-01-28

-- ============================================
-- Users Table - Registered user accounts
-- ============================================
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_number" text,
	"profile_picture" text,
	"email_verified" boolean DEFAULT false,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- ============================================
-- Anonymous Users Table - Temporary sessions
-- ============================================
CREATE TABLE IF NOT EXISTS "anonymous_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================
-- Song Requests Table - Song generation requests
-- ============================================
CREATE TABLE IF NOT EXISTS "song_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"requester_name" text NOT NULL,
	"recipient_details" text NOT NULL,
	"occasion" text,
	"languages" text NOT NULL,
	"mood" text[],
	"song_story" text,
	"mobile_number" text,
	"email" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id"),
	FOREIGN KEY ("anonymous_user_id") REFERENCES "anonymous_users"("id")
);

-- ============================================
-- User Songs Table - Generated songs (separate from library)
-- ============================================
CREATE TABLE IF NOT EXISTS "user_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'processing',
	"is_featured" boolean DEFAULT false,
	"song_variants" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_api_response" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_processed" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb,
	"approved_lyrics_id" integer,
	"service_provider" text DEFAULT 'SU',
	"categories" text[],
	"tags" text[],
	"add_to_library" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"selected_variant" integer,
	"payment_id" integer,
	CONSTRAINT "user_songs_song_request_id_unique" UNIQUE("song_request_id"),
	CONSTRAINT "user_songs_slug_unique" UNIQUE("slug")
);

-- ============================================
-- Lyrics Drafts Table - Generated lyrics with versioning
-- ============================================
CREATE TABLE IF NOT EXISTS "lyrics_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"version" integer DEFAULT 1,
	"lyrics_edit_prompt" text,
	"generated_text" text NOT NULL,
	"song_title" text,
	"music_style" text,
	"language" text DEFAULT 'English',
	"llm_model_name" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================
-- Payments Table - Payment records
-- ============================================
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"razorpay_payment_id" text,
	"razorpay_order_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR',
	"status" text DEFAULT 'pending',
	"payment_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "payments_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);

-- ============================================
-- Payment Webhooks Table - Payment webhook logs
-- ============================================
CREATE TABLE IF NOT EXISTS "payment_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"razorpay_event_id" text,
	"event_type" text NOT NULL,
	"payment_id" integer,
	"webhook_data" jsonb NOT NULL,
	"processed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "payment_webhooks_razorpay_event_id_unique" UNIQUE("razorpay_event_id")
);

-- ============================================
-- Email Verification Codes Table - Email OTP codes
-- ============================================
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- ============================================
-- Rate Limit Violations Table - Rate limit tracking
-- ============================================
CREATE TABLE IF NOT EXISTS "rate_limit_violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"endpoint" text NOT NULL,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"violation_count" integer DEFAULT 1,
	"tier" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================
-- Blocked IPs Table - IP blocking
-- ============================================
CREATE TABLE IF NOT EXISTS "blocked_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"reason" text NOT NULL,
	"block_type" text DEFAULT 'temporary',
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"blocked_until" timestamp,
	"violation_count" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_ips_ip_address_unique" UNIQUE("ip_address")
);

-- ============================================
-- Rate Limit Analytics Table - Analytics
-- ============================================
CREATE TABLE IF NOT EXISTS "rate_limit_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"endpoint" text NOT NULL,
	"total_requests" integer DEFAULT 0,
	"blocked_requests" integer DEFAULT 0,
	"unique_ips" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");

-- Song requests indexes
CREATE INDEX IF NOT EXISTS "song_requests_user_id_idx" ON "song_requests"("user_id");
CREATE INDEX IF NOT EXISTS "song_requests_anonymous_user_id_idx" ON "song_requests"("anonymous_user_id");
CREATE INDEX IF NOT EXISTS "song_requests_status_idx" ON "song_requests"("status");
CREATE INDEX IF NOT EXISTS "song_requests_created_at_idx" ON "song_requests"("created_at");

-- User songs indexes
CREATE INDEX IF NOT EXISTS "user_songs_song_request_id_idx" ON "user_songs"("song_request_id");
CREATE INDEX IF NOT EXISTS "user_songs_slug_idx" ON "user_songs"("slug");
CREATE INDEX IF NOT EXISTS "user_songs_status_idx" ON "user_songs"("status");

-- Lyrics drafts indexes
CREATE INDEX IF NOT EXISTS "lyrics_drafts_song_request_id_idx" ON "lyrics_drafts"("song_request_id");
CREATE INDEX IF NOT EXISTS "lyrics_drafts_status_idx" ON "lyrics_drafts"("status");

-- Payments indexes
CREATE INDEX IF NOT EXISTS "payments_song_request_id_idx" ON "payments"("song_request_id");
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_razorpay_payment_id_idx" ON "payments"("razorpay_payment_id");

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS "rate_limit_violations_ip_address_idx" ON "rate_limit_violations"("ip_address");
CREATE INDEX IF NOT EXISTS "rate_limit_violations_endpoint_idx" ON "rate_limit_violations"("endpoint");
CREATE INDEX IF NOT EXISTS "blocked_ips_ip_address_idx" ON "blocked_ips"("ip_address");

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE "users" IS 'Registered user accounts';
COMMENT ON TABLE "anonymous_users" IS 'Temporary anonymous user sessions';
COMMENT ON TABLE "song_requests" IS 'Song generation requests from users';
COMMENT ON TABLE "user_songs" IS 'User-generated songs (separate from library songs)';
COMMENT ON TABLE "lyrics_drafts" IS 'AI-generated lyrics with versioning support';
COMMENT ON TABLE "payments" IS 'Payment records for Razorpay integration';
COMMENT ON TABLE "payment_webhooks" IS 'Payment webhook event logs';
COMMENT ON TABLE "email_verification_codes" IS 'Email verification OTP codes';
COMMENT ON TABLE "rate_limit_violations" IS 'Rate limit violation tracking';
COMMENT ON TABLE "blocked_ips" IS 'Blocked IP addresses';
COMMENT ON TABLE "rate_limit_analytics" IS 'Rate limiting analytics data';

