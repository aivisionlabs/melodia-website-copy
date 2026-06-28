CREATE TABLE "song_feedback_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "song_feedback_reasons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
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
ALTER TABLE "lyrics_drafts" ADD COLUMN "description" text;