/**
 * Re-spread the publish dates of existing published blog posts.
 *
 * Problem it fixes: the back-catalogue was seeded in batches, so dozens of
 * posts share the exact same `created_at` second. That burst pattern is the
 * clearest automated-publishing fingerprint on the live site. This script
 * redistributes `created_at` (and a plausible `updated_at`) across a believable
 * editorial window so the cadence reads as human-paced.
 *
 * Order is preserved: the oldest existing post stays oldest. Only the spacing
 * changes. The schedule is deterministic — re-running with the same window
 * produces the same dates (idempotent).
 *
 * Usage:
 *   # preview only, change nothing:
 *   DRY_RUN=1 npx tsx -r dotenv/config scripts/respread-blog-dates.ts dotenv_config_path=.env.local
 *
 *   # apply, spreading across the last 9 months (default):
 *   npx tsx -r dotenv/config scripts/respread-blog-dates.ts dotenv_config_path=.env.local
 *
 *   # apply with a custom window length in months:
 *   MONTHS=12 npx tsx -r dotenv/config scripts/respread-blog-dates.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { spreadTimestamps, modifiedAfter, monthsAgo } from './lib/blog-schedule';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const MONTHS = Number(process.env.MONTHS ?? 9);

async function main() {
  const now = new Date();

  // Oldest first, tie-broken by id, so existing chronology is preserved.
  const posts = await db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      created_at: blogPostsTable.created_at,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(asc(blogPostsTable.created_at), asc(blogPostsTable.id));

  if (posts.length === 0) {
    console.log('No published posts found. Nothing to do.');
    return;
  }

  // Window: [now - MONTHS, now - 1 day]. End a day short so nothing is
  // backdated to "right now", which would itself look like a burst.
  const start = monthsAgo(MONTHS, now);
  const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const schedule = spreadTimestamps(posts.length, { start, end, hours: [8, 22] });

  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}Re-spreading ${posts.length} published posts across ` +
      `${start.toDateString()} → ${end.toDateString()} (${MONTHS} months).\n`,
  );

  // Sanity check: how many land on any single calendar day (want this small).
  const perDay = new Map<string, number>();
  for (const d of schedule) {
    const key = d.toISOString().slice(0, 10);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const maxPerDay = Math.max(...perDay.values());
  console.log(`Max posts on any single day after spread: ${maxPerDay}\n`);

  let updated = 0;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const created = schedule[i];
    const modified = modifiedAfter(created, now);

    console.log(
      `  ${created.toISOString().slice(0, 16).replace('T', ' ')}  ${post.slug}`,
    );

    if (!DRY_RUN) {
      await db
        .update(blogPostsTable)
        .set({ created_at: created, updated_at: modified })
        .where(eq(blogPostsTable.id, post.id));
      updated++;
    }
  }

  console.log(
    `\n${DRY_RUN ? '[DRY RUN] No changes written.' : `Done. Updated ${updated} posts.`}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
