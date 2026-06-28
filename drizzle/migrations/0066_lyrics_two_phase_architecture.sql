ALTER TABLE "lyrics_drafts" RENAME COLUMN "generated_text" TO "model_ready_lyrics";--> statement-breakpoint
ALTER TABLE "lyrics_drafts" ALTER COLUMN "model_ready_lyrics" DROP NOT NULL;