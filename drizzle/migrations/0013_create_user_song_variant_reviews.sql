-- Migration: Create user_song_variant_reviews table if missing
-- Description:
--   Ensures user_song_variant_reviews exists in databases that were baselined
--   before the table was created in earlier migrations.
-- Date: 2025-11-09
CREATE TABLE IF NOT EXISTS "user_song_variant_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "song_id" integer NOT NULL,
  "variant_index" integer NOT NULL,
  "accepted" boolean DEFAULT false NOT NULL,
  "reason_codes" text[],
  "other_text" text,
  "rating" integer,
  "selected" boolean DEFAULT false,
  "created_by_user_id" integer,
  "anonymous_user_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);


