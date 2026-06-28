ALTER TABLE "partner_api_orders" ADD COLUMN "occasion" text;--> statement-breakpoint
CREATE INDEX "song_requests_user_id_idx" ON "song_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "song_requests_anonymous_user_id_idx" ON "song_requests" USING btree ("anonymous_user_id");--> statement-breakpoint
CREATE INDEX "templated_song_instances_user_id_idx" ON "templated_song_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templated_song_instances_anonymous_user_id_idx" ON "templated_song_instances" USING btree ("anonymous_user_id");--> statement-breakpoint
ALTER TABLE "partner_api_orders" DROP COLUMN "category_slug";