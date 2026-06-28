/**
 * Update Lyrics API
 * POST /api/update-lyrics
 * Saves manually edited lyrics as a new version
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateLyricsAction } from '@/lib/lyrics-display-actions';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { z } from 'zod';

const updateLyricsSchema = z.object({
  lyricsDraftId: z.number().int().positive(),
  editedLyrics: z.string().min(1, 'Lyrics cannot be empty'),
});

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = updateLyricsSchema.parse(body);

    const result = await updateLyricsAction(
      validatedData.lyricsDraftId,
      validatedData.editedLyrics
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        draft: result.draft,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to update lyrics' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update lyrics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update lyrics. Please try again.' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit('song.generate_lyrics', handler);




