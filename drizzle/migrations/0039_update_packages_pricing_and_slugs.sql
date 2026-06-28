-- Migration: Update Package Pricing, Slugs, and Flags
-- Description:
--   1. Update package_299 to package_1 with price 599 (expert_created: false, self_serve: true)
--   2. Update package_599 to package_2 with price 799 (expert_created: false, self_serve: true)
--   3. Update package_999 to package_3 with price 1599 (expert_created: true, self_serve: false)
--   4. Create employee package_internal if it doesn't exist
-- Date: 2025-01-XX

-- Step 1: Update package_299 to package_1 with new price and flags
UPDATE "packages"
SET
  "slug" = 'package_1',
  "price" = 599.00,
  "expert_created" = false,
  "self_serve" = true,
  "updated_at" = now()
WHERE "slug" = 'package_299';

-- Step 2: Update package_599 to package_2 with new price and flags
UPDATE "packages"
SET
  "slug" = 'package_2',
  "price" = 799.00,
  "expert_created" = false,
  "self_serve" = true,
  "updated_at" = now()
WHERE "slug" = 'package_599';

-- Step 3: Update package_999 to package_3 with new price and flags
UPDATE "packages"
SET
  "slug" = 'package_3',
  "price" = 1599.00,
  "expert_created" = true,
  "self_serve" = false,
  "updated_at" = now()
WHERE "slug" = 'package_999';

-- Step 4: Create employee package_internal if it doesn't exist
INSERT INTO "packages" ("name", "slug", "price", "currency", "description", "allowed_lyrics_edits", "expert_created", "self_serve", "active", "sequence")
VALUES (
  'Employee Package',
  'package_internal',
  1.00,
  'INR',
  'Internal employee package for testing and internal use',
  2,
  false,
  true,
  true,
  0
)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = 'Employee Package',
  "price" = 1.00,
  "description" = 'Internal employee package for testing and internal use',
  "allowed_lyrics_edits" = 2,
  "expert_created" = false,
  "self_serve" = true,
  "active" = true,
  "sequence" = 0;
