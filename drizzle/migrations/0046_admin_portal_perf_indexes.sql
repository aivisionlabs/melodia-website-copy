CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "payments_song_request_id_status_idx" ON "payments" USING btree ("song_request_id","status");--> statement-breakpoint
CREATE INDEX "song_requests_fulfillment_status_idx" ON "song_requests" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "song_requests_assignee_idx" ON "song_requests" USING btree ("assignee");--> statement-breakpoint
CREATE INDEX "song_requests_recipient_details_trgm_idx" ON "song_requests" USING gin ("recipient_details" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "songs_title_trgm_idx" ON "songs" USING gin ("title" gin_trgm_ops);