/**
 * One-time backfill: generate tags, one-liner description, and vibe for all songs
 * using their customer_lyrics and music_style fields via Gemini/Vertex AI.
 *
 * Stores:
 *   - tags          → songs.tags (text[])
 *   - description   → songs.song_description (text)
 *   - vibe          → songs.metadata.vibe (jsonb field)
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/backfill-song-vibes.ts dotenv_config_path=.env.local
 *   # Dry run (no DB writes):
 *   DRY_RUN=true npx tsx -r dotenv/config scripts/backfill-song-vibes.ts dotenv_config_path=.env.local
 *   # Skip songs that already have tags/description:
 *   SKIP_EXISTING=true npx tsx -r dotenv/config scripts/backfill-song-vibes.ts dotenv_config_path=.env.local
 *   # Process only a subset for testing:
 *   LIMIT=10 npx tsx -r dotenv/config scripts/backfill-song-vibes.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { songsTable } from '../src/lib/db/schema';
import { eq, isNotNull, or, and, isNull, lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  initializeVertexAI,
  generateWithVertexAI,
  parseLlmJsonText,
  LLM_CONFIG,
} from '../src/lib/services/llm/llm-shared';

// =============================================================================
// Config
// =============================================================================

const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_EXISTING = process.env.SKIP_EXISTING === 'true';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const START_FROM_ID = process.env.START_FROM_ID ? parseInt(process.env.START_FROM_ID, 10) : undefined;
const CONCURRENCY = 2; // parallel AI calls at once (conservative to avoid quota)
const DELAY_MS = 1000; // delay between batches to avoid rate limits

// =============================================================================
// Types
// =============================================================================

interface SongVibeResult {
  tags: string[];
  description: string;
  vibe: string;
}

// =============================================================================
// Prompt
// =============================================================================

const SYSTEM_PROMPT = `You are a music metadata expert for an Indian AI song creation platform called Melodia.
Your job is to analyze song lyrics and music style, then produce concise metadata.

Return ONLY valid JSON (no markdown fences, no extra text) with these exact keys:
{
  "tags": ["tag1", "tag2", ...],
  "description": "One-liner description of the song",
  "vibe": "Single vibe word or short phrase"
}

Guidelines:
- tags: 4–8 lowercase tags capturing language, occasion, mood, genre, relationship (e.g. "hindi", "wedding", "romantic", "bollywood", "mother-daughter", "devotional")
- description: 1 sentence max (≤120 chars), capturing the song's essence — who it's for, what emotion it conveys
- vibe: a single evocative word or short phrase (e.g. "joyful celebration", "heartfelt love", "nostalgic", "devotional warmth", "energetic festivity")`;

function buildUserPrompt(song: {
  title: string;
  customer_lyrics: string | null;
  music_style: string | null;
  language: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Song Title: ${song.title}`);
  if (song.language) parts.push(`Language(s): ${song.language}`);
  if (song.music_style) parts.push(`Music Style: ${song.music_style}`);
  if (song.customer_lyrics) {
    const trimmedLyrics = song.customer_lyrics.slice(0, 1500); // cap to avoid token overflow
    parts.push(`Lyrics:\n${trimmedLyrics}`);
  }
  return parts.join('\n\n');
}

// =============================================================================
// AI Call
// =============================================================================

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err);
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      if (isRateLimit && attempt < retries) {
        const wait = 2000 * attempt; // 2s, 4s, 6s, 8s
        console.log(`  [rate-limit] Attempt ${attempt} hit quota. Retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

async function generateSongVibe(
  vertexAI: ReturnType<typeof initializeVertexAI>,
  song: { title: string; customer_lyrics: string | null; music_style: string | null; language: string | null }
): Promise<SongVibeResult> {
  const userPrompt = buildUserPrompt(song);

  const rawText = await withRetry(() => generateWithVertexAI(
    vertexAI,
    SYSTEM_PROMPT,
    userPrompt,
    0.4,  // low temperature for consistent metadata
    1024, // flash thinking is light; 1024 gives enough headroom for thinking + JSON output
    true, // JSON mode
    'gemini-2.5-flash', // use flash to avoid heavy thinking token overhead of 2.5-pro
  ));

  const parsed = parseLlmJsonText(rawText) as Partial<SongVibeResult>;

  // Coerce nulls and validate minimally
  const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const description = typeof parsed.description === 'string' ? parsed.description : '';
  const vibe = typeof parsed.vibe === 'string' ? parsed.vibe : '';

  if (!description && !vibe && tags.length === 0) {
    throw new Error(`LLM returned empty metadata. Raw: ${rawText.slice(0, 500)}`);
  }


  return {
    tags: tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
    description: description.trim(),
    vibe: vibe.trim(),
  };
}

// =============================================================================
// Batch helpers
// =============================================================================

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Melodia — Song Vibe Backfill');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Skip existing: ${SKIP_EXISTING}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} songs`);
  if (START_FROM_ID) console.log(`Resuming from ID <= ${START_FROM_ID}`);
  console.log('');

  // Fetch songs that have lyrics to work with
  const whereConditions = and(
    eq(songsTable.is_deleted, false),
    or(
      isNotNull(songsTable.customer_lyrics),
      isNotNull(songsTable.lyrics)
    ),
    START_FROM_ID ? lte(songsTable.id, START_FROM_ID) : undefined,
  );

  const songs = await db
    .select({
      id: songsTable.id,
      title: songsTable.title,
      customer_lyrics: songsTable.customer_lyrics,
      music_style: songsTable.music_style,
      language: songsTable.language,
      tags: songsTable.tags,
      song_description: songsTable.song_description,
      metadata: songsTable.metadata,
    })
    .from(songsTable)
    .where(whereConditions)
    .orderBy(sql`${songsTable.id} DESC`);

  console.log(`Found ${songs.length} songs with lyrics in the library.`);

  let toProcess = songs;

  if (SKIP_EXISTING) {
    toProcess = songs.filter((s) => {
      const hasDescription = Boolean(s.song_description?.trim());
      const hasTags = Array.isArray(s.tags) && s.tags.length > 0;
      const hasVibe = Boolean((s.metadata as Record<string, unknown> | null)?.vibe);
      return !(hasDescription && hasTags && hasVibe);
    });
    console.log(`After skipping songs with existing metadata: ${toProcess.length} to process.`);
  }

  if (LIMIT && toProcess.length > LIMIT) {
    toProcess = toProcess.slice(0, LIMIT);
    console.log(`Capped to ${LIMIT} songs.`);
  }

  if (toProcess.length === 0) {
    console.log('Nothing to process. Exiting.');
    return;
  }

  console.log(`\nProcessing ${toProcess.length} songs in batches of ${CONCURRENCY}...\n`);

  const vertexAI = initializeVertexAI();
  const batches = chunk(toProcess, CONCURRENCY);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: { id: number; title: string; error: string }[] = [];

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (song) => {
        try {
          const result = await generateSongVibe(vertexAI, {
            title: song.title,
            customer_lyrics: song.customer_lyrics,
            music_style: song.music_style,
            language: song.language,
          });

          if (!DRY_RUN) {
            const existingMeta = (song.metadata as Record<string, unknown> | null) ?? {};
            await db
              .update(songsTable)
              .set({
                tags: result.tags,
                song_description: result.description,
                metadata: { ...existingMeta, vibe: result.vibe },
              })
              .where(eq(songsTable.id, song.id));
          }

          console.log(
            `[${processed + 1}/${toProcess.length}] ✓ #${song.id} "${song.title}"` +
            `\n    vibe: ${result.vibe}` +
            `\n    tags: ${result.tags.join(', ')}` +
            `\n    desc: ${result.description}`
          );

          return { song, result };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[${processed + 1}/${toProcess.length}] ✗ #${song.id} "${song.title}" — ${errMsg}`);
          errors.push({ id: song.id, title: song.title, error: errMsg });
          throw err;
        } finally {
          processed++;
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') succeeded++;
      else failed++;
    }

    // Throttle between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // =============================================================================
  // Summary
  // =============================================================================

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed : ${toProcess.length}`);
  console.log(`Succeeded       : ${succeeded}`);
  console.log(`Failed          : ${failed}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no changes were written to the database.');

  if (errors.length > 0) {
    console.log('\nFailed songs:');
    for (const e of errors) {
      console.log(`  #${e.id} "${e.title}": ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
