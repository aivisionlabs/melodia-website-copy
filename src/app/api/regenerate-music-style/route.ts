/**
 * Regenerate Music Style API
 * POST /api/regenerate-music-style
 * Regenerates the music style for an existing lyrics draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lyricsDraftsTable, songRequestsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeContext, SongRequirementsSchema, type SongRequirements } from '@/lib/services/llm/llm-context-analysis';
import { generateMusicStyle } from '@/lib/services/llm/llm-music-style-operation';
import { buildSongFormData } from '@/lib/services/llm/song-form-data-builder';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const regenerateSchema = z.object({
  lyricsDraftId: z.number(),
});

async function handler(req: NextRequest, { logger, startTime }: any) {
  const timer = createApiTimer({ logger, requestId: '', startTime });

  try {
    const body = await req.json();
    const validatedData = regenerateSchema.parse(body);

    logger.info('Regenerating music style', {
      lyricsDraftId: validatedData.lyricsDraftId,
    });

    const drafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, validatedData.lyricsDraftId))
      .limit(1);

    if (drafts.length === 0) {
      logger.warn('Lyrics draft not found', { lyricsDraftId: validatedData.lyricsDraftId });
      return NextResponse.json(
        { error: 'Lyrics draft not found' },
        { status: 404 }
      );
    }

    const draft = drafts[0];

    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, draft.song_request_id))
      .limit(1);

    if (requests.length === 0) {
      logger.warn('Song request not found for draft', {
        lyricsDraftId: draft.id,
        songRequestId: draft.song_request_id,
      });
      return NextResponse.json(
        { error: 'Song request not found' },
        { status: 404 }
      );
    }

    const songRequest = requests[0];

    // Build form data from the song request using shared helper
    const formData = buildSongFormData(songRequest as any);

    // Try to use cached SongRequirements from the draft first to avoid re-running context analysis
    let requirements: SongRequirements;
    const cachedReqs = (draft as any).song_requirements;

    if (cachedReqs) {
      try {
        requirements = SongRequirementsSchema.parse(cachedReqs);
        logger.info('Using cached SongRequirements from lyrics draft', {
          singerPerspective: requirements.singerPerspective,
          vocalGender: requirements.vocalGender,
          culturalContext: requirements.culturalContext,
        });
      } catch (parseError) {
        logger.warn('Cached SongRequirements invalid, re-running context analysis', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        timer.mark('context_analysis_start');
        requirements = await analyzeContext(formData);
        timer.mark('context_analysis_end');
      }
    } else {
      // No cached requirements, run context analysis
      timer.mark('context_analysis_start');
      logger.info('No cached SongRequirements, running context analysis for music style regeneration');
      requirements = await analyzeContext(formData);
      timer.mark('context_analysis_end');

      logger.info('Context analysis complete', {
        singerPerspective: requirements.singerPerspective,
        vocalGender: requirements.vocalGender,
        culturalContext: requirements.culturalContext,
      });
    }

    // Phase 2: Music Style Generation
    timer.mark('music_style_start');
    logger.info('Generating new music style');
    const musicStyle = await generateMusicStyle(requirements, formData);
    timer.mark('music_style_end');

    logger.info('Music style generated', { musicStyle });

    // Update the draft in the database (also backfill cached requirements if missing)
    timer.mark('update_draft_start');
    await db
      .update(lyricsDraftsTable)
      .set({
        music_style: musicStyle,
        ...(!cachedReqs ? { song_requirements: JSON.parse(JSON.stringify(requirements)) } : {}),
        updated_at: new Date(),
      })
      .where(eq(lyricsDraftsTable.id, validatedData.lyricsDraftId));
    timer.mark('update_draft_end');

    logger.info('Draft updated with new music style', {
      lyricsDraftId: validatedData.lyricsDraftId,
      musicStyle,
    });

    timer.logSummary();

    return NextResponse.json({
      success: true,
      musicStyle,
    });
  } catch (error) {
    logger.error('Regenerate music style error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to regenerate music style. Please try again.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('regenerate-music-style', handler);
export const POST = handlerWithLogging;
