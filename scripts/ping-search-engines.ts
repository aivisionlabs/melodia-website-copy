/**
 * Instant search engine notification script.
 *
 * 1. IndexNow  — notifies Bing, Yandex, Seznam instantly (same payload, one call)
 * 2. Google    — pings sitemap endpoint (triggers recrawl queue)
 *
 * Run: npm run ping:search-engines
 */

export {};

const BASE = 'https://www.melodia-songs.com';
const INDEXNOW_KEY = 'melodia2026md5key9f3c71a8e4b206d7';

// ─── All URLs to submit ───────────────────────────────────────────────────────

const MOTHERS_DAY_BLOGS = [
  '/blog/mothers-day-gift-for-mom-who-has-everything',
  '/blog/first-mothers-day-gift-for-wife',
  '/blog/mothers-day-gift-for-nani-dadi-grandmother',
  '/blog/last-minute-mothers-day-gift-instant-digital',
  '/blog/mothers-day-gift-for-nurse-mom',
  '/blog/mothers-day-gift-for-teacher-mom',
  '/blog/mothers-day-song-in-hindi-for-maa',
  '/blog/why-custom-song-beats-flowers-for-mothers-day',
  '/blog/mothers-day-gift-from-dog-to-mom-pet-mom',
  '/blog/mothers-day-gift-for-stepmom',
];

const HIGH_PRIORITY_PAGES = [
  '/',
  '/occasions/mothers-day',
  '/blog',
  '/pricing',
];

const ALL_URLS = [...HIGH_PRIORITY_PAGES, ...MOTHERS_DAY_BLOGS].map(
  (path) => `${BASE}${path}`,
);

// ─── 1. IndexNow (Bing + Yandex + Seznam) ────────────────────────────────────

async function pingIndexNow() {
  console.log('\n── IndexNow ──────────────────────────────────────');
  const payload = {
    host: 'www.melodia-songs.com',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
    urlList: ALL_URLS,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (res.status === 200 || res.status === 202) {
      console.log(`✓  IndexNow accepted ${ALL_URLS.length} URLs (HTTP ${res.status})`);
      console.log('   Bing, Yandex, and Seznam will crawl within minutes.');
    } else {
      const body = await res.text();
      console.log(`✗  IndexNow HTTP ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('✗  IndexNow error:', err);
  }
}

// ─── 2. Google — GSC only (ping endpoint deprecated in 2023) ────────────────

function printGoogleNote() {
  console.log('\n── Google ────────────────────────────────────────');
  console.log('⚠  Google deprecated the /ping sitemap endpoint in 2023.');
  console.log('   Use Google Search Console (see checklist below) to force');
  console.log('   indexing. The sitemap at /sitemap.xml is also auto-crawled.');
}

// ─── 3. Print GSC manual indexing checklist ──────────────────────────────────

function printGSCChecklist() {
  console.log('\n── Google Search Console — Manual Request Indexing ──');
  console.log('Go to: https://search.google.com/search-console');
  console.log('Paste each URL into the top search bar → "Request Indexing"\n');
  const priority = [
    '/occasions/mothers-day',
    '/blog/last-minute-mothers-day-gift-instant-digital',
    '/blog/mothers-day-song-in-hindi-for-maa',
    '/blog/mothers-day-gift-for-nani-dadi-grandmother',
    '/blog/mothers-day-gift-for-mom-who-has-everything',
    '/blog/first-mothers-day-gift-for-wife',
    ...MOTHERS_DAY_BLOGS.slice(5),
  ];
  priority.forEach((p, i) => console.log(`  ${i + 1}. ${BASE}${p}`));
  console.log('\n  Do these in order — most time-sensitive first.');
}

// ─── 4. Print Bing Webmaster checklist ───────────────────────────────────────

function printBingChecklist() {
  console.log('\n── Bing Webmaster Tools (for ChatGPT search) ────────');
  console.log('1. Go to: https://www.bing.com/webmasters');
  console.log('2. Add site: www.melodia-songs.com');
  console.log('3. Submit sitemap: https://www.melodia-songs.com/sitemap.xml');
  console.log('4. Use "URL Submission" to submit the 10 blog URLs directly.');
  console.log('   (IndexNow above already handles this if the site is verified)\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=================================================');
  console.log('  Melodia — Search Engine Notification Script');
  console.log(`  Submitting ${ALL_URLS.length} URLs`);
  console.log('=================================================');

  await pingIndexNow();
  printGoogleNote();
  printGSCChecklist();
  printBingChecklist();

  console.log('\n=================================================');
  console.log('  Done. Follow the GSC + Bing steps above to');
  console.log('  complete manual indexing before May 10.');
  console.log('=================================================\n');
}

main().catch(console.error);
