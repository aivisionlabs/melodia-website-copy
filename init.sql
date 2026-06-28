-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  lyrics TEXT,
  timestamp_lyrics JSONB,
  music_style TEXT,
  service_provider TEXT DEFAULT 'SU',
  song_requester TEXT,
  prompt TEXT,
  song_url TEXT,
  duration INTEGER,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',
  categories TEXT[],
  tags TEXT[],
  suno_task_id TEXT,
  metadata JSONB
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_slug ON songs(slug);
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_is_active ON songs(is_active);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);

-- Insert some sample admin users (optional)
INSERT INTO admin_users (username, password_hash) VALUES
  ('admin1', 'melodia2024!'),
  ('admin2', 'melodia2024!'),
  ('admin3', 'melodia2024!')
ON CONFLICT (username) DO NOTHING;