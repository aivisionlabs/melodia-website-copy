/**
 * Generate Song API
 * POST /api/generate-song
 * Generates the actual song using Suno API
 */

import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generateSong } from '@/lib/services/song-generation-service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const generateSongSchema = z.object({
  lyricsDraftId: z.number(),
  songRequestId: z.number(),
  personaId: z.string().optional(),
});

async function handler(req: NextRequest, { logger }: any) {
  try {
    const body = await req.json();
    const validatedData = generateSongSchema.parse(body);

    logger.info('Validated generate song request', {
      lyricsDraftId: validatedData.lyricsDraftId,
      songRequestId: validatedData.songRequestId,
      hasPersona: !!validatedData.personaId
    });

    logger.info('Starting song generation with Suno API', {
      lyricsDraftId: validatedData.lyricsDraftId
    });

    const result = await generateSong(
      validatedData.lyricsDraftId,
      validatedData.songRequestId,
      validatedData.personaId
    );

    logger.info('Song generation initiated successfully', {
      success: result.success,
      songId: result.songId,
      status: result.status
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Generate song error', error);

    if (error instanceof z.ZodError) {
      logger.warn('Validation error in generate song', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      logger.error('Song generation service error', {
        errorMessage: error.message,
        errorName: error.name
      });

      // Return a more specific error message if available
      return NextResponse.json(
        { error: error.message || 'Failed to start song generation. Please try again.' },
        { status: 500 }
      );
    }

    logger.error('Unexpected error in generate song');
    return NextResponse.json(
      { error: 'Failed to start song generation. Please try again.' },
      { status: 500 }
    );
  }
}

// Apply logging middleware first, then rate limiting
const handlerWithLogging = withApiLogger('generate-song', handler);
export const POST = withRateLimit('song.generate', handlerWithLogging);

