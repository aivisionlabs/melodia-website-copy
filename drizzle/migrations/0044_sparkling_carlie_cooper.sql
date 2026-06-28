CREATE INDEX "lyrics_drafts_song_request_id_version_idx" ON "lyrics_drafts" USING btree ("song_request_id","version");--> statement-breakpoint
CREATE INDEX "persona_associations_song_id_idx" ON "persona_associations" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "persona_associations_user_song_id_idx" ON "persona_associations" USING btree ("user_song_id");--> statement-breakpoint
CREATE INDEX "song_feedback_reasons_active_idx" ON "song_feedback_reasons" USING btree ("active");--> statement-breakpoint
CREATE INDEX "songs_suno_task_id_idx" ON "songs" USING btree ("suno_task_id");--> statement-breakpoint
CREATE INDEX "songs_song_request_id_idx" ON "songs" USING btree ("song_request_id");--> statement-breakpoint
CREATE INDEX "songs_user_song_id_idx" ON "songs" USING btree ("user_song_id");--> statement-breakpoint
CREATE INDEX "songs_library_sort_idx" ON "songs" USING btree ("likes_count","sequence","created_at") WHERE "songs"."add_to_library" = true AND "songs"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "user_song_variant_reviews_song_id_idx" ON "user_song_variant_reviews" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "user_song_variant_reviews_song_id_created_at_idx" ON "user_song_variant_reviews" USING btree ("song_id","created_at");