import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPostsTable } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * GET /api/blog
 * Returns published blog posts for public listing (SEO).
 */
export async function GET(_req: NextRequest) {
  try {
    const posts = await db
      .select({
        id: blogPostsTable.id,
        title: blogPostsTable.title,
        slug: blogPostsTable.slug,
        meta_description: blogPostsTable.meta_description,
        category: blogPostsTable.category,
        published: blogPostsTable.published,
        created_at: blogPostsTable.created_at,
        updated_at: blogPostsTable.updated_at,
      })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.published, true))
      .orderBy(desc(blogPostsTable.created_at));

    logger.info('Blog list fetched', { count: posts.length, apiName: 'blog-list' });
    return NextResponse.json({ success: true, posts });
  } catch (error) {
    logger.error('Error fetching blog list', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}
