-- Migration: Add payment foreign key constraints
-- Description: Adds foreign key relationships between payments, song_requests, user_songs, and lyrics_drafts
-- Date: 2025-01-28
-- Note: If constraints already exist, the migration runner will handle the error gracefully

-- Step 1: Add foreign key: payments.song_request_id → song_requests.id
-- ON DELETE SET NULL: Payment record should remain even if song_request is deleted (for audit/refund purposes)
ALTER TABLE "payments"
ADD CONSTRAINT "payments_song_request_id_song_requests_id_fk"
FOREIGN KEY ("song_request_id") REFERENCES "song_requests"("id") ON DELETE SET NULL;

-- Step 2: Add foreign key: user_songs.payment_id → payments.id
-- ON DELETE SET NULL: Song can exist without payment (free songs, etc.)
ALTER TABLE "user_songs"
ADD CONSTRAINT "user_songs_payment_id_payments_id_fk"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL;

-- Step 3: Add index for user_songs.payment_id (for query performance)
CREATE INDEX IF NOT EXISTS "user_songs_payment_id_idx" ON "user_songs"("payment_id");

-- Step 4: Add foreign key: user_songs.song_request_id → song_requests.id
-- ON DELETE CASCADE: If song_request is deleted, the associated song should be deleted
ALTER TABLE "user_songs"
ADD CONSTRAINT "user_songs_song_request_id_song_requests_id_fk"
FOREIGN KEY ("song_request_id") REFERENCES "song_requests"("id") ON DELETE CASCADE;

-- Step 5: Add foreign key: lyrics_drafts.song_request_id → song_requests.id
-- ON DELETE CASCADE: If song_request is deleted, all associated lyrics drafts should be deleted
ALTER TABLE "lyrics_drafts"
ADD CONSTRAINT "lyrics_drafts_song_request_id_song_requests_id_fk"
FOREIGN KEY ("song_request_id") REFERENCES "song_requests"("id") ON DELETE CASCADE;

