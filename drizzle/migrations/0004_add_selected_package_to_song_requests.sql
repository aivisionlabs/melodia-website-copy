-- Migration: Add selected_package column to song_requests
-- Description: Adds a nullable text column to store selected package info
-- Date: 2025-11-02

ALTER TABLE "song_requests" ADD COLUMN IF NOT EXISTS "selected_package" text;


