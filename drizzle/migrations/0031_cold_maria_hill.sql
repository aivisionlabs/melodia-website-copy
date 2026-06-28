CREATE TABLE "persona_associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"persona_id" integer NOT NULL,
	"song_id" integer,
	"user_song_id" integer
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"suno_persona_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"source_task_id" text,
	"source_audio_id" text,
	CONSTRAINT "personas_suno_persona_id_unique" UNIQUE("suno_persona_id")
);
--> statement-breakpoint
CREATE TABLE "song_request_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"song_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "song_request_songs_song_request_id_song_id_unique" UNIQUE("song_request_id","song_id")
);
--> statement-breakpoint
ALTER TABLE "song_requests" ALTER COLUMN "delivery_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "persona_associations" ADD CONSTRAINT "persona_associations_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_associations" ADD CONSTRAINT "persona_associations_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_associations" ADD CONSTRAINT "persona_associations_user_song_id_user_songs_id_fk" FOREIGN KEY ("user_song_id") REFERENCES "public"."user_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_request_songs" ADD CONSTRAINT "song_request_songs_song_request_id_song_requests_id_fk" FOREIGN KEY ("song_request_id") REFERENCES "public"."song_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_request_songs" ADD CONSTRAINT "song_request_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "persona_song_unique" ON "persona_associations" USING btree ("persona_id","song_id");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_user_song_unique" ON "persona_associations" USING btree ("persona_id","user_song_id");--> statement-breakpoint
DROP TYPE "public"."change_request_status";