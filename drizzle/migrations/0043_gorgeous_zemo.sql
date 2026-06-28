ALTER TABLE "song_requests" ADD COLUMN "source_song_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "persona_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "request_source" text;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_source_song_id_songs_id_fk" FOREIGN KEY ("source_song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_requests" ADD CONSTRAINT "song_requests_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;