ALTER TABLE "templated_instance_feedback_events" ADD COLUMN "partner_api_order_id" integer;--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" DROP CONSTRAINT "templated_feedback_events_actor_check";--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_events" ADD CONSTRAINT "templated_feedback_events_actor_check" CHECK ("user_id" IS NOT NULL OR "anonymous_user_id" IS NOT NULL OR "partner_api_order_id" IS NOT NULL);
