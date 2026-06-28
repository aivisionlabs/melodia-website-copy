-- Migration: Create blog_posts table (SEO blog content)
-- Restored after migration file was lost due to branch conflicts

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "meta_description" text,
  "content" text NOT NULL,
  "published" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_unique" ON "blog_posts" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_published_idx" ON "blog_posts" USING btree ("published");
