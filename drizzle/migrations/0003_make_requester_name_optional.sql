-- Migration: Make requester_name optional in song_requests table
-- Description: Changes requester_name from NOT NULL to nullable to allow optional requester names
-- Date: 2025-01-29

ALTER TABLE "song_requests" ALTER COLUMN "requester_name" DROP NOT NULL;
