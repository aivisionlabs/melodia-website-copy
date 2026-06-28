/**
 * Update Music Style API
 * PATCH /api/update-music-style
 * Saves a manually edited music style for a lyrics draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lyricsDraftsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateSchema = z.object({
  lyricsDraftId: z.number(),
  musicStyle: z.string().min(1, 'Music style cannot be empty').max(1000, 'Music style cannot exceed 1000 characters'),
});

async function handler(req: NextRequest, { logger }: any) {
  try {
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    logger.info('Updating music style', {
      lyricsDraftId: validatedData.lyricsDraftId,
      musicStyleLength: validatedData.musicStyle.length,
    });

    // Verify the draft exists
    const drafts = await db
      .select({ id: lyricsDraftsTable.id })
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

    // Update the music style
    await db
      .update(lyricsDraftsTable)
      .set({
        music_style: validatedData.musicStyle.trim(),
        updated_at: new Date(),
      })
      .where(eq(lyricsDraftsTable.id, validatedData.lyricsDraftId));

    logger.info('Music style updated successfully', {
      lyricsDraftId: validatedData.lyricsDraftId,
      musicStyle: validatedData.musicStyle.trim(),
    });

    return NextResponse.json({
      success: true,
      musicStyle: validatedData.musicStyle.trim(),
    });
  } catch (error) {
    logger.error('Update music style error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update music style. Please try again.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('update-music-style', handler);
export const PATCH = handlerWithLogging;
