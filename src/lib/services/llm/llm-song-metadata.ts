import { z } from 'zod';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import {
  initializeVertexAI,
  generateWithVertexAI,
  sanitizeJsonString,
  LLM_CONFIG,
} from './llm-shared';
import type { SongRequirements } from './llm-context-analysis';

const LyricsDraftTagsSchema = z.object({
  tags: z.array(z.string()).max(16),
});

const AdminListingSchema = z.object({
  song_description: z.string().max(200),
  tags: z.array(z.string()).max(16),
});

function normalizeTagList(tags: string[], max = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const s = t.trim().toLowerCase().replace(/\s+/g, ' ');
    if (s.length < 2 || s.length > 48) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function lyricsExcerpt(text: string, max = 4000): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}\n…`;
}

/**
 * Content-derived tags only (theme + style). No occasion/mood/language/recipient in output.
 */
export async function generateLyricsDraftTags(input: {
  title: string;
  description: string | null;
  musicStyle: string | null;
  lyricsText: string;
  songRequirements?: SongRequirements | null;
}): Promise<{ tags: string[] }> {
  if (isDemoModeEnabled()) {
    return {
      tags: normalizeTagList(['celebration', 'personalized', 'melodic'], 8),
    };
  }

  const req = input.songRequirements;
  const themesHint = req?.keyThemes?.length
    ? `Pre-analyzed themes (use as hints only): ${req.keyThemes.join(', ')}`
    : '';
  const genreHint = req?.suggestedGenre ? `Suggested genre hint: ${req.suggestedGenre}` : '';

  const systemPrompt = `You output JSON only. Infer search-friendly tags for a personalized song (India-focused).
Rules:
- Return 3–8 short tags: themes and musical style/genre only (e.g. love, gratitude, bollywood, ballad).
- Use lowercase words or short phrases (1–2 words each).
- Do NOT output occasion names, moods, languages, or relationship words (birthday, wedding, hindi, romantic, mother, friend, etc.) — those are stored separately.
- No hashtags, no duplicates.`;

  const userPrompt = `Title: ${input.title}
Music style string: ${input.musicStyle ?? 'unknown'}
Short description from lyrics step: ${input.description ?? 'none'}
${themesHint}
${genreHint}

Lyrics excerpt:
${lyricsExcerpt(input.lyricsText)}

Respond with JSON: {"tags":["tag1","tag2",...]}`;

  const vertexAI = initializeVertexAI();
  const raw = await generateWithVertexAI(
    vertexAI,
    systemPrompt,
    userPrompt,
    LLM_CONFIG.metadataEnrichment.temperature,
    LLM_CONFIG.metadataEnrichment.maxOutputTokens,
    true,
    LLM_CONFIG.metadataEnrichment.modelName
  );

  const parsed = LyricsDraftTagsSchema.parse(JSON.parse(sanitizeJsonString(raw)));
  return { tags: normalizeTagList(parsed.tags, 10) };
}

/**
 * Public library listing line + tags for admin-created songs table rows (after Suno completes).
 */
export async function generateAdminSongListingMetadata(input: {
  title: string;
  lyricsText: string;
  musicStyle: string | null;
  language: string | null;
  /** For model context only — do not emit as tags */
  occasion?: string | null;
  mood?: string[] | null;
}): Promise<{ song_description: string; tags: string[] }> {
  if (isDemoModeEnabled()) {
    return {
      song_description: `Listen to ${input.title.slice(0, 80)} — a personalized AI song on Melodia.`,
      tags: normalizeTagList(['personalized', 'custom song', 'melodia'], 10),
    };
  }

  const systemPrompt = `You output JSON only. Write metadata for a public song listing (India, Melodia).
Rules:
- song_description: One or two sentences, max 160 characters, compelling, no quotes, mention it is personalized/custom where natural.
- tags: 3–10 lowercase tags for search — theme + musical vibe/genre only.
- Do NOT put occasion, mood, language names, or recipient relationship words in tags (those exist elsewhere).
- No PII. No hashtags.`;

  const moodStr = input.mood?.length ? input.mood.join(', ') : 'unknown';
  const userPrompt = `Title: ${input.title}
Music style: ${input.musicStyle ?? 'unknown'}
Languages field: ${input.language ?? 'unknown'}
(Internal context — do not repeat in tags: occasion=${input.occasion ?? 'n/a'}, mood=${moodStr})

Lyrics excerpt:
${lyricsExcerpt(input.lyricsText)}

Respond with JSON: {"song_description":"...","tags":["..."]}`;

  const vertexAI = initializeVertexAI();
  const raw = await generateWithVertexAI(
    vertexAI,
    systemPrompt,
    userPrompt,
    LLM_CONFIG.metadataEnrichment.temperature,
    LLM_CONFIG.metadataEnrichment.maxOutputTokens,
    true,
    LLM_CONFIG.metadataEnrichment.modelName
  );

  const parsed = AdminListingSchema.parse(JSON.parse(sanitizeJsonString(raw)));
  let desc = parsed.song_description.trim();
  if (desc.length > 160) desc = `${desc.slice(0, 157)}…`;
  return {
    song_description: desc,
    tags: normalizeTagList(parsed.tags, 10),
  };
}

export async function enrichAdminSongListingMetadata(songId: number): Promise<void> {
  try {
    const { db } = await import('@/lib/db');
    const { songsTable, songRequestsTable } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const { updateSong } = await import('@/lib/db/queries/update');

    const rows = await db
      .select({
        song: songsTable,
        occasion: songRequestsTable.occasion,
        mood: songRequestsTable.mood,
      })
      .from(songsTable)
      .leftJoin(songRequestsTable, eq(songsTable.song_request_id, songRequestsTable.id))
      .where(eq(songsTable.id, songId))
      .limit(1);

    const row = rows[0];
    if (!row?.song) {
      logger.warn('enrichAdminSongListingMetadata: song not found', { songId });
      return;
    }

    const s = row.song;
    const lyricsText =
      (s.customer_lyrics && String(s.customer_lyrics).trim()) ||
      (s.lyrics && String(s.lyrics).trim()) ||
      (s.prompt && String(s.prompt).trim()) ||
      '';

    if (!lyricsText) {
      logger.warn('enrichAdminSongListingMetadata: no lyrics text on song', { songId });
      return;
    }

    const meta = await generateAdminSongListingMetadata({
      title: s.title,
      lyricsText,
      musicStyle: s.music_style,
      language: s.language,
      occasion: row.occasion,
      mood: row.mood,
    });

    await updateSong(songId, {
      song_description: meta.song_description,
      tags: meta.tags,
    });

    logger.info('enrichAdminSongListingMetadata: updated song', {
      songId,
      tagCount: meta.tags.length,
    });
  } catch (err) {
    logger.error('enrichAdminSongListingMetadata failed — song creation continues unaffected', {
      songId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
