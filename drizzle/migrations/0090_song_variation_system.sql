ALTER TABLE "packages" ADD COLUMN "allowed_variations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "parent_request_id" integer;--> statement-breakpoint
ALTER TABLE "song_requests" ADD COLUMN "variations_used" integer DEFAULT 0 NOT NULL;