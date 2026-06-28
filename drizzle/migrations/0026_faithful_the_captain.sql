ALTER TABLE "audit_log_events" DROP COLUMN "actor_type";--> statement-breakpoint
ALTER TABLE "audit_log_events" DROP COLUMN "actor_id";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "requested_by";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "source_channel";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "due_by";--> statement-breakpoint
ALTER TABLE "change_requests" DROP COLUMN "resolution_notes";