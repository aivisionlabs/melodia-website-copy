/**
 * Consumer Variation Status
 * GET /api/songs/[songId]/variation-status
 *
 * Returns the most recent variation song for a given parent song.
 * Polled by ConsumerVariationPanel until the variation is ready.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userSongsTable, songRequestsTable } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId: songIdParam } = await params;
  const songId = parseInt(songIdParam);

  if (isNaN(songId)) {
    return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
  }

  const [song] = await db
    .select({ song_request_id: userSongsTable.song_request_id })
    .from(userSongsTable)
    .where(eq(userSongsTable.id, songId))
    .limit(1);

  if (!song?.song_request_id) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Find the most recent variation request for this parent
  const [variationRequest] = await db
    .select({ id: songRequestsTable.id, status: songRequestsTable.status })
    .from(songRequestsTable)
    .where(eq(songRequestsTable.parent_request_id, song.song_request_id))
    .orderBy(desc(songRequestsTable.id))
    .limit(1);

  if (!variationRequest) {
    return NextResponse.json({ variationSongId: null, status: null });
  }

  // Find the user song for this variation request
  const [variationSong] = await db
    .select({ id: userSongsTable.id, status: userSongsTable.status })
    .from(userSongsTable)
    .where(eq(userSongsTable.song_request_id, variationRequest.id))
    .limit(1);

  if (!variationSong) {
    return NextResponse.json({ variationSongId: null, status: 'pending' });
  }

  return NextResponse.json({
    variationSongId: variationSong.id,
    status: variationSong.status,
  });
}
