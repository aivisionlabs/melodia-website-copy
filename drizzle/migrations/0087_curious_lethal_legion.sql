CREATE TYPE "public"."templated_promotion_tag" AS ENUM('trending', 'most_preferred', 'new');--> statement-breakpoint
ALTER TABLE "templated_song_categories" ADD COLUMN "promotion_tag" "templated_promotion_tag";--> statement-breakpoint
ALTER TABLE "templated_song_categories" ADD COLUMN "suppress_auto_new" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "templated_songs" ADD COLUMN "first_activated_at" timestamp;-- Backfill activation timestamp for templates already active
UPDATE "templated_songs" SET "first_activated_at" = "created_at" WHERE "is_active" = true AND "first_activated_at" IS NULL;
