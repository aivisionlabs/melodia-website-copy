-- Migration: Add partner tracking to song_requests table
-- Description: Links song requests to partners and partner visits
-- Date: 2025-01-XX

-- Add partner_id column to song_requests
ALTER TABLE "song_requests" ADD COLUMN IF NOT EXISTS "partner_id" integer;

-- Add partner_visit_id column to song_requests
ALTER TABLE "song_requests" ADD COLUMN IF NOT EXISTS "partner_visit_id" integer;

-- Add foreign key constraints
ALTER TABLE "song_requests"
ADD CONSTRAINT "song_requests_partner_id_partners_id_fk"
FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL;

ALTER TABLE "song_requests"
ADD CONSTRAINT "song_requests_partner_visit_id_partner_visits_id_fk"
FOREIGN KEY ("partner_visit_id") REFERENCES "partner_visits"("id") ON DELETE SET NULL;

-- Create indexes for better query performance (only if columns exist)
-- The migration script will skip these if columns don't exist
CREATE INDEX IF NOT EXISTS "song_requests_partner_id_idx" ON "song_requests"("partner_id");
CREATE INDEX IF NOT EXISTS "song_requests_partner_visit_id_idx" ON "song_requests"("partner_visit_id");

