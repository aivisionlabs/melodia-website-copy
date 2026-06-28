/**
 * Approve Lyrics API
 * POST /api/approve-lyrics
 * Marks lyrics as approved and ready for song generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { approveLyricsAction } from '@/lib/lyrics-display-actions';
import { z } from 'zod';

const approveLyricsSchema = z.object({
  lyricsDraftId: z.number(),
  songRequestId: z.number(),
  selectedLyricsDraftId: z.number().optional(), // Optional: which version to use for song generation
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = approveLyricsSchema.parse(body);

    const result = await approveLyricsAction(
      validatedData.lyricsDraftId,
      validatedData.songRequestId,
      validatedData.selectedLyricsDraftId
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Lyrics approved successfully',
        redirectTo: result.redirectTo,
        ...(result.songId && { songId: result.songId }),
      });
    } else {
      return NextResponse.json(
        { error: true, message: result.error || 'Failed to approve lyrics' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Approve lyrics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve lyrics' },
      { status: 500 }
    );
  }
}

