/**
 * Adds a "More on Personalised Songs" cross-link section to each of the 15
 * top-of-funnel "song creation / comparison" bucket blogs (5 original product
 * cluster posts + 10 new question-format / comparison / listicle posts).
 * Injects HTML before the final <p> (CTA) in each post.
 * Safe to re-run — skips posts that already contain the marker.
 *
 * Run: npx tsx -r dotenv/config scripts/update-general-toffunnel-blog-crosslinks.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const BASE = 'https://www.melodia-songs.com';

// All 15 posts in the bucket
const ALL_POSTS = [
  // original product cluster
  { slug: 'how-to-make-a-personalized-song-step-by-step',         label: 'How to Make a Song Step by Step' },
  { slug: 'custom-song-vs-gift-card-meaningful-gift',             label: 'Custom Song vs Gift Card' },
  { slug: 'personalized-song-indian-languages-mother-tongue',     label: 'Songs in 20+ Indian Languages' },
  { slug: 'last-minute-personalized-song-gift-instant',           label: 'Last Minute Song Gift' },
  { slug: 'occasions-personalized-song-gift-ideas-list',          label: '10 Occasions for a Song' },
  // new top-of-funnel batch
  { slug: 'are-ai-generated-songs-any-good-quality',              label: 'Are AI Songs Any Good?' },
  { slug: 'how-much-does-a-custom-song-cost-price',               label: 'How Much Does a Song Cost?' },
  { slug: 'can-ai-write-a-song-about-a-specific-person',          label: 'Can AI Write About One Person?' },
  { slug: 'how-long-does-it-take-to-make-a-custom-song',          label: 'How Long Does It Take?' },
  { slug: 'do-you-need-musical-skill-to-make-a-song',             label: 'Do You Need Musical Skill?' },
  { slug: 'is-it-okay-to-gift-an-ai-made-song',                   label: 'Is It Okay to Gift an AI Song?' },
  { slug: 'what-details-do-you-need-personalized-song-checklist', label: 'What Details Do You Need?' },
  { slug: 'custom-song-vs-other-personalized-gifts',              label: 'Song vs Mug, Photo Book or Video' },
  { slug: 'personalized-song-gift-ideas-hard-to-shop-for',        label: '15 Ideas for People Hard to Shop For' },
  { slug: 'what-makes-a-personalized-song-unforgettable',         label: 'What Makes a Song Unforgettable?' },
];

// Each post links to 3 related posts (never itself)
const RELATED: Record<string, string[]> = {
  'how-to-make-a-personalized-song-step-by-step':         ['what-details-do-you-need-personalized-song-checklist', 'do-you-need-musical-skill-to-make-a-song', 'how-long-does-it-take-to-make-a-custom-song'],
  'custom-song-vs-gift-card-meaningful-gift':             ['custom-song-vs-other-personalized-gifts', 'is-it-okay-to-gift-an-ai-made-song', 'how-much-does-a-custom-song-cost-price'],
  'personalized-song-indian-languages-mother-tongue':     ['can-ai-write-a-song-about-a-specific-person', 'what-makes-a-personalized-song-unforgettable', 'how-to-make-a-personalized-song-step-by-step'],
  'last-minute-personalized-song-gift-instant':           ['how-long-does-it-take-to-make-a-custom-song', 'how-much-does-a-custom-song-cost-price', 'occasions-personalized-song-gift-ideas-list'],
  'occasions-personalized-song-gift-ideas-list':          ['personalized-song-gift-ideas-hard-to-shop-for', 'custom-song-vs-gift-card-meaningful-gift', 'last-minute-personalized-song-gift-instant'],
  'are-ai-generated-songs-any-good-quality':              ['can-ai-write-a-song-about-a-specific-person', 'what-makes-a-personalized-song-unforgettable', 'is-it-okay-to-gift-an-ai-made-song'],
  'how-much-does-a-custom-song-cost-price':               ['custom-song-vs-gift-card-meaningful-gift', 'custom-song-vs-other-personalized-gifts', 'last-minute-personalized-song-gift-instant'],
  'can-ai-write-a-song-about-a-specific-person':          ['what-details-do-you-need-personalized-song-checklist', 'are-ai-generated-songs-any-good-quality', 'how-to-make-a-personalized-song-step-by-step'],
  'how-long-does-it-take-to-make-a-custom-song':          ['last-minute-personalized-song-gift-instant', 'how-to-make-a-personalized-song-step-by-step', 'do-you-need-musical-skill-to-make-a-song'],
  'do-you-need-musical-skill-to-make-a-song':             ['how-to-make-a-personalized-song-step-by-step', 'what-details-do-you-need-personalized-song-checklist', 'can-ai-write-a-song-about-a-specific-person'],
  'is-it-okay-to-gift-an-ai-made-song':                   ['are-ai-generated-songs-any-good-quality', 'custom-song-vs-gift-card-meaningful-gift', 'how-much-does-a-custom-song-cost-price'],
  'what-details-do-you-need-personalized-song-checklist': ['how-to-make-a-personalized-song-step-by-step', 'what-makes-a-personalized-song-unforgettable', 'can-ai-write-a-song-about-a-specific-person'],
  'custom-song-vs-other-personalized-gifts':              ['custom-song-vs-gift-card-meaningful-gift', 'how-much-does-a-custom-song-cost-price', 'occasions-personalized-song-gift-ideas-list'],
  'personalized-song-gift-ideas-hard-to-shop-for':        ['occasions-personalized-song-gift-ideas-list', 'custom-song-vs-gift-card-meaningful-gift', 'personalized-song-indian-languages-mother-tongue'],
  'what-makes-a-personalized-song-unforgettable':         ['what-details-do-you-need-personalized-song-checklist', 'can-ai-write-a-song-about-a-specific-person', 'are-ai-generated-songs-any-good-quality'],
};

const MARKER = '<!-- general-toffunnel-crosslinks -->';

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
<p><strong>More on Personalised Songs</strong></p>
<ul>
${items}
</ul>
</div>`;
}

async function main() {
  console.log('Updating top-of-funnel blog cross-links...');
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

    // Inject before the last <p> tag (the CTA paragraph)
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
