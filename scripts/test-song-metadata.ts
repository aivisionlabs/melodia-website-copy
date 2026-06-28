/**
 * Song Metadata Enrichment Smoke Test
 *
 * Tests generateLyricsDraftTags, generateAdminSongListingMetadata, and
 * enrichAdminSongListingMetadata (the DB write path).
 *
 * Usage:
 *   # Demo-mode stubs only (no Vertex AI / DB required):
 *   DEMO_MODE=true npx tsx -r dotenv/config scripts/test-song-metadata.ts dotenv_config_path=.env.local
 *
 *   # Real Gemini calls (no DB write):
 *   npx tsx -r dotenv/config scripts/test-song-metadata.ts dotenv_config_path=.env.local
 *
 *   # Full end-to-end including DB write:
 *   npx tsx -r dotenv/config scripts/test-song-metadata.ts --song-id 123 dotenv_config_path=.env.local
 */

import {
  generateLyricsDraftTags,
  generateAdminSongListingMetadata,
  enrichAdminSongListingMetadata,
} from '../src/lib/services/llm/llm-song-metadata';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass(label: string, detail?: string) {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, err: unknown) {
  console.error(`  ✗ ${label}`);
  console.error('   ', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}

async function section(name: string, fn: () => Promise<void>) {
  console.log(`\n[${name}]`);
  try {
    await fn();
  } catch (err) {
    fail('Unexpected error in section', err);
  }
}

// ---------------------------------------------------------------------------
// Sample lyrics used across tests
// ---------------------------------------------------------------------------

const SAMPLE_LYRICS = `
Maa tere haathon ki khushboo
Pyaar ki woh meethi laghu
Har dard mein tune thama
Teri god mein swarg mila

Saasu maa teri mamta
Ghar ko jannat banaya
Teri aanchal ki chaon mein
Har khushi humne paaya
`.trim();

// ---------------------------------------------------------------------------
// Test: generateLyricsDraftTags — demo mode
// ---------------------------------------------------------------------------

async function testLyricsDraftTagsDemoMode() {
  const orig = process.env.DEMO_MODE;
  process.env.DEMO_MODE = 'true';
  try {
    const result = await generateLyricsDraftTags({
      title: 'Maa Ki Mamta',
      description: 'A song for mother',
      musicStyle: 'bollywood ballad',
      lyricsText: SAMPLE_LYRICS,
    });

    if (!Array.isArray(result.tags)) throw new Error('tags must be an array');
    if (result.tags.length === 0) throw new Error('tags must not be empty');
    for (const t of result.tags) {
      if (typeof t !== 'string' || t.trim().length === 0) throw new Error(`invalid tag: ${JSON.stringify(t)}`);
    }
    pass('returns array of strings in demo mode', `tags: [${result.tags.join(', ')}]`);
  } finally {
    if (orig === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = orig;
  }
}

// ---------------------------------------------------------------------------
// Test: generateAdminSongListingMetadata — demo mode
// ---------------------------------------------------------------------------

async function testAdminListingMetaDemoMode() {
  const orig = process.env.DEMO_MODE;
  process.env.DEMO_MODE = 'true';
  try {
    const title = 'Maa Ki Mamta';
    const result = await generateAdminSongListingMetadata({
      title,
      lyricsText: SAMPLE_LYRICS,
      musicStyle: 'bollywood ballad',
      language: 'Hindi',
      occasion: 'mothers-day',
      mood: ['emotional', 'warm'],
    });

    if (typeof result.song_description !== 'string' || result.song_description.length === 0) {
      throw new Error('song_description must be a non-empty string');
    }
    if (result.song_description.length > 200) {
      throw new Error(`song_description too long: ${result.song_description.length} chars`);
    }
    if (!result.song_description.includes(title.slice(0, 20))) {
      throw new Error('demo description should mention the song title');
    }
    if (!Array.isArray(result.tags) || result.tags.length === 0) {
      throw new Error('tags must be a non-empty array');
    }
    pass('returns description + tags in demo mode', `desc: "${result.song_description.slice(0, 60)}…"`);
  } finally {
    if (orig === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = orig;
  }
}

// ---------------------------------------------------------------------------
// Test: generateLyricsDraftTags — real Gemini
// ---------------------------------------------------------------------------

async function testLyricsDraftTagsReal() {
  if (process.env.DEMO_MODE === 'true') {
    console.log('  (skipped — DEMO_MODE=true)');
    return;
  }

  const result = await generateLyricsDraftTags({
    title: 'Maa Ki Mamta',
    description: 'A heartfelt song for mother',
    musicStyle: 'bollywood ballad, slow',
    lyricsText: SAMPLE_LYRICS,
  });

  if (!Array.isArray(result.tags) || result.tags.length < 1) {
    throw new Error(`Expected at least 1 tag, got: ${JSON.stringify(result.tags)}`);
  }
  if (result.tags.length > 10) {
    throw new Error(`Too many tags returned: ${result.tags.length}`);
  }
  for (const t of result.tags) {
    if (typeof t !== 'string' || t !== t.toLowerCase()) {
      throw new Error(`Tag must be lowercase string: "${t}"`);
    }
    if (t.length < 2 || t.length > 48) {
      throw new Error(`Tag out of length bounds: "${t}"`);
    }
  }
  // Spot-check: none of the forbidden fields leaked into tags
  const forbidden = ['birthday', 'wedding', 'hindi', 'romantic', 'mother', 'friend', 'mothers day'];
  for (const bad of forbidden) {
    if (result.tags.includes(bad)) {
      throw new Error(`Forbidden tag leaked: "${bad}"`);
    }
  }
  pass(`returns ${result.tags.length} valid tags`, `[${result.tags.join(', ')}]`);
}

// ---------------------------------------------------------------------------
// Test: generateAdminSongListingMetadata — real Gemini
// ---------------------------------------------------------------------------

async function testAdminListingMetaReal() {
  if (process.env.DEMO_MODE === 'true') {
    console.log('  (skipped — DEMO_MODE=true)');
    return;
  }

  const result = await generateAdminSongListingMetadata({
    title: 'Maa Ki Mamta',
    lyricsText: SAMPLE_LYRICS,
    musicStyle: 'bollywood ballad',
    language: 'Hindi',
    occasion: 'mothers-day',
    mood: ['emotional', 'warm'],
  });

  if (typeof result.song_description !== 'string' || result.song_description.length === 0) {
    throw new Error('song_description must be a non-empty string');
  }
  if (result.song_description.length > 160) {
    throw new Error(`song_description exceeds 160 chars: ${result.song_description.length}`);
  }
  if (!Array.isArray(result.tags) || result.tags.length < 1) {
    throw new Error(`Expected at least 1 tag, got: ${JSON.stringify(result.tags)}`);
  }
  if (result.tags.length > 10) {
    throw new Error(`Too many tags returned: ${result.tags.length}`);
  }
  // Occasion / language must not appear in tags
  const forbidden = ['mothers day', 'hindi', 'birthday'];
  for (const bad of forbidden) {
    if (result.tags.includes(bad)) {
      throw new Error(`Forbidden tag leaked: "${bad}"`);
    }
  }
  pass(
    `description (${result.song_description.length} chars) + ${result.tags.length} tags`,
    `"${result.song_description.slice(0, 60)}…"`
  );
}

// ---------------------------------------------------------------------------
// Test: enrichAdminSongListingMetadata — DB write path (optional)
// ---------------------------------------------------------------------------

async function testEnrichDbWrite(songId: number) {
  console.log(`  Song ID: ${songId}`);

  // Read current state before enrichment
  const { db } = await import('../src/lib/db');
  const { songsTable } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const before = await db
    .select({ song_description: songsTable.song_description, tags: songsTable.tags })
    .from(songsTable)
    .where(eq(songsTable.id, songId))
    .limit(1);

  if (before.length === 0) {
    throw new Error(`Song ${songId} not found in DB`);
  }

  const descBefore = (before[0] as any).song_description;
  console.log(`  Before: description=${descBefore ? `"${String(descBefore).slice(0, 50)}…"` : 'null'}, tags=${JSON.stringify(before[0].tags)}`);

  await enrichAdminSongListingMetadata(songId);

  const after = await db
    .select({ song_description: songsTable.song_description, tags: songsTable.tags })
    .from(songsTable)
    .where(eq(songsTable.id, songId))
    .limit(1);

  const descAfter = (after[0] as any).song_description;
  const tagsAfter = after[0].tags;

  if (!descAfter || String(descAfter).trim().length === 0) {
    throw new Error('song_description was not written to DB');
  }
  if (!Array.isArray(tagsAfter) || tagsAfter.length === 0) {
    throw new Error('tags were not written to DB');
  }

  pass(
    `DB updated — description (${String(descAfter).length} chars), ${tagsAfter.length} tags`,
    `"${String(descAfter).slice(0, 60)}…"`
  );

  // Second call: should be a no-op if already described (idempotency check)
  // enrichAdminSongListingMetadata always overwrites, so just verify it doesn't throw
  await enrichAdminSongListingMetadata(songId);
  pass('Second call (idempotent re-enrich) did not throw');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const songIdArg = process.argv.find((a) => a.startsWith('--song-id='))?.split('=')[1]
    ?? (process.argv.includes('--song-id') ? process.argv[process.argv.indexOf('--song-id') + 1] : undefined);
  const songId = songIdArg ? parseInt(songIdArg, 10) : undefined;

  const isDemo = process.env.DEMO_MODE === 'true';
  console.log(`\nSong Metadata Enrichment Test`);
  console.log(`Mode: ${isDemo ? 'demo (stubs, no real API calls)' : 'production (real Gemini)'}`);
  if (songId) console.log(`DB write test: song ${songId}`);

  await section('generateLyricsDraftTags — demo mode stub', testLyricsDraftTagsDemoMode);
  await section('generateAdminSongListingMetadata — demo mode stub', testAdminListingMetaDemoMode);
  await section('generateLyricsDraftTags — real Gemini', testLyricsDraftTagsReal);
  await section('generateAdminSongListingMetadata — real Gemini', testAdminListingMetaReal);

  if (songId && !isNaN(songId)) {
    await section('enrichAdminSongListingMetadata — DB write', () => testEnrichDbWrite(songId));
  } else {
    console.log('\n[enrichAdminSongListingMetadata — DB write]');
    console.log('  (skipped — pass --song-id <id> to run)');
  }

  if (process.exitCode) {
    console.log('\nSome tests failed.');
  } else {
    console.log('\nAll tests passed.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
