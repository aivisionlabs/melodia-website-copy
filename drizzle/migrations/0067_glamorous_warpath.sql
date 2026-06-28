ALTER TABLE "templated_instance_feedback_state" DROP CONSTRAINT IF EXISTS "templated_feedback_state_selected_variant_check";--> statement-breakpoint
UPDATE "templated_instance_feedback_events" SET "decision" = 'liked' WHERE "decision"::text = 'selected';--> statement-breakpoint
UPDATE "templated_instance_feedback_state" SET "variant_0_decision" = 'liked' WHERE "variant_0_decision"::text = 'selected';--> statement-breakpoint
UPDATE "templated_instance_feedback_state" SET "variant_1_decision" = 'liked' WHERE "variant_1_decision"::text = 'selected';--> statement-breakpoint
UPDATE "templated_instance_feedback_events" SET "event_type" = 'variant_decision' WHERE "event_type"::text = 'final_selection';--> statement-breakpoint
DROP INDEX IF EXISTS "templated_feedback_events_final_selection_unique";--> statement-breakpoint
ALTER TABLE "templated_instance_feedback_state" DROP COLUMN IF EXISTS "selected_variant";--> statement-breakpoint
ALTER TABLE "templated_song_instances" DROP COLUMN IF EXISTS "selected_variant";--> statement-breakpoint
ALTER TABLE "user_song_variant_reviews" DROP COLUMN IF EXISTS "selected";--> statement-breakpoint
ALTER TABLE "user_songs" DROP COLUMN IF EXISTS "selected_variant";