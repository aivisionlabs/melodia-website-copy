/**
 * Drip-publisher for scheduled blog posts.
 *
 * The drip model: new batches are seeded with `published: false` and a
 * `created_at` set to a FUTURE go-live date (computed by spreadTimestamps over
 * the coming weeks — see the create-blog skill / seed template). This script
 * flips a post to `published: true` once its scheduled `created_at` has
 * arrived. Run it daily (cron) and the back-catalogue goes live a few posts at
 * a time instead of all at once.
 *
 * A future `created_at` + `published:false` is invisible to the site: the blog
 * listing and generateStaticParams both filter on `published = true`, and once
 * published the date is already in the past, so chronology stays correct.
 *
 * Usage:
 *   # preview what would publish today:
 *   DRY_RUN=1 npx tsx -r dotenv/config scripts/publish-due-blogs.ts dotenv_config_path=.env.local
 *
 *   # publish all due posts:
 *   npx tsx -r dotenv/config scripts/publish-due-blogs.ts dotenv_config_path=.env.local
 *
 *   # cap how many go live in one run (safety throttle, default 5):
 *   MAX_PER_RUN=3 npx tsx -r dotenv/config scripts/publish-due-blogs.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { and, asc, eq, lte } from 'drizzle-orm';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN ?? 5);

async function main() {
  const now = new Date();

  // Unpublished posts whose scheduled go-live date has arrived, oldest first.
  const due = await db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      created_at: blogPostsTable.created_at,
    })
    .from(blogPostsTable)
    .where(
      and(
        eq(blogPostsTable.published, false),
        lte(blogPostsTable.created_at, now),
      ),
    )
    .orderBy(asc(blogPostsTable.created_at), asc(blogPostsTable.id));

  if (due.length === 0) {
    console.log('No scheduled posts are due. Nothing to publish.');
    return;
  }

  const batch = due.slice(0, MAX_PER_RUN);
  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}${due.length} post(s) due; publishing ${batch.length} ` +
      `this run (MAX_PER_RUN=${MAX_PER_RUN}).\n`,
  );

  let published = 0;
  for (const post of batch) {
    console.log(`  PUBLISH  ${post.created_at.toISOString().slice(0, 10)}  ${post.slug}`);
    if (!DRY_RUN) {
      await db
        .update(blogPostsTable)
        .set({ published: true })
        .where(eq(blogPostsTable.id, post.id));
      published++;
    }
  }

  const remaining = due.length - batch.length;
  console.log(
    `\n${DRY_RUN ? '[DRY RUN] No changes written.' : `Done. Published ${published}.`}` +
      (remaining > 0 ? ` ${remaining} still queued for the next run.` : ''),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
