/**
 * Adds a "More Mother's Day Gift Guides" cross-link section to each of the
 * 10 Mother's Day campaign blogs.  Injects HTML before the final <p> (CTA)
 * in each post.  Safe to re-run — skips posts that already contain the marker.
 *
 * Run: npm run db:update-mothers-day-crosslinks
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const BASE = 'https://www.melodia-songs.com';

// All 10 Mother's Day blogs
const ALL_POSTS = [
  { slug: 'mothers-day-gift-for-mom-who-has-everything',  label: 'Gift for Mom Who Has Everything' },
  { slug: 'first-mothers-day-gift-for-wife',              label: "First Mother's Day Gift for Wife" },
  { slug: 'mothers-day-gift-for-nani-dadi-grandmother',   label: 'Gift for Nani & Dadi' },
  { slug: 'last-minute-mothers-day-gift-instant-digital', label: 'Last-Minute Instant Gift' },
  { slug: 'mothers-day-gift-for-nurse-mom',               label: 'Gift for Nurse Mom' },
  { slug: 'mothers-day-gift-for-teacher-mom',             label: 'Gift for Teacher Mom' },
  { slug: 'mothers-day-song-in-hindi-for-maa',            label: 'माँ के लिए हिंदी गाना' },
  { slug: 'why-custom-song-beats-flowers-for-mothers-day',label: 'Why a Song Beats Flowers' },
  { slug: 'mothers-day-gift-from-dog-to-mom-pet-mom',     label: 'Song from Dog to Mom' },
  { slug: 'mothers-day-gift-for-stepmom',                 label: 'Gift for Stepmom' },
];

// Each post links to 3 related posts (not itself)
const RELATED: Record<string, string[]> = {
  'mothers-day-gift-for-mom-who-has-everything':  ['why-custom-song-beats-flowers-for-mothers-day', 'last-minute-mothers-day-gift-instant-digital', 'first-mothers-day-gift-for-wife'],
  'first-mothers-day-gift-for-wife':              ['mothers-day-gift-for-mom-who-has-everything', 'why-custom-song-beats-flowers-for-mothers-day', 'mothers-day-gift-for-nani-dadi-grandmother'],
  'mothers-day-gift-for-nani-dadi-grandmother':   ['mothers-day-song-in-hindi-for-maa', 'mothers-day-gift-for-mom-who-has-everything', 'why-custom-song-beats-flowers-for-mothers-day'],
  'last-minute-mothers-day-gift-instant-digital': ['why-custom-song-beats-flowers-for-mothers-day', 'mothers-day-gift-for-mom-who-has-everything', 'first-mothers-day-gift-for-wife'],
  'mothers-day-gift-for-nurse-mom':               ['mothers-day-gift-for-mom-who-has-everything', 'why-custom-song-beats-flowers-for-mothers-day', 'mothers-day-gift-for-teacher-mom'],
  'mothers-day-gift-for-teacher-mom':             ['mothers-day-gift-for-nurse-mom', 'why-custom-song-beats-flowers-for-mothers-day', 'mothers-day-gift-for-mom-who-has-everything'],
  'mothers-day-song-in-hindi-for-maa':            ['mothers-day-gift-for-nani-dadi-grandmother', 'why-custom-song-beats-flowers-for-mothers-day', 'mothers-day-gift-for-mom-who-has-everything'],
  'why-custom-song-beats-flowers-for-mothers-day':['mothers-day-gift-for-mom-who-has-everything', 'last-minute-mothers-day-gift-instant-digital', 'first-mothers-day-gift-for-wife'],
  'mothers-day-gift-from-dog-to-mom-pet-mom':     ['mothers-day-gift-for-mom-who-has-everything', 'why-custom-song-beats-flowers-for-mothers-day', 'last-minute-mothers-day-gift-instant-digital'],
  'mothers-day-gift-for-stepmom':                 ['mothers-day-gift-for-mom-who-has-everything', 'why-custom-song-beats-flowers-for-mothers-day', 'first-mothers-day-gift-for-wife'],
};

const MARKER = '<!-- mothers-day-crosslinks -->';

function buildCrossLinkHtml(currentSlug: string): string {
  const relatedSlugs = RELATED[currentSlug] ?? [];
  const links = relatedSlugs
    .map((s) => ALL_POSTS.find((p) => p.slug === s))
    .filter(Boolean) as { slug: string; label: string }[];

  const items = links
    .map(
      ({ slug, label }) =>
        `<li><a href="${BASE}/blog/${slug}">${label}</a></li>`,
    )
    .join('\n');

  return `${MARKER}
<div style="margin-top:2rem;padding:1.25rem;border:1px solid #e2e8f0;border-radius:0.75rem;background:#f8fafc">
<p><strong>More Mother's Day Gift Guides</strong></p>
<ul>
${items}
</ul>
</div>`;
}

async function main() {
  console.log("Updating Mother's Day blog cross-links...");
  let updated = 0;
  let skipped = 0;

  for (const { slug } of ALL_POSTS) {
    const [post] = await db
      .select({ id: blogPostsTable.id, content: blogPostsTable.content })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, slug))
      .limit(1);

    if (!post) {
      console.log(`  NOT FOUND: ${slug}`);
      continue;
    }

    if (post.content.includes(MARKER)) {
      console.log(`  SKIP (already has crosslinks): ${slug}`);
      skipped++;
      continue;
    }

    const crossLinkHtml = buildCrossLinkHtml(slug);

    // Inject before the last <p> tag (which is the CTA paragraph)
    const lastPIndex = post.content.lastIndexOf('<p>');
    const newContent =
      lastPIndex === -1
        ? post.content + '\n' + crossLinkHtml
        : post.content.slice(0, lastPIndex) +
          crossLinkHtml +
          '\n' +
          post.content.slice(lastPIndex);

    await db
      .update(blogPostsTable)
      .set({ content: newContent, updated_at: new Date() })
      .where(eq(blogPostsTable.id, post.id));

    console.log(`  UPDATED: ${slug}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already done): ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
