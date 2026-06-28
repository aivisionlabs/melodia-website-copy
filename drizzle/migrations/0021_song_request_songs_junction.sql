-- Migration: Add song_request_songs junction table for many-to-many relationship
-- Description: Allows multiple songs to be linked to a single song request
-- Date: 2025-01-XX

-- Create junction table for song requests and songs
CREATE TABLE IF NOT EXISTS song_request_songs (
  id serial PRIMARY KEY,
  song_request_id integer NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE,
  song_id integer NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_request_songs_unique_request_song UNIQUE (song_request_id, song_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_song_request_songs_request_id ON song_request_songs(song_request_id);
CREATE INDEX IF NOT EXISTS idx_song_request_songs_song_id ON song_request_songs(song_id);

-- Migrate existing song_request_id links from songs table to junction table
-- This preserves existing links when migrating
INSERT INTO song_request_songs (song_request_id, song_id, created_at)
SELECT song_request_id, id, created_at
FROM songs
WHERE song_request_id IS NOT NULL
ON CONFLICT (song_request_id, song_id) DO NOTHING;

