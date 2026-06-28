import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPostsTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * GET /api/blog/[slug]
 * Returns a single published blog post by slug (public).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    const [post] = await db
      .select()
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.slug, slug),
          eq(blogPostsTable.published, true)
        )
      )
      .limit(1);

    if (!post) {
      logger.info('Blog post not found or not published', { slug, apiName: 'blog-slug' });
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    logger.info('Blog post fetched', { slug, postId: post.id, apiName: 'blog-slug' });
    return NextResponse.json({ success: true, post });
  } catch (error) {
    logger.error('Error fetching blog post by slug', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}
