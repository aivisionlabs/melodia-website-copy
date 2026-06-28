/**
 * Lyrics Draft API
 * GET /api/lyrics-draft?requestId=123
 * Returns the latest lyrics draft for a song request, shaped for the
 * in-app lyrics review panel (used by the create-song / fathers-day wizards).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lyricsDraftsTable, songRequestsTable, packagesTable } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const { searchParams } = new URL(req.url);
    const requestIdParam = searchParams.get('requestId');

    if (!requestIdParam) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requestId = parseInt(requestIdParam, 10);
    if (Number.isNaN(requestId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Latest draft for this request (highest version)
    const drafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, requestId))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);

    const draft = drafts[0];
    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Lyrics draft not found' },
        { status: 404 }
      );
    }

    // Resolve remaining AI edits from the package allowance minus edits used
    const requests = await db
      .select({
        lyricsEditsUsed: songRequestsTable.lyrics_edits_used,
        allowedLyricsEdits: packagesTable.allowed_lyrics_edits,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, requestId))
      .limit(1);

    const allowedEdits = requests[0]?.allowedLyricsEdits ?? 2;
    const editsUsed = requests[0]?.lyricsEditsUsed ?? 0;
    const editsRemaining = Math.max(0, allowedEdits - editsUsed);

    return NextResponse.json({
      success: true,
      data: {
        id: draft.id,
        customerLyrics: draft.customer_lyrics || '',
        musicStyle: draft.music_style || null,
        editsRemaining,
      },
    });
  } catch (error) {
    logger.error('Error fetching lyrics draft', error as any);
    return NextResponse.json(
      { success: false, error: 'Failed to load lyrics draft' },
      { status: 500 }
    );
  }
}

const wrappedGET = withApiLogger('get-lyrics-draft', handler);
export { wrappedGET as GET };
