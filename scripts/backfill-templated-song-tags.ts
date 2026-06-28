/**
 * One-time backfill: assign tags to all templated songs using Gemini/Vertex AI.
 * Analyzes each song's title, description, music_style, language, and lyrics
 * and picks tags from the predefined PREDEFINED_TAGS list.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/backfill-templated-song-tags.ts dotenv_config_path=.env.local
 *
 * Options (env vars):
 *   DRY_RUN=true        — preview proposed tags without writing to DB
 *   SKIP_EXISTING=true  — skip songs that already have tags
 *   LIMIT=10            — cap number of songs to process
 *   START_FROM_ID=100   — only process songs with id >= this value
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { templatedSongsTable } from '../src/lib/db/schema';
import { eq, gte, and, or } from 'drizzle-orm';
import {
  initializeVertexAI,
  generateWithVertexAI,
  parseLlmJsonText,
} from '../src/lib/services/llm/llm-shared';
import { AI_TAGGABLE_TAGS, TAG_GROUPS } from '../src/lib/constants/song-tags';

// =============================================================================
// Config
// =============================================================================

const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_EXISTING = process.env.SKIP_EXISTING === 'true';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const START_FROM_ID = process.env.START_FROM_ID ? parseInt(process.env.START_FROM_ID, 10) : undefined;
const CONCURRENCY = 2;
const DELAY_MS = 1000;

// =============================================================================
// Prompt
// =============================================================================

const VIBE_TAGS = TAG_GROUPS.find((g) => g.label === 'Vibe')!.tags;
const AUDIENCE_TAGS = TAG_GROUPS.find((g) => g.label === 'Audience')!.tags;
const GENRE_TAGS = TAG_GROUPS.find((g) => g.label === 'Genre')!.tags;

const SYSTEM_PROMPT = `You are a music metadata expert for an Indian AI song creation platform called Melodia.
Your job is to pick exactly ONE tag per dimension for a templated song.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "vibe": "<one vibe tag>",
  "audience": "<one audience tag>",
  "genre": "<one genre tag>"
}

Rules:
- Pick exactly one tag per key — the single best fit
- Only use tags from the allowed list for each key — do NOT invent new tags
- Do NOT pick occasion or event tags (birthday, wedding, etc.)

Allowed vibe tags: ${VIBE_TAGS.join(', ')}
Allowed audience tags: ${AUDIENCE_TAGS.join(', ')}
Allowed genre tags: ${GENRE_TAGS.join(', ')}`;

function buildPrompt(song: {
  title: string;
  description: string | null;
  music_style: string | null;
  language: string | null;
  draft_lyrics: string | null;
  template_lyrics: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Song Title: ${song.title}`);
  if (song.language) parts.push(`Language(s): ${song.language}`);
  if (song.music_style) parts.push(`Music Style: ${song.music_style}`);
  if (song.description) parts.push(`Description: ${song.description}`);
  const lyrics = song.template_lyrics ?? song.draft_lyrics;
  if (lyrics) parts.push(`Lyrics (excerpt):\n${lyrics.slice(0, 800)}`);
  return parts.join('\n\n');
}

// =============================================================================
// Helpers
// =============================================================================

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err);
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      if (isRateLimit && attempt < retries) {
        const wait = 2000 * attempt;
        console.log(`  [rate-limit] attempt ${attempt} hit quota. Retrying in ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}

async function generateTags(
  vertexAI: ReturnType<typeof initializeVertexAI>,
  song: Parameters<typeof buildPrompt>[0]
): Promise<string[]> {
  const userPrompt = buildPrompt(song);
  const rawText = await withRetry(() =>
    generateWithVertexAI(vertexAI, SYSTEM_PROMPT, userPrompt, 0.3, 1024, true, 'gemini-2.5-flash')
  );
  console.log(`    [debug] raw: ${rawText.slice(0, 300)}`);
  const parsed = parseLlmJsonText(rawText) as { vibe?: unknown; audience?: unknown; genre?: unknown };

  const pick = (value: unknown, allowed: string[]): string | null => {
    const t = String(value ?? '').toLowerCase().trim();
    return allowed.includes(t) ? t : null;
  };

  const vibe = pick(parsed.vibe, VIBE_TAGS);
  const audience = pick(parsed.audience, AUDIENCE_TAGS);
  const genre = pick(parsed.genre, GENRE_TAGS);

  console.log(`    [debug] vibe=${vibe ?? 'none'} audience=${audience ?? 'none'} genre=${genre ?? 'none'}`);

  return [vibe, audience, genre].filter((t): t is string => t !== null);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Melodia — Templated Song Tags Backfill');
  console.log('='.repeat(60));
  console.log(`Mode          : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Skip existing : ${SKIP_EXISTING}`);
  if (LIMIT) console.log(`Limit         : ${LIMIT}`);
  if (START_FROM_ID) console.log(`Start from ID : ${START_FROM_ID}`);
  console.log('');

  const baseFilter = or(
    eq(templatedSongsTable.is_active, true),
    eq(templatedSongsTable.is_namedrop_eligible, true),
  );
  const where = START_FROM_ID
    ? and(baseFilter, gte(templatedSongsTable.id, START_FROM_ID))
    : baseFilter;

  const songs = await db
    .select({
      id: templatedSongsTable.id,
      title: templatedSongsTable.title,
      description: templatedSongsTable.description,
      music_style: templatedSongsTable.music_style,
      language: templatedSongsTable.language,
      draft_lyrics: templatedSongsTable.draft_lyrics,
      template_lyrics: templatedSongsTable.template_lyrics,
      tags: templatedSongsTable.tags,
    })
    .from(templatedSongsTable)
    .where(where)
    .orderBy(templatedSongsTable.id);

  console.log(`Found ${songs.length} templated songs (active or namedrop-eligible).`);

  let toProcess = songs;

  if (SKIP_EXISTING) {
    toProcess = songs.filter((s) => !Array.isArray(s.tags) || s.tags.length === 0);
    console.log(`After skipping songs with existing tags: ${toProcess.length} to process.`);
  }

  if (LIMIT && toProcess.length > LIMIT) {
    toProcess = toProcess.slice(0, LIMIT);
    console.log(`Capped to ${LIMIT} songs.`);
  }

  if (toProcess.length === 0) {
    console.log('Nothing to process. Exiting.');
    process.exit(0);
  }

  console.log(`\nProcessing ${toProcess.length} songs in batches of ${CONCURRENCY}…\n`);

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
          const tags = await generateTags(vertexAI, song);

          if (!DRY_RUN) {
            await db
              .update(templatedSongsTable)
              .set({ tags, updated_at: new Date() })
              .where(eq(templatedSongsTable.id, song.id));
          }

          console.log(
            `[${processed + 1}/${toProcess.length}] ✓ #${song.id} "${song.title}"\n    tags: ${tags.join(', ') || '(none matched)'}`
          );
          return tags;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[${processed + 1}/${toProcess.length}] ✗ #${song.id} "${song.title}" — ${msg}`);
          errors.push({ id: song.id, title: song.title, error: msg });
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

    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed : ${toProcess.length}`);
  console.log(`Succeeded       : ${succeeded}`);
  console.log(`Failed          : ${failed}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no changes written to the database.');

  if (errors.length > 0) {
    console.log('\nFailed songs:');
    for (const e of errors) console.log(`  #${e.id} "${e.title}": ${e.error}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
