CREATE TYPE "public"."templated_feedback_decision" AS ENUM('liked', 'disliked', 'selected');--> statement-breakpoint
CREATE TYPE "public"."templated_feedback_event_type" AS ENUM('variant_listened', 'variant_rated', 'variant_decision', 'final_selection');--> statement-breakpoint
CREATE TABLE "templated_instance_feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"templated_song_instance_id" integer NOT NULL,
	"variant_index" smallint NOT NULL,
	"event_type" "templated_feedback_event_type" NOT NULL,
	"decision" "templated_feedback_decision",
	"rating" smallint,
	"reason_codes" text[],
	"other_text" text,
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
CREATE TABLE "templated_instance_feedback_state" (
	"templated_song_instance_id" integer PRIMARY KEY NOT NULL,
	"variant_0_decision" "templated_feedback_decision",
	"variant_1_decision" "templated_feedback_decision",
	"variant_0_rating" smallint,
	"variant_1_rating" smallint,
	"selected_variant" smallint,
	"both_variants_reviewed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templated_feedback_state_selected_variant_check" CHECK ("templated_instance_feedback_state"."selected_variant" IS NULL OR "templated_instance_feedback_state"."selected_variant" IN (0, 1)),
	CONSTRAINT "templated_feedback_state_variant_0_rating_check" CHECK ("templated_instance_feedback_state"."variant_0_rating" IS NULL OR ("templated_instance_feedback_state"."variant_0_rating" >= 1 AND "templated_instance_feedback_state"."variant_0_rating" <= 5)),
	CONSTRAINT "templated_feedback_state_variant_1_rating_check" CHECK ("templated_instance_feedback_state"."variant_1_rating" IS NULL OR ("templated_instance_feedback_state"."variant_1_rating" >= 1 AND "templated_instance_feedback_state"."variant_1_rating" <= 5))
);
--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "namedrop_template_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "namedrop_singalong_lyrics_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_templated_song_instance_id_templated_song_instances_id_fk" FOREIGN KEY ("templated_song_instance_id") REFERENCES "public"."templated_song_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_instance_feedback_events_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_state" ADD CONSTRAINT "templated_instance_feedback_state_templated_song_instance_id_templated_song_instances_id_fk" FOREIGN KEY ("templated_song_instance_id") REFERENCES "public"."templated_song_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "templated_feedback_events_instance_idx" ON "templated_instance_feedback_events" USING btree ("templated_song_instance_id");--> statement-breakpoint
CREATE INDEX "templated_feedback_events_instance_variant_created_at_idx" ON "templated_instance_feedback_events" USING btree ("templated_song_instance_id","variant_index","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "templated_feedback_events_final_selection_unique" ON "templated_instance_feedback_events" USING btree ("templated_song_instance_id") WHERE "templated_instance_feedback_events"."event_type" = 'final_selection';