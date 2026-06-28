CREATE TABLE "user_song_variant_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_id" integer NOT NULL,
	"variant_index" integer NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"reason_codes" text[],
	"other_text" text,
	"rating" integer,
	"selected" boolean DEFAULT false,
	"created_by_user_id" integer,
	"anonymous_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "songs" ALTER COLUMN "service_provider" SET DEFAULT 'Melodia';--> statement-breakpoint
ALTER TABLE "lyrics_drafts" ADD COLUMN "description" text;