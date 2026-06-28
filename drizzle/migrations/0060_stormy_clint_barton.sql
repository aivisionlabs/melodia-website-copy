CREATE TABLE "llm_pipeline_step_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"song_request_id" integer NOT NULL,
	"lyrics_draft_id" integer,
	"pipeline_run_id" uuid,
	"step_name" text NOT NULL,
	"step_order" integer,
	"input_summary" jsonb,
	"output_snapshot" jsonb NOT NULL,
	"model_name" text,
	"duration_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_pipeline_step_outputs" ADD CONSTRAINT "llm_pipeline_step_outputs_song_request_id_song_requests_id_fk" FOREIGN KEY ("song_request_id") REFERENCES "public"."song_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_pipeline_step_outputs" ADD CONSTRAINT "llm_pipeline_step_outputs_lyrics_draft_id_lyrics_drafts_id_fk" FOREIGN KEY ("lyrics_draft_id") REFERENCES "public"."lyrics_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_pipeline_step_outputs_song_request_id_idx" ON "llm_pipeline_step_outputs" USING btree ("song_request_id");--> statement-breakpoint
CREATE INDEX "llm_pipeline_step_outputs_step_name_idx" ON "llm_pipeline_step_outputs" USING btree ("step_name");--> statement-breakpoint
CREATE INDEX "llm_pipeline_step_outputs_created_at_idx" ON "llm_pipeline_step_outputs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_pipeline_step_outputs_pipeline_run_id_idx" ON "llm_pipeline_step_outputs" USING btree ("pipeline_run_id");--> statement-breakpoint
CREATE INDEX "llm_pipeline_step_outputs_lyrics_draft_id_idx" ON "llm_pipeline_step_outputs" USING btree ("lyrics_draft_id");