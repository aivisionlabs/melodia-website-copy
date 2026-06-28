/**
 * includeLyrics query param — public + partner API
 *
 * Verifies that template_lyrics is excluded from the response by default
 * and included only when ?includeLyrics=true is passed.
 * Covers:
 *   GET /api/templated-songs
 *   GET /api/v1/partner/templates  (requires PARTNER_API_TEST_KEY)
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-templated-songs-include-lyrics.ts dotenv_config_path=.env.local
 *
 * Prerequisites:
 *   1. Server running on localhost:3000 (npm run dev)
 *   2. PARTNER_API_TEST_KEY — sandbox mel_pk_... (for partner API sections)
 */

export {};

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const PARTNER_API_KEY = process.env.PARTNER_API_TEST_KEY ?? '';

// ─── Request helpers ───────────────────────────────────────────────────────────

async function get(path: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function partnerGet(path: string, apiKey: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// ─── Result tracking ───────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}
const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string): boolean {
  results.push({ name, passed: condition, message: detail });
  const icon = condition ? '✅' : '❌';
  const suffix = detail ? `  (${detail})` : '';
  console.log(`  ${icon} ${name}${suffix}`);
  return condition;
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function hasLyrics(songs: unknown[]): boolean {
  return songs.some((s) => 'template_lyrics' in (s as object));
}

function allHaveLyrics(songs: unknown[]): boolean {
  return songs.length > 0 && songs.every((s) => 'template_lyrics' in (s as object));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

async function testDefault() {
  section('Default (no includeLyrics param) — lyrics excluded');

  const { status, data } = (await get('/api/templated-songs')) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Returns array', Array.isArray(data?.templatedSongs));

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active templated songs in DB — skipping field-shape assertions');
    return;
  }

  assert(
    'template_lyrics absent from all items',
    !hasLyrics(songs),
    `${songs.filter((s) => 'template_lyrics' in (s as object)).length} of ${songs.length} items had it`,
  );

  const first = songs[0] as Record<string, unknown>;
  assert('id present', typeof first.id === 'number');
  assert('title present', typeof first.title === 'string');
  assert('slug present', typeof first.slug === 'string');
  assert('song_variants present', 'song_variants' in first);
}

async function testExplicitFalse() {
  section('includeLyrics=false — lyrics excluded (same as default)');

  const { status, data } = (await get('/api/templated-songs?includeLyrics=false')) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertion');
    return;
  }

  assert('template_lyrics absent', !hasLyrics(songs));
}

async function testIncludeLyricsTrue() {
  section('includeLyrics=true — lyrics included');

  const { status, data } = (await get('/api/templated-songs?includeLyrics=true')) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertion');
    return;
  }

  assert(
    'template_lyrics present on all items',
    allHaveLyrics(songs),
    `${songs.filter((s) => 'template_lyrics' in (s as object)).length} of ${songs.length} items had it`,
  );

  // Value must be null or a string — never undefined
  const allValidType = songs.every((s) => {
    const val = (s as Record<string, unknown>).template_lyrics;
    return val === null || typeof val === 'string';
  });
  assert('template_lyrics is string | null on each item', allValidType);
}

async function testInvalidParamValue() {
  section('includeLyrics=banana — non-"true" value treated as false');

  const { status, data } = (await get('/api/templated-songs?includeLyrics=banana')) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertion');
    return;
  }

  assert('template_lyrics absent for non-"true" value', !hasLyrics(songs));
}

async function testCaseInsensitivity() {
  section('includeLyrics=TRUE — uppercase is NOT equal to "true"');

  const { status, data } = (await get('/api/templated-songs?includeLyrics=TRUE')) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertion');
    return;
  }

  assert('template_lyrics absent for uppercase TRUE', !hasLyrics(songs));
}

async function testWithCategorySlug() {
  section('categorySlug filter + includeLyrics=true — both params respected');

  // First fetch all songs to find a real category slug
  const { data: allData } = (await get('/api/templated-songs')) as any;
  const allSongs: Array<{ categories: Array<{ slug: string }> }> = allData?.templatedSongs ?? [];
  const firstSlug = allSongs.flatMap((s) => s.categories).map((c) => c.slug).find(Boolean);

  if (!firstSlug) {
    console.log('  ⚠️  No categories found — skipping category + includeLyrics combination test');
    return;
  }

  const { status, data } = (await get(
    `/api/templated-songs?categorySlug=${firstSlug}&includeLyrics=true`,
  )) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Returns array', Array.isArray(data?.templatedSongs));

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length > 0) {
    assert(
      'template_lyrics present when includeLyrics=true with category filter',
      allHaveLyrics(songs),
    );
  } else {
    console.log(`  ⚠️  No songs in category "${firstSlug}" — skipping field assertion`);
  }
}

