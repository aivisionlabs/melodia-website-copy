-- Migration: Add lyrics edits tracking to packages and song_requests
-- Description: 
--   1. Adds allowed_lyrics_edits column to packages table
--   2. Adds lyrics_edits_used column to song_requests table
--   3. Updates existing packages with default values (2 for ₹299, 4 for ₹499)
-- Date: 2025-11-06

-- Step 1: Add allowed_lyrics_edits to packages table
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "allowed_lyrics_edits" integer DEFAULT 2;

-- Step 2: Add lyrics_edits_used to song_requests table
ALTER TABLE "song_requests" ADD COLUMN IF NOT EXISTS "lyrics_edits_used" integer DEFAULT 0;

-- Step 3: Update existing package_299 to have 2 edits
UPDATE "packages" 
SET "allowed_lyrics_edits" = 2 
WHERE "slug" = 'package_299';

-- Step 4: Create package_499 if it doesn't exist with 4 edits
INSERT INTO "packages" ("name", "slug", "price", "currency", "description", "allowed_lyrics_edits", "active", "sequence")
VALUES (
  'Premium Package',
  'package_499',
  499.00,
  'INR',
  'Premium song generation package with more edits',
  4,
  true,
  2
)
ON CONFLICT ("slug") DO UPDATE 
SET "allowed_lyrics_edits" = 4;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS "song_requests_lyrics_edits_used_idx" ON "song_requests"("lyrics_edits_used");

