import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function putHandler(
  request: NextRequest,
  { params, logger }: { params: Promise<{ id: string }> } & ApiLoggerContext
) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      logger.warn('Unauthorized language update attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const songId = parseInt(id);
    if (isNaN(songId)) {
      logger.warn('Invalid song ID provided', { id });
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    const body = await request.json();
    const { language } = body;

    if (language === undefined || language === null) {
      logger.warn('Language field missing in request', { songId });
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    // Get current language for logging
    const currentSong = await db
      .select({ language: songsTable.language })
      .from(songsTable)
      .where(eq(songsTable.id, songId))
      .limit(1);

    const previousLanguage = currentSong[0]?.language || null;

    // Update the song with the new language
    await db
      .update(songsTable)
      .set({ language: language || null })
      .where(eq(songsTable.id, songId));

    logger.info('Song language updated successfully', {
      songId,
      previousLanguage,
      newLanguage: language || null,
    });

    return NextResponse.json({
      success: true,
      songId,
      message: 'Language updated successfully',
    });
  } catch (error) {
    logger.error('Error updating song language', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    );
  }
}

export const PUT = withApiLogger('admin-songs-language-update', putHandler);

