/**
 * One-off backfill: submit the site's indexable URLs to IndexNow so they get
 * (re)crawled by Bing/Microsoft, Yandex, Seznam, Naver, etc. — which in turn
 * powers ChatGPT Search and Copilot.
 *
 * Covers four groups so a content/price/schema change anywhere is picked up:
 *   1. Static high-value pages (home, pricing, how-it-works, languages index…)
 *   2. All occasion landing pages (from OCCASION_SLUGS)
 *   3. All language pages (from LANGUAGE_PAGES)
 *   4. Every published blog post (from the DB)
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/indexnow-backfill.ts dotenv_config_path=.env.local
 *
 * Safe to re-run — IndexNow is idempotent (resubmitting a URL just refreshes it).
 * Unlike the runtime helper in src/lib/seo/index-now.ts, this script POSTs
 * directly so it works from a local/non-production shell.
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OCCASION_SLUGS } from '../src/lib/seo/occasions';
import { LANGUAGE_PAGES } from '../src/lib/seo/language-pages';

const SITE_ORIGIN =
  process.env.INDEXNOW_SITE_ORIGIN || 'https://www.melodia-songs.com';
const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY || '76274c0cab82cddd0ab550ed17f2d944';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Static, high-value pages affected by the price / package-name / schema pass. */
const STATIC_PATHS = [
  '/',
  '/pricing',
  '/how-it-works',
  '/occasions',
  '/languages',
  '/blog',
  '/faq',
];

async function main() {
  const host = new URL(SITE_ORIGIN).host;

  const posts = await db
    .select({ slug: blogPostsTable.slug })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true));

  const staticUrls = STATIC_PATHS.map((p) => `${SITE_ORIGIN}${p}`);
  const occasionUrls = OCCASION_SLUGS.map(
    (slug) => `${SITE_ORIGIN}/occasions/${slug}`,
  );
  const languageUrls = LANGUAGE_PAGES.map(
    (l) => `${SITE_ORIGIN}/languages/${l.slug}`,
  );
  const blogUrls = posts.map((p) => `${SITE_ORIGIN}/blog/${p.slug}`);

  // Dedupe defensively (a static path could overlap a generated one).
  const urlList = Array.from(
    new Set([...staticUrls, ...occasionUrls, ...languageUrls, ...blogUrls]),
  );

  if (urlList.length === 0) {
    console.log('No URLs to submit.');
    return;
  }

  console.log(
    `Submitting ${urlList.length} URLs to IndexNow ` +
      `(static: ${staticUrls.length}, occasions: ${occasionUrls.length}, ` +
      `languages: ${languageUrls.length}, blogs: ${blogUrls.length}):`,
  );
  urlList.forEach((u) => console.log(`  - ${u}`));

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  const body = await res.text().catch(() => '');
  if (res.ok || res.status === 202) {
    console.log(`\n✅ IndexNow accepted (HTTP ${res.status}).`);
  } else {
    console.error(`\n❌ IndexNow rejected (HTTP ${res.status}): ${body.slice(0, 500)}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
