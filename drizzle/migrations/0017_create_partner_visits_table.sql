-- Migration: Create partner_visits table
-- Description: Tracks UTM parameters and visits from partners
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS "partner_visits" ("id" serial PRIMARY KEY NOT NULL, "partner_id" integer, "anonymous_user_id" uuid, "user_id" integer, "utm_source" text, "utm_medium" text, "utm_campaign" text, "utm_content" text, "utm_term" text, "referrer" text, "landing_page" text, "ip_address" text, "user_agent" text, "first_visit_at" timestamp DEFAULT now() NOT NULL, "last_visit_at" timestamp DEFAULT now() NOT NULL, "visit_count" integer DEFAULT 1, "converted" boolean DEFAULT false, "song_request_id" integer, "payment_id" integer, "metadata" jsonb);

-- Add foreign key constraints
-- The migration script will skip these if they fail (e.g., if constraint already exists)
ALTER TABLE "partner_visits"
ADD CONSTRAINT "partner_visits_partner_id_partners_id_fk"
FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL;

ALTER TABLE "partner_visits"
ADD CONSTRAINT "partner_visits_anonymous_user_id_anonymous_users_id_fk"
FOREIGN KEY ("anonymous_user_id") REFERENCES "anonymous_users"("id") ON DELETE SET NULL;

ALTER TABLE "partner_visits"
ADD CONSTRAINT "partner_visits_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "partner_visits"
ADD CONSTRAINT "partner_visits_song_request_id_song_requests_id_fk"
FOREIGN KEY ("song_request_id") REFERENCES "song_requests"("id") ON DELETE SET NULL;

ALTER TABLE "partner_visits"
ADD CONSTRAINT "partner_visits_payment_id_payments_id_fk"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "partner_visits_partner_id_idx" ON "partner_visits"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_visits_anonymous_user_id_idx" ON "partner_visits"("anonymous_user_id");
CREATE INDEX IF NOT EXISTS "partner_visits_user_id_idx" ON "partner_visits"("user_id");
CREATE INDEX IF NOT EXISTS "partner_visits_converted_idx" ON "partner_visits"("converted");
CREATE INDEX IF NOT EXISTS "partner_visits_utm_source_idx" ON "partner_visits"("utm_source");
CREATE INDEX IF NOT EXISTS "partner_visits_first_visit_at_idx" ON "partner_visits"("first_visit_at");

