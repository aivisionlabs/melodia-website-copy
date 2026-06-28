/**
 * Lyrics Versions API
 * GET /api/lyrics-versions/[songRequestId]
 * Fetches all lyrics versions for a song request
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lyricsDraftsTable } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ songRequestId: string }> }
) {
  try {
    const { songRequestId } = await params;
    const requestId = parseInt(songRequestId, 10);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid song request ID' },
        { status: 400 }
      );
    }

    // Fetch all lyrics drafts for this request, ordered by version (descending - newest first)
    const lyricsDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, requestId))
      .orderBy(desc(lyricsDraftsTable.version));

    // Format the response
    const formattedDrafts = lyricsDrafts.map(draft => ({
      id: draft.id,
      version: draft.version || 1,
      originalVersionId: draft.original_version_id || null,
      modelReadyLyrics: (draft as any).model_ready_lyrics ?? null,
      customerLyrics: (draft as any).customer_lyrics ?? null,
      songTitle: draft.song_title || null,
      musicStyle: draft.music_style || null,
      lyricsEditPrompt: draft.lyrics_edit_prompt || null,
      status: draft.status || 'draft',
      language: draft.language || 'English',
      createdAt: draft.created_at.toISOString(),
      updatedAt: draft.updated_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      requestId,
      versions: formattedDrafts,
      totalVersions: formattedDrafts.length,
    });
  } catch (error) {
    console.error('Error fetching lyrics versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lyrics versions' },
      { status: 500 }
    );
  }
}




