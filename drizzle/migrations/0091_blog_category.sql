-- Add category column to blog_posts
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" ("category");

-- Backfill categories based on slug patterns
UPDATE "blog_posts" SET "category" = 'mothers-day'
WHERE "slug" LIKE '%mothers-day%' OR "slug" LIKE '%-maa%';

UPDATE "blog_posts" SET "category" = 'devotional'
WHERE "slug" LIKE '%bhajan%'
   OR "slug" LIKE '%devotional%'
   OR "slug" LIKE '%pooja%'
   OR "slug" LIKE '%puja%'
   OR "slug" LIKE '%navratri%'
   OR "slug" LIKE '%ganesh%'
   OR "slug" LIKE '%krishna%'
   OR "slug" LIKE '%vishnu%'
   OR "slug" LIKE '%hanuman%'
   OR "slug" LIKE '%shiv%'
   OR "slug" LIKE '%-ram-%'
   OR "slug" LIKE '%lakshmi%'
   OR "slug" LIKE '%radha%'
   OR "slug" LIKE '%sai-baba%'
   OR "slug" LIKE '%guru-purnima%'
   OR "slug" LIKE '%griha-pravesh%'
   OR "slug" LIKE '%morning-prayer%'
   OR "slug" LIKE '%suprabhatam%'
   OR "slug" LIKE '%saraswati%'
   OR "slug" LIKE '%mata-ki%'
   OR "slug" LIKE '%temple%';

UPDATE "blog_posts" SET "category" = 'birthday'
WHERE "slug" LIKE '%birthday%'
   OR "slug" LIKE '%saalgirah%';

UPDATE "blog_posts" SET "category" = 'how-to'
WHERE "slug" LIKE '%how-to%'
   OR "slug" LIKE '%ai-song%'
   OR "slug" LIKE '%make-an-ai%';
