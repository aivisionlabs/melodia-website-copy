-- Migration: fix_blog_posts_published
-- Restored after migration file was lost due to branch conflicts.
-- Original fix intent unknown; 0052 already defines published with default false.
-- No schema change needed; this no-op allows the migration to be marked applied.

SELECT 1;
