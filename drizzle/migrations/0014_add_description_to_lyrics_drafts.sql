-- Migration: Add description column to lyrics_drafts
-- Description: Adds the missing description column to lyrics_drafts table to match code schema
-- Date: 2025-11-10

ALTER TABLE "lyrics_drafts" ADD COLUMN IF NOT EXISTS "description" text;

