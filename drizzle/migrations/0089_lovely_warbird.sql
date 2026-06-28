ALTER TABLE "blog_posts" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "templated_songs" ADD COLUMN "is_namedrop_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "templated_songs_namedrop_idx" ON "templated_songs" USING btree ("is_namedrop_eligible");