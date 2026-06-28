-- Migration: Create partners table
-- Description: Stores information about partner cake shops and Instagram influencers
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS "partners" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "instagram_handle" text,
  "business_address" text,
  "active" boolean DEFAULT true,
  "commission_rate" numeric(5, 2),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS "partners_slug_idx" ON "partners"("slug");

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS "partners_type_idx" ON "partners"("type");

-- Create index on active status
CREATE INDEX IF NOT EXISTS "partners_active_idx" ON "partners"("active");

