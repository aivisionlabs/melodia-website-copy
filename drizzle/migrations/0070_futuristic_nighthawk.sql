CREATE TYPE "public"."rj_show_segment_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rj_show_segment_type" AS ENUM('tts', 'song', 'user_voice');--> statement-breakpoint
CREATE TYPE "public"."rj_show_status" AS ENUM('script_pending', 'script_generating', 'script_ready', 'script_approved', 'producing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."templated_feedback_decision" AS ENUM('liked', 'disliked');--> statement-breakpoint
CREATE TYPE "public"."templated_feedback_event_type" AS ENUM('variant_listened', 'variant_rated', 'variant_decision');--> statement-breakpoint
CREATE TABLE "rj_show_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"rj_show_id" integer NOT NULL,
	"segment_order" integer NOT NULL,
	"segment_type" "rj_show_segment_type" NOT NULL,
	"content" text,
	"label" text,
	"audio_url" text,
	"audio_format" text,
	"duration_seconds" numeric(10, 2),
	"status" "rj_show_segment_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"tts_voice_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rj_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_order_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"status" "rj_show_status" DEFAULT 'script_pending' NOT NULL,
	"recipient_name" text NOT NULL,
	"story_details" text NOT NULL,
	"paragraphs" integer NOT NULL,
	"youtube_links" jsonb,
	"user_voice_url" text,
	"generated_script" jsonb,
	"approved_script" jsonb,
	"final_audio_url" text,
	"final_audio_duration_seconds" numeric(10, 2),
	"slug" text NOT NULL,
	"error_message" text,
	"failed_step" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rj_shows_partner_order_id_unique" UNIQUE("partner_order_id"),
	CONSTRAINT "rj_shows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "templated_instance_feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"templated_song_instance_id" integer NOT NULL,
	"variant_index" smallint NOT NULL,
	"event_type" "templated_feedback_event_type" NOT NULL,
	"decision" "templated_feedback_decision",
	"rating" smallint,
	"reason_codes" text[],
	"other_text" text,
	"positive_aspects" text[],
	"positive_other_text" text,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"client_session_id" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templated_feedback_events_actor_check" CHECK ("templated_instance_feedback_events"."user_id" IS NOT NULL OR "templated_instance_feedback_events"."anonymous_user_id" IS NOT NULL),
	CONSTRAINT "templated_feedback_events_variant_check" CHECK ("templated_instance_feedback_events"."variant_index" IN (0, 1)),
	CONSTRAINT "templated_feedback_events_rating_check" CHECK ("templated_instance_feedback_events"."rating" IS NULL OR ("templated_instance_feedback_events"."rating" >= 1 AND "templated_instance_feedback_events"."rating" <= 5))
);
--> statement-breakpoint
ALTER TABLE "lyrics_drafts" RENAME COLUMN "generated_text" TO "model_ready_lyrics";--> statement-breakpoint
ALTER TABLE "user_song_variant_reviews" RENAME COLUMN "selected" TO "positive_aspects";--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "lyrics_input_mode" text DEFAULT 'story' NOT NULL;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "input_lyrics" text;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "namedrop_template_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "namedrop_singalong_lyrics_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "language_preferences" text;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "music_style_chips" text[];--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "music_style_notes" text;--> statement-breakpoint
ALTER TABLE "user_song_variant_reviews" ADD COLUMN "positive_other_text" text;--> statement-breakpoint
ALTER TABLE "rj_show_segments" ADD CONSTRAINT "rj_show_segments_rj_show_id_rj_shows_id_fk" FOREIGN KEY ("rj_show_id") REFERENCES "public"."rj_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD CONSTRAINT "rj_shows_partner_order_id_partner_api_orders_id_fk" FOREIGN KEY ("partner_order_id") REFERENCES "public"."partner_api_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rj_shows" ADD CONSTRAINT "rj_shows_vendor_id_partner_api_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."partner_api_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_templated_song_instance_id_templated_song_instances_id_fk" FOREIGN KEY ("templated_song_instance_id") REFERENCES "public"."templated_song_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rj_show_segments_show_id_idx" ON "rj_show_segments" USING btree ("rj_show_id");--> statement-breakpoint
CREATE INDEX "rj_show_segments_show_order_idx" ON "rj_show_segments" USING btree ("rj_show_id","segment_order");--> statement-breakpoint
CREATE INDEX "rj_shows_vendor_id_idx" ON "rj_shows" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "rj_shows_status_idx" ON "rj_shows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rj_shows_partner_order_idx" ON "rj_shows" USING btree ("partner_order_id");--> statement-breakpoint
CREATE INDEX "templated_feedback_events_instance_idx" ON "templated_instance_feedback_events" USING btree ("templated_song_instance_id");--> statement-breakpoint
CREATE INDEX "templated_feedback_events_instance_variant_created_at_idx" ON "templated_instance_feedback_events" USING btree ("templated_song_instance_id","variant_index","created_at");--> statement-breakpoint
ALTER TABLE "partner_api_orders" DROP COLUMN IF EXISTS "templated_song_instance_id";--> statement-breakpoint
ALTER TABLE "partner_api_orders" DROP COLUMN IF EXISTS "rj_show_id";--> statement-breakpoint
DROP INDEX IF EXISTS "partner_api_orders_instance_id_idx";--> statement-breakpoint
ALTER TABLE "templated_song_instances" DROP COLUMN "selected_variant";--> statement-breakpoint
ALTER TABLE "user_songs" DROP COLUMN "selected_variant";