ALTER TABLE "song_requests" ADD COLUMN "lyrics_input_mode" text DEFAULT 'story' NOT NULL;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "input_lyrics" text;