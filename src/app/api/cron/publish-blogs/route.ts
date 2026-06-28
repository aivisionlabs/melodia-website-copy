/**
 * Scheduled Blog Publisher Cron Job
 * GET /api/cron/publish-blogs
 *
 * Drip-publishes scheduled blog posts. New batches are seeded with
 * `published: false` and a FUTURE `created_at` (their go-live date). This job
 * flips a post to `published: true` once that date has arrived — publishing at
 * most MAX_BLOG_PUBLISH_PER_RUN posts per run so the back-catalogue goes live a
 * few at a time instead of in one burst (the scaled-content fingerprint we are
 * avoiding).
 *
 * A future `created_at` + `published:false` is invisible to the site: the blog
 * listing and generateStaticParams both filter on `published = true`.
 *
 * Security: requires CRON_SECRET in the Authorization header.
 * Schedule: see vercel.json (daily).
 */

import { NextRequest, NextResponse } from "next/server";
import { rejectUnauthorizedCronRequest } from "@/lib/auth/cron";
import { db } from "@/lib/db";
import { blogPostsTable } from "@/lib/db/schema";
import { and, asc, eq, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const unauthorized = rejectUnauthorizedCronRequest(req, "/api/cron/publish-blogs");
    if (unauthorized) return unauthorized;

    const maxPerRun = parseInt(process.env.MAX_BLOG_PUBLISH_PER_RUN || "3", 10);
    const now = new Date();

    const due = await db
      .select({
        id: blogPostsTable.id,
        slug: blogPostsTable.slug,
        created_at: blogPostsTable.created_at,
      })
      .from(blogPostsTable)
      .where(
        and(eq(blogPostsTable.published, false), lte(blogPostsTable.created_at, now)),
      )
      .orderBy(asc(blogPostsTable.created_at), asc(blogPostsTable.id));

    const batch = due.slice(0, maxPerRun);
    const publishedSlugs: string[] = [];

    for (const post of batch) {
      await db
        .update(blogPostsTable)
        .set({ published: true })
        .where(eq(blogPostsTable.id, post.id));
      publishedSlugs.push(post.slug);
    }

    console.log(
      `[PublishBlogs] Published ${publishedSlugs.length}/${due.length} due posts: ` +
        publishedSlugs.join(", "),
    );

    return NextResponse.json({
      success: true,
      published: publishedSlugs.length,
      slugs: publishedSlugs,
      stillQueued: due.length - batch.length,
      maxPerRun,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[PublishBlogs] Failed:", error);
    return NextResponse.json(
      { success: false, error: "Publish failed", details: error.message },
      { status: 500 },
    );
  }
}
