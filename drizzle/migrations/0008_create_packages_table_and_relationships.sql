-- Migration: Create packages table and connect to song_requests and payments
-- Description: 
--   1. Creates packages table for pricing plans
--   2. Adds package_id foreign key to song_requests table
--   3. Adds package_id foreign key to payments table
--   4. Populates packages table from existing selected_package values
--   5. Migrates existing song_requests data from selected_package to package_id
-- Date: 2025-11-06

-- Step 1: Create packages table
CREATE TABLE IF NOT EXISTS "packages" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "price" numeric(10, 2) NOT NULL,
  "currency" text DEFAULT 'INR',
  "description" text,
  "features" jsonb,
  "active" boolean DEFAULT true,
  "sequence" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Step 2: Add package_id column to song_requests table
ALTER TABLE "song_requests" ADD COLUMN IF NOT EXISTS "package_id" integer;

-- Step 3: Add package_id column to payments table
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "package_id" integer;

-- Step 4: Create initial package from existing data (package_299)
-- Based on the slug "package_299", we'll create a package with price 299
INSERT INTO "packages" ("name", "slug", "price", "currency", "description", "active", "sequence")
VALUES (
  'Standard Package',
  'package_299',
  299.00,
  'INR',
  'Standard song generation package',
  true,
  1
)
ON CONFLICT ("slug") DO NOTHING;

-- Step 5: Add foreign key constraints after data migration
-- First, update existing song_requests to link to package
UPDATE "song_requests" 
SET "package_id" = (SELECT "id" FROM "packages" WHERE "slug" = "song_requests"."selected_package")
WHERE "selected_package" IS NOT NULL 
  AND EXISTS (SELECT 1 FROM "packages" WHERE "slug" = "song_requests"."selected_package");

-- Step 6: Add foreign key constraint to song_requests
ALTER TABLE "song_requests" 
ADD CONSTRAINT "song_requests_package_id_packages_id_fk" 
FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL;

-- Step 7: Add foreign key constraint to payments
ALTER TABLE "payments" 
ADD CONSTRAINT "payments_package_id_packages_id_fk" 
FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL;

-- Step 8: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "song_requests_package_id_idx" ON "song_requests"("package_id");
CREATE INDEX IF NOT EXISTS "payments_package_id_idx" ON "payments"("package_id");

