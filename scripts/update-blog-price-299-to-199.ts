/**
 * One-off: align blog price copy from ₹299 → ₹199 (the real entry price).
 *
 * Updates `content` and `meta_description` for every blog post that mentions
 * "299". In these occasion blogs "299" only ever appears as the starting price,
 * so a bounded numeric swap is safe. Logs every row it touches.
 *
 * Run: npx tsx -r dotenv/config scripts/update-blog-price-299-to-199.ts dotenv_config_path=.env.local
 *
 * Idempotent: a second run finds nothing to change.
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

/** Swap the price 299 → 199 across the common phrasings used in blog copy. */
function swapPrice(text: string | null): string {
  if (!text) return text ?? '';
  return text
    .replace(/₹\s*299/g, '₹199')
    .replace(/INR\s*299/g, 'INR 199')
    .replace(/Rs\.?\s*299/g, 'Rs 199')
    .replace(/\b299\b/g, '199'); // catch-all for bare "starting at 299", "299 rupees", etc.
}

async function run() {
  const rows = await db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      content: blogPostsTable.content,
      meta_description: blogPostsTable.meta_description,
    })
    .from(blogPostsTable)
    .where(
      or(
        like(blogPostsTable.content, '%299%'),
        like(blogPostsTable.meta_description, '%299%'),
      ),
    );

  console.log(`Candidate posts containing "299": ${rows.length}\n`);

  let updated = 0;
  for (const row of rows) {
    const newContent = swapPrice(row.content);
    const newMeta = swapPrice(row.meta_description);

    if (newContent === row.content && newMeta === (row.meta_description ?? '')) {
      console.log(`SKIP (no price match): ${row.slug}`);
      continue;
    }

    const contentHits = (row.content.match(/299/g) || []).length;
    const metaHits = (row.meta_description?.match(/299/g) || []).length;

    await db
      .update(blogPostsTable)
      .set({
        content: newContent,
        meta_description: newMeta,
        updated_at: new Date(),
      })
      .where(eq(blogPostsTable.id, row.id));

    console.log(
      `UPDATED: ${row.slug}  (content: ${contentHits} swap(s), meta: ${metaHits} swap(s))`,
    );
    updated++;
  }

  console.log(`\nDone. Updated: ${updated} / ${rows.length}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
