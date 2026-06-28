import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSongsTable, songRequestsTable, lyricsDraftsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const patchBodySchema = z.object({
  customerLyrics: z.string().min(1, 'Lyrics cannot be empty'),
  songTitle: z.string().min(1).optional(),
});

function resolveDraftId(
  approvedLyricsId: number | null,
  selectedLyricsDraftId: number | null,
): number | null {
  return approvedLyricsId ?? selectedLyricsDraftId ?? null;
}

const EDITABLE_STATUSES = new Set(['failed', 'processing']);

async function getHandler(
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
    const [sr] = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, song.song_request_id))
      .limit(1);

    if (!sr) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }

    const draftId = resolveDraftId(song.approved_lyrics_id, sr.selected_lyrics_draft_id ?? null);
    if (!draftId) {
      logger.warn('Admin lyrics GET: no draft linked', { userSongId });
      return NextResponse.json({ error: 'No lyrics draft linked to this song' }, { status: 404 });
    }

    const drafts = await db.select().from(lyricsDraftsTable).where(eq(lyricsDraftsTable.id, draftId)).limit(1);
    if (!drafts[0]) {
      return NextResponse.json({ error: 'Lyrics draft not found' }, { status: 404 });
    }

    const d = drafts[0];

    logger.info('Admin fetched user song lyrics draft', { userSongId, draftId });

    return NextResponse.json({
      success: true,
      userSongId,
      songStatus: song.status,
      draftId,
      customerLyrics: (d as { customer_lyrics?: string | null }).customer_lyrics ?? '',
      songTitle: d.song_title ?? '',
      musicStyle: d.music_style ?? '',
    });
  } catch (error) {
    logger.error('admin user-songs lyrics GET error', error);
    return NextResponse.json({ error: 'Failed to load lyrics' }, { status: 500 });
  }
}

async function patchHandler(req: NextRequest, context: { logger: any; params?: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { customerLyrics, songTitle } = parsed.data;

    const rows = await db.select().from(userSongsTable).where(eq(userSongsTable.id, userSongId)).limit(1);
    if (!rows[0]) {
      return NextResponse.json({ error: 'User song not found' }, { status: 404 });
    }

    const song = rows[0];
    const statusNorm = (song.status || '').toLowerCase();
    if (!EDITABLE_STATUSES.has(statusNorm)) {
      logger.warn('Admin lyrics PATCH rejected: wrong song status', {
        userSongId,
        status: song.status,
      });
      return NextResponse.json(
        {
          error: 'Lyrics can only be edited while the song is failed or processing',
          currentStatus: song.status,
        },
        { status: 409 },
      );
    }

    const [sr] = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, song.song_request_id))
      .limit(1);

    if (!sr) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }

    const draftId = resolveDraftId(song.approved_lyrics_id, sr.selected_lyrics_draft_id ?? null);
    if (!draftId) {
      return NextResponse.json({ error: 'No lyrics draft linked to this song' }, { status: 404 });
    }

    const drafts = await db.select().from(lyricsDraftsTable).where(eq(lyricsDraftsTable.id, draftId)).limit(1);
    if (!drafts[0]) {
      return NextResponse.json({ error: 'Lyrics draft not found' }, { status: 404 });
    }

    await db
      .update(lyricsDraftsTable)
      .set({
        customer_lyrics: customerLyrics,
        model_ready_lyrics: null,
        ...(songTitle !== undefined ? { song_title: songTitle } : {}),
        updated_at: new Date(),
      } as any)
      .where(eq(lyricsDraftsTable.id, draftId));

    await db
      .update(userSongsTable)
      .set({ approved_lyrics_id: draftId })
      .where(eq(userSongsTable.id, userSongId));

    await db
      .update(songRequestsTable)
      .set({ selected_lyrics_draft_id: draftId, updated_at: new Date() })
      .where(eq(songRequestsTable.id, song.song_request_id));

    logger.info('Admin updated user song lyrics draft', {
      userSongId,
      draftId,
      clearedModelReady: true,
    });

    return NextResponse.json({
      success: true,
      draftId,
      message: 'Lyrics saved. Model-ready lyrics will be rebuilt on the next generation attempt.',
    });
  } catch (error) {
    logger.error('admin user-songs lyrics PATCH error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save lyrics' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('admin-user-songs-lyrics-get', getHandler);
export const PATCH = withApiLogger('admin-user-songs-lyrics-patch', patchHandler);
