CREATE TABLE "templated_song_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"templated_song_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "templated_song_categories" ADD CONSTRAINT "templated_song_categories_templated_song_id_templated_songs_id_fk" FOREIGN KEY ("templated_song_id") REFERENCES "public"."templated_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templated_song_categories" ADD CONSTRAINT "templated_song_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "templated_song_categories_templated_song_id_category_id_unique" ON "templated_song_categories" USING btree ("templated_song_id","category_id");--> statement-breakpoint
CREATE INDEX "templated_song_categories_templated_song_id_idx" ON "templated_song_categories" USING btree ("templated_song_id");--> statement-breakpoint
CREATE INDEX "templated_song_categories_category_id_idx" ON "templated_song_categories" USING btree ("category_id");