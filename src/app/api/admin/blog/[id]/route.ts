import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { blogPostsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { notifyBlogPublished } from '@/lib/seo/index-now';

async function requireAdmin(ctx: { logger: any }) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
  if (!isAuthenticated) {
    ctx.logger.warn('Unauthorized admin blog access');
    return null;
  }
  return true;
}

/**
 * GET /api/admin/blog/[id]
 * Get a single blog post by id (admin only).
 */
export const GET = withApiLogger('admin-blog-get', async (req: NextRequest, ctx: { logger: any; params?: Promise<{ id: string }> }) => {
  try {
    if (!(await requireAdmin(ctx))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await (ctx.params ?? Promise.resolve({ id: '' }));
    const numId = parseInt(String(id), 10);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, numId)).limit(1);
    if (!post) {
      ctx.logger.info('Admin blog post not found', { id: numId });
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    ctx.logger.info('Admin blog post fetched', { id: numId });
    return NextResponse.json({ success: true, post });
  } catch (error) {
    ctx.logger.error('Error fetching admin blog post', error as any);
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
});

/**
 * PUT /api/admin/blog/[id]
 * Update a blog post (admin only).
 */
export const PUT = withApiLogger('admin-blog-update', async (req: NextRequest, ctx: { logger: any; params?: Promise<{ id: string }> }) => {
  try {
    if (!(await requireAdmin(ctx))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await (ctx.params ?? Promise.resolve({ id: '' }));
    const numId = parseInt(String(id), 10);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const body = await req.json();
    const { title, slug, meta_description, content, published, category } = body;

    // Capture the prior published state so we can detect a draft → published flip.
    const [previous] = await db
      .select({ published: blogPostsTable.published })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.id, numId))
      .limit(1);

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (title != null) updates.title = String(title).trim();
    if (slug != null) updates.slug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
    if (meta_description != null) updates.meta_description = String(meta_description).trim();
    if (content != null) updates.content = String(content);
    if (published != null) updates.published = Boolean(published);
    if (category != null) updates.category = String(category).trim();

    const [updated] = await db
      .update(blogPostsTable)
      .set(updates as any)
      .where(eq(blogPostsTable.id, numId))
      .returning();
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    ctx.logger.info('Admin blog post updated', { id: numId, slug: updated.slug });

    // Notify search engines when a post becomes published (newly, or because the
    // slug changed while published) and refresh the cached sitemap/blog pages.
    const justPublished = updated.published && !previous?.published;
    if (updated.published) {
      revalidatePath('/sitemap.xml');
      revalidatePath('/blog');
      revalidatePath(`/blog/${updated.slug}`);
    }
    if (justPublished) {
      notifyBlogPublished(updated.slug, ctx.logger);
    }

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    ctx.logger.error('Error updating admin blog post', error as any);
    return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
  }
});

/**
 * DELETE /api/admin/blog/[id]
 * Delete a blog post (admin only).
 */
export const DELETE = withApiLogger('admin-blog-delete', async (req: NextRequest, ctx: { logger: any; params?: Promise<{ id: string }> }) => {
  try {
    if (!(await requireAdmin(ctx))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await (ctx.params ?? Promise.resolve({ id: '' }));
    const numId = parseInt(String(id), 10);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const [deleted] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, numId)).returning();
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    ctx.logger.info('Admin blog post deleted', { id: numId, slug: deleted.slug });
    return NextResponse.json({ success: true, deleted: deleted.id });
  } catch (error) {
    ctx.logger.error('Error deleting admin blog post', error as any);
    return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
  }
});