async function testCategorySlugWithoutLyrics() {
  section('categorySlug filter (no includeLyrics) — lyrics excluded');

  const { data: allData } = (await get('/api/templated-songs')) as any;
  const allSongs: Array<{ categories: Array<{ slug: string }> }> = allData?.templatedSongs ?? [];
  const firstSlug = allSongs.flatMap((s) => s.categories).map((c) => c.slug).find(Boolean);

  if (!firstSlug) {
    console.log('  ⚠️  No categories found — skipping');
    return;
  }

  const { status, data } = (await get(
    `/api/templated-songs?categorySlug=${firstSlug}`,
  )) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length > 0) {
    assert('template_lyrics absent without includeLyrics', !hasLyrics(songs));
  }
}

// ─── Partner API tests ─────────────────────────────────────────────────────────

async function testPartnerDefault() {
  section('Partner API: default — template_lyrics excluded');

  const { status, data } = (await partnerGet('/api/v1/partner/templates', PARTNER_API_KEY)) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('success: true', data?.success === true);
  assert('Returns array', Array.isArray(data?.templatedSongs));
  assert('pagination present', typeof data?.pagination === 'object');

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertions');
    return;
  }

  assert('template_lyrics absent by default', !hasLyrics(songs));

  const first = songs[0] as Record<string, unknown>;
  assert('thumbnail_url present', 'thumbnail_url' in first);
  assert('song_url present', 'song_url' in first);
}

async function testPartnerIncludeLyricsTrue() {
  section('Partner API: includeLyrics=true — template_lyrics included');

  const { status, data } = (await partnerGet(
    '/api/v1/partner/templates?includeLyrics=true',
    PARTNER_API_KEY,
  )) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length === 0) {
    console.log('  ⚠️  No active songs — skipping field-shape assertion');
    return;
  }

  assert('template_lyrics present on all items', allHaveLyrics(songs));

  const allValidType = songs.every((s) => {
    const val = (s as Record<string, unknown>).template_lyrics;
    return val === null || typeof val === 'string';
  });
  assert('template_lyrics is string | null', allValidType);
}

async function testPartnerWithOccasion() {
  section('Partner API: occasion filter + includeLyrics=true — both respected');

  // Find a real occasion by checking what categories exist
  const { data: allData } = (await partnerGet('/api/v1/partner/templates', PARTNER_API_KEY)) as any;
  const allSongs: Array<{ categories: Array<{ slug: string }> }> = allData?.templatedSongs ?? [];
  const firstSlug = allSongs.flatMap((s) => s.categories).map((c) => c.slug).find(Boolean);

  if (!firstSlug) {
    console.log('  ⚠️  No categories found — skipping occasion + lyrics combination test');
    return;
  }

  const { status, data } = (await partnerGet(
    `/api/v1/partner/templates?occasion=${firstSlug}&includeLyrics=true`,
    PARTNER_API_KEY,
  )) as any;
  assert('Status 200', status === 200, `got ${status}`);
  assert('Returns array', Array.isArray(data?.templatedSongs));

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length > 0) {
    assert('template_lyrics present with occasion + includeLyrics=true', allHaveLyrics(songs));
  } else {
    console.log(`  ⚠️  No songs for occasion "${firstSlug}" — skipping field assertion`);
  }
}

async function testPartnerInvalidValue() {
  section('Partner API: includeLyrics=1 — non-"true" treated as false');

  const { status, data } = (await partnerGet(
    '/api/v1/partner/templates?includeLyrics=1',
    PARTNER_API_KEY,
  )) as any;
  assert('Status 200', status === 200, `got ${status}`);

  const songs: unknown[] = data?.templatedSongs ?? [];
  if (songs.length > 0) {
    assert('template_lyrics absent for includeLyrics=1', !hasLyrics(songs));
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  includeLyrics param — public + partner API tests');
  console.log('═'.repeat(60));
  console.log(`  Base URL    : ${BASE_URL}`);
  if (PARTNER_API_KEY) {
    console.log(`  Partner key : ${PARTNER_API_KEY.slice(0, 12)}...`);
  } else {
    console.log('  ⚠️  PARTNER_API_TEST_KEY not set — partner API sections will be skipped');
  }

  await testDefault();
  await testExplicitFalse();
  await testIncludeLyricsTrue();
  await testInvalidParamValue();
  await testCaseInsensitivity();
  await testWithCategorySlug();
  await testCategorySlugWithoutLyrics();

  if (PARTNER_API_KEY) {
    await testPartnerDefault();
    await testPartnerIncludeLyricsTrue();
    await testPartnerWithOccasion();
    await testPartnerInvalidValue();
  } else {
    console.log('\n  ⚠️  Skipping partner API sections (no PARTNER_API_TEST_KEY)');
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  console.log(`  ✅ Passed : ${passed}`);
  console.log(`  ❌ Failed : ${failed.length}`);
  if (failed.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failed) {
      console.log(`    • ${f.name}${f.message ? ` (${f.message})` : ''}`);
    }
  }
  console.log('═'.repeat(60));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
