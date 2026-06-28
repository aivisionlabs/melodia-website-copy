-- Migration: Add performance indexes for library optimization
-- Description: Adds database indexes to improve query performance for library operations

-- Indexes for songs table filtering
CREATE INDEX IF NOT EXISTS idx_songs_add_to_library ON songs(add_to_library);
CREATE INDEX IF NOT EXISTS idx_songs_is_deleted ON songs(is_deleted);
CREATE INDEX IF NOT EXISTS idx_songs_sequence ON songs(sequence);
CREATE INDEX IF NOT EXISTS idx_songs_created_at_desc ON songs(created_at DESC);

-- Composite index for the main library query (add_to_library = true AND is_deleted = false)
CREATE INDEX IF NOT EXISTS idx_songs_library_filter ON songs(add_to_library, is_deleted, sequence, created_at);

-- Index for search queries using full-text search
CREATE INDEX IF NOT EXISTS idx_songs_title_search ON songs USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_songs_description_search ON songs USING gin(to_tsvector('english', song_description));

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_song_categories_song_id ON song_categories(song_id);
CREATE INDEX IF NOT EXISTS idx_song_categories_category_id ON song_categories(category_id);

-- Index for categories table
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sequence ON categories(sequence);

-- Index for song likes
CREATE INDEX IF NOT EXISTS idx_song_likes_song_id ON song_likes(song_id);
CREATE INDEX IF NOT EXISTS idx_song_likes_user_ip ON song_likes(user_ip);

-- Partial indexes for better performance (only index active records)
CREATE INDEX IF NOT EXISTS idx_songs_active_library ON songs(sequence, created_at)
WHERE add_to_library = true AND is_deleted = false;

-- Ensure slug index exists (should already exist)
CREATE INDEX IF NOT EXISTS idx_songs_slug ON songs(slug);
