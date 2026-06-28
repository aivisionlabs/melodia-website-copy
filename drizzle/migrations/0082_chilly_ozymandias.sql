ALTER TABLE "rj_voice_profiles" ADD COLUMN "languages" text[];--> statement-breakpoint
ALTER TABLE "rj_voice_profiles" ADD COLUMN "sample_audios" jsonb;
