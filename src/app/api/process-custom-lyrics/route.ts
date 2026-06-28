/**
 * Process Custom Lyrics API
 * POST /api/process-custom-lyrics
 *
 * Saves user-provided custom lyrics directly as customer_lyrics (Romanized display form).
 * model_ready_lyrics (native-script audio-model-ready version) is crafted only at
 * approval time by approveLyricsAction via the audio-model crafter (Phase 2).
 *
 * Also generates music style in the background for the UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lyricsDraftsTable, songRequestsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeContext } from '@/lib/services/llm/llm-context-analysis';
import { generateMusicStyle } from '@/lib/services/llm/llm-music-style-operation';
import { buildSongFormData } from '@/lib/services/llm/song-form-data-builder';
import { createPipelineRunId, recordPipelineStepOutput } from '@/lib/services/llm/llm-pipeline-step-recorder';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';
import { sanitizeInvisibleChars } from '@/lib/services/llm/custom-lyrics-suno-structure-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const processCustomLyricsSchema = z.object({
  songRequestId: z.number(),
  customLyrics: z.string().min(50, 'Custom lyrics must be at least 50 characters long').max(2500, 'Lyrics must be under 2500 characters so the song can be generated correctly'),
});

/** Derive song title from recipient details (first name) and occasion. */
function deriveTitleFromRequest(recipientDetails: string | null, occasion: string | null): string {
  const firstPart = (recipientDetails || '')
    .trim()
    .split(/\s+/)[0]
    ?.replace(/,/g, '')
    .trim() || 'Song';
  const occ = (occasion || '').trim();
  return occ ? `${firstPart}'s ${occ}` : firstPart;
}

async function handler(req: NextRequest, { logger, startTime }: any) {
  const timer = createApiTimer({ logger, requestId: '', startTime });

  try {
    const body = await req.json();
    const validatedData = processCustomLyricsSchema.parse(body);

    const customLyrics = sanitizeInvisibleChars(validatedData.customLyrics);

    logger.info('Validated process custom lyrics request', {
      songRequestId: validatedData.songRequestId,
      customLyricsLength: customLyrics.length
    });

    // Get song request
    timer.mark('fetch_song_request_start');
    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, validatedData.songRequestId))
      .limit(1);
    timer.mark('fetch_song_request_end');

    if (requests.length === 0) {
      logger.warn('Song request not found', { songRequestId: validatedData.songRequestId });
      return NextResponse.json(
        { error: 'Song request not found' },
        { status: 404 }
      );
    }

    const request = requests[0];
    const derivedTitle = deriveTitleFromRequest(
      request.recipient_details,
      request.occasion ?? null
    );
    logger.info('Found song request', {
      songRequestId: request.id,
      languages: request.languages,
      derivedTitle,
    });

    // Generate music style for the UI (context analysis + style generation in background)
    timer.mark('music_style_start');
    const formData = buildSongFormData(request as any);
    const pipelineRunId = createPipelineRunId();

    let cachedRequirements: any = null;
    let musicStyle: string | null = null;

    try {
      const requirements = await analyzeContext(formData);
      cachedRequirements = requirements;
      try {
        musicStyle = await generateMusicStyle(requirements, formData);
      } catch (err) {
        logger.error('Music style generation failed for custom lyrics, proceeding without it', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } catch (err) {
      logger.error('Context analysis failed for custom lyrics, proceeding without it', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    timer.mark('music_style_end');

    await recordPipelineStepOutput({
      songRequestId: validatedData.songRequestId,
      pipelineRunId,
      stepName: 'custom_lyrics_saved',
      stepOrder: 1,
      inputSummary: {
        customLyricsLength: customLyrics.length,
      },
      outputSnapshot: {
        derivedTitle,
        musicStyle: musicStyle || null,
      },
      modelName: 'none',
      success: true,
    });

    logger.info('Saving custom lyrics as customer_lyrics (display-first)', {
      customLyricsLength: customLyrics.length,
    });

    // Get current version number
    timer.mark('check_existing_drafts');
    const existingDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, validatedData.songRequestId));
    const nextVersion = existingDrafts.length + 1;

    // Save the user's custom lyrics directly as customer_lyrics.
    // model_ready_lyrics is NOT generated here; it is crafted at approval time
    // by approveLyricsAction via the audio-model crafter (Phase 2).
    timer.mark('save_draft_start');
    const newDrafts = await db
      .insert(lyricsDraftsTable)
      .values({
        song_request_id: validatedData.songRequestId,
        version: nextVersion,
        customer_lyrics: customLyrics,
        model_ready_lyrics: null,
        song_title: derivedTitle,
        music_style: musicStyle || null,
        language: request.languages || 'English',
        llm_model_name: 'user_provided',
        lyrics_edit_prompt: null,
        song_requirements: cachedRequirements ? JSON.parse(JSON.stringify(cachedRequirements)) : null,
        status: 'approved',
        custom_lyrics: true,
      } as any)
      .returning();

    const newDraft = newDrafts[0];
    timer.mark('save_draft_end');

    // Auto-select this draft for song generation
    timer.mark('update_status_start');
    await db
      .update(songRequestsTable)
      .set({
        selected_lyrics_draft_id: newDraft.id,
        updated_at: new Date(),
      })
      .where(eq(songRequestsTable.id, validatedData.songRequestId));
    timer.mark('update_status_end');

    logger.info('Custom lyrics draft saved and auto-selected', {
      draftId: newDraft.id,
      version: newDraft.version,
    });

    timer.logSummary();

    return NextResponse.json({
      success: true,
      draft: {
        id: newDraft.id,
        lyrics: customLyrics,
        title: newDraft.song_title,
        version: newDraft.version,
        status: newDraft.status,
        custom_lyrics: true,
        musicStyle: (newDraft as any).music_style || null,
      },
    });
  } catch (error) {
    logger.error('Process custom lyrics error', error);

    if (error instanceof z.ZodError) {
      logger.warn('Validation error in process custom lyrics', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process custom lyrics. Please try again.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('process-custom-lyrics', handler);
export const POST = withRateLimit('song.generate_lyrics', handlerWithLogging);
