CREATE TABLE "templated_song_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"template_id" integer NOT NULL,
	"recipient_name" text NOT NULL,
	"replaced_lyrics" text NOT NULL,
	"song_title" text NOT NULL,
	"persona_id" integer,
	"suno_task_id" text,
	"status" text DEFAULT 'processing',
	"slug" text NOT NULL,
	"song_variants" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_api_response" jsonb DEFAULT '{}'::jsonb,
	"variant_timestamp_lyrics_processed" jsonb DEFAULT '{}'::jsonb,
	"selected_variant" integer,
	"user_id" integer,
	"anonymous_user_id" uuid,
	"metadata" jsonb,
	CONSTRAINT "templated_song_instances_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "templated_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"template_lyrics" text,
	"draft_lyrics" text,
	"persona_id" integer,
	"music_style" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"slug" text NOT NULL,
	"suno_task_id" text,
	"song_variants" jsonb,
	"selected_variant" integer,
	"template_timestamp_lyrics" jsonb,
	CONSTRAINT "templated_songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "templated_song_instances" ADD CONSTRAINT "templated_song_instances_template_id_templated_songs_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templated_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_song_instances" ADD CONSTRAINT "templated_song_instances_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_song_instances" ADD CONSTRAINT "templated_song_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_song_instances" ADD CONSTRAINT "templated_song_instances_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_songs" ADD CONSTRAINT "templated_songs_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "templated_song_instances_template_id_idx" ON "templated_song_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templated_song_instances_suno_task_id_idx" ON "templated_song_instances" USING btree ("suno_task_id");--> statement-breakpoint
CREATE INDEX "templated_song_instances_status_idx" ON "templated_song_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "templated_songs_display_order_idx" ON "templated_songs" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "templated_songs_is_active_idx" ON "templated_songs" USING btree ("is_active");