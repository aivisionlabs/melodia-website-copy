CREATE TABLE "lyrics_draft_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"lyrics_draft_id" integer NOT NULL,
	"review_report" jsonb,
	"review_model_name" text,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lyrics_draft_reviews" ADD CONSTRAINT "lyrics_draft_reviews_lyrics_draft_id_lyrics_drafts_id_fk" FOREIGN KEY ("lyrics_draft_id") REFERENCES "public"."lyrics_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lyrics_draft_reviews_lyrics_draft_id_unique" ON "lyrics_draft_reviews" USING btree ("lyrics_draft_id");--> statement-breakpoint
CREATE INDEX "lyrics_draft_reviews_lyrics_draft_id_idx" ON "lyrics_draft_reviews" USING btree ("lyrics_draft_id");