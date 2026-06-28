-- Migration: Update packages to ₹599 and ₹999 instead of ₹499
-- Description: 
--   1. Deletes package_499 if exists
--   2. Creates package_599 with 4 edits
--   3. Creates package_999 with 6 edits (multiple iterations)
-- Date: 2025-11-06

-- Step 1: Delete package_499 if it exists
DELETE FROM "packages" WHERE "slug" = 'package_499';

-- Step 2: Create package_599 (Expert Review) with 4 edits
INSERT INTO "packages" ("name", "slug", "price", "currency", "description", "allowed_lyrics_edits", "active", "sequence")
VALUES (
  'Expert Review',
  'package_599',
  599.00,
  'INR',
  'Expert review of lyrics and music with up to 4 songs',
  4,
  true,
  2
)
ON CONFLICT ("slug") DO UPDATE 
SET 
  "name" = 'Expert Review',
  "price" = 599.00,
  "description" = 'Expert review of lyrics and music with up to 4 songs',
  "allowed_lyrics_edits" = 4,
  "sequence" = 2;

-- Step 3: Create package_999 (Premium) with 6 edits (multiple iterations)
INSERT INTO "packages" ("name", "slug", "price", "currency", "description", "allowed_lyrics_edits", "active", "sequence")
VALUES (
  'Premium',
  'package_999',
  999.00,
  'INR',
  'Premium package with multiple iterations and dedicated expert support',
  6,
  true,
  3
)
ON CONFLICT ("slug") DO UPDATE 
SET 
  "name" = 'Premium',
  "price" = 999.00,
  "description" = 'Premium package with multiple iterations and dedicated expert support',
  "allowed_lyrics_edits" = 6,
  "sequence" = 3;

