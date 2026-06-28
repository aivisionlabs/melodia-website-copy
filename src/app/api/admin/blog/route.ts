import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { blogPostsTable } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { notifyBlogPublished } from '@/lib/seo/index-now';

/**
 * GET /api/admin/blog
 * List all blog posts (admin only). Optional ?published=true|false to filter.
 */
export const GET = withApiLogger('admin-blog-list', async (req: NextRequest, ctx) => {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      ctx.logger.warn('Unauthorized admin blog list access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const publishedFilter = searchParams.get('published');

    const posts =
      publishedFilter === 'true'
        ? await db
          .select()
          .from(blogPostsTable)
          .where(eq(blogPostsTable.published, true))
          .orderBy(desc(blogPostsTable.created_at))
        : publishedFilter === 'false'
          ? await db
            .select()
            .from(blogPostsTable)
            .where(eq(blogPostsTable.published, false))
            .orderBy(desc(blogPostsTable.created_at))
          : await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.created_at));
    ctx.logger.info('Admin blog list fetched', { count: posts.length });
    return NextResponse.json({ success: true, posts });
  } catch (error) {
    ctx.logger.error('Error fetching admin blog list', error as any);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/blog
 * Create a new blog post (admin only).
 */
export const POST = withApiLogger('admin-blog-create', async (req: NextRequest, ctx) => {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      ctx.logger.warn('Unauthorized admin blog create access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, slug, meta_description, content, published, category } = body;

    if (!title || !slug || content == null) {
      return NextResponse.json(
        { success: false, error: 'title, slug, and content are required' },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(blogPostsTable)
      .values({
        title: String(title).trim(),
        slug: String(slug).trim().toLowerCase().replace(/\s+/g, '-'),
        meta_description: meta_description ? String(meta_description).trim() : null,
        content: String(content),
        category: category ? String(category).trim() : 'general',
        published: Boolean(published),
      })
      .returning();

    ctx.logger.info('Blog post created', {
      id: inserted.id,
      slug: inserted.slug,
      title: inserted.title,
    });

    // When created already-published, push the new URL to search engines and
    // refresh the cached sitemap/blog pages so Google can discover it sooner.
    if (inserted.published) {
      notifyBlogPublished(inserted.slug, ctx.logger);
      revalidatePath('/sitemap.xml');
      revalidatePath('/blog');
      revalidatePath(`/blog/${inserted.slug}`);
    }

    return NextResponse.json({ success: true, post: inserted });
  } catch (error) {
    ctx.logger.error('Error creating blog post', error as any);
    return NextResponse.json(
      { success: false, error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
});
