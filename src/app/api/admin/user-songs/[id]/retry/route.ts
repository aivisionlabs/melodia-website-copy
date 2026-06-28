import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSongsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateSong } from '@/lib/services/song-generation-service';
import { withApiLogger } from '@/lib/logger/api-middleware';

export const runtime = 'nodejs';

async function handler(
  _req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> },
) {
  const { logger } = context;
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = context.params;
    if (!params) {
      return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
    }
    const { id } = await params;
    const userSongId = parseInt(id, 10);
    if (Number.isNaN(userSongId)) {
      return NextResponse.json({ error: 'Invalid user song ID' }, { status: 400 });
    }

    const rows = await db.select().from(userSongsTable).where(eq(userSongsTable.id, userSongId)).limit(1);
    if (!rows[0]) {
      return NextResponse.json({ error: 'User song not found' }, { status: 404 });
    }

    const song = rows[0];
    const status = (song.status || '').toLowerCase();
    if (status !== 'failed') {
      logger.warn('Admin retry rejected: song not failed', {
        userSongId,
        status: song.status,
      });
      return NextResponse.json(
        {
          error: 'Retry is only available for songs in failed status',
          currentStatus: song.status,
        },
        { status: 409 },
      );
    }

    const lyricsDraftId = song.approved_lyrics_id;
    if (!lyricsDraftId) {
      logger.warn('Admin retry rejected: missing approved_lyrics_id', { userSongId });
      return NextResponse.json(
        { error: 'Song has no approved lyrics draft; cannot retry generation.' },
        { status: 400 },
      );
    }

    logger.info('Admin retry Suno generation', {
      userSongId,
      songRequestId: song.song_request_id,
      lyricsDraftId,
    });

    const result = await generateSong(lyricsDraftId, song.song_request_id);

    logger.info('Admin retry Suno generation result', {
      userSongId,
      success: result.success,
      songId: result.songId,
      retriedFromFailure: (result as { retriedFromFailure?: boolean }).retriedFromFailure,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('admin user-songs retry error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry song generation' },
      { status: 500 },
    );
  }
}

const logged = withApiLogger('admin-user-songs-retry', handler);
export const POST = logged;
