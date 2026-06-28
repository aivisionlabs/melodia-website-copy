CREATE TYPE "public"."rj_show_revision_status" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "rj_show_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"rj_show_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"status" "rj_show_revision_status" DEFAULT 'in_progress' NOT NULL,
	"changed_fields" text[],
	"changed_segments" jsonb,
	"revised_segment_count" integer DEFAULT 0 NOT NULL,
	"before_snapshot" jsonb,
	"notes" text,
	"initiated_by" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rj_shows" ADD COLUMN "revision_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "templated_song_categories" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rj_show_revisions" ADD CONSTRAINT "rj_show_revisions_rj_show_id_rj_shows_id_fk" FOREIGN KEY ("rj_show_id") REFERENCES "public"."rj_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rj_show_revisions_show_idx" ON "rj_show_revisions" USING btree ("rj_show_id");