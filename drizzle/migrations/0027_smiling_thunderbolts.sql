ALTER TABLE "change_requests" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "status";