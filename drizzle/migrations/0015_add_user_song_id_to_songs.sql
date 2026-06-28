-- Migration: Add user_song_id column to songs table
-- Description: Adds user_song_id field to track which user_song was migrated to the songs table
-- Date: 2025-01-XX

ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "user_song_id" integer;

