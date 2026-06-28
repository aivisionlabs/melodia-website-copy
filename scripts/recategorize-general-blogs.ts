/**
 * Recategorize blogs sitting in the catch-all `general` category into their
 * true occasion/content category, based on a content review of each post.
 *
 * Run: npx tsx -r dotenv/config scripts/recategorize-general-blogs.ts dotenv_config_path=.env.local
 *
 * Idempotent: only updates rows whose current category differs from the target,
 * and only touches the explicitly listed slugs. One slug
 * (`personalized-songs-hindi-tamil-telugu-indian-languages`) is intentionally
 * left as `general` — it is a cross-occasion languages pillar with no single
 * occasion — so it is omitted here.
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

/** slug → target category (content-reviewed). */
const REMAP: Record<string, string> = {
  // Father's Day
  'fathers-day-gift-for-dad-who-has-everything': 'fathers-day',
  'fathers-day-gift-for-husband': 'fathers-day',
  'fathers-day-gift-for-nana-dada-grandfather': 'fathers-day',
  'last-minute-fathers-day-gift-instant-personalized': 'fathers-day',
  'why-custom-song-beats-gadget-for-fathers-day': 'fathers-day',
  'fathers-day-gift-for-single-dad': 'fathers-day',
  'fathers-day-song-in-hindi-for-papa': 'fathers-day',
  'fathers-day-gift-for-long-distance-dad': 'fathers-day',
  'fathers-day-gift-for-father-in-law': 'fathers-day',
  'fathers-day-song-from-kids-to-dad-family-gift': 'fathers-day',
  // Weddings
  'best-personalized-song-ideas-indian-weddings': 'weddings',
  'shaadi-ke-liye-hindi-mein-gaana': 'weddings',
  // Sangeet
  'wedding-sangeet-song-ideas-custom-music-celebration': 'sangeet',
  // Anniversary
  'anniversary-song-gift-personalized-music-perfect-present': 'anniversary',
  // Raksha Bandhan
  'raksha-bandhan-ke-liye-hindi-gaana': 'raksha-bandhan',
  // Farewell
  'retirement-vidaai-par-hindi-gaana': 'farewell',
  // Romantic / Valentine
  'valentine-day-hindi-love-song-banaye': 'romantic',
  // Informational how-to guides (no occasion)
  'best-ai-music-generators-to-create-songs-online-free-and-paid': 'how-to',
  'can-you-monetize-ai-generated-music': 'how-to',
};

async function run() {
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const [slug, target] of Object.entries(REMAP)) {
    const rows = await db
      .select({ id: blogPostsTable.id, category: blogPostsTable.category })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      console.log(`MISSING (no such slug): ${slug}`);
      missing++;
      continue;
    }
    if (rows[0].category === target) {
      console.log(`SKIP (already ${target}): ${slug}`);
      skipped++;
      continue;
    }

    await db
      .update(blogPostsTable)
      .set({ category: target })
      .where(eq(blogPostsTable.slug, slug));
    console.log(`UPDATED: ${slug}  (${rows[0].category} -> ${target})`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Missing: ${missing}, Total: ${Object.keys(REMAP).length}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
