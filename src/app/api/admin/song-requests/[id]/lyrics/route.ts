import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { lyricsDraftsTable, songRequestsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Verify request exists
    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, requestId))
      .limit(1);

    if (requests.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Fetch all lyrics drafts for this request, ordered by version (ascending - oldest first)
    const lyricsDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, requestId))
      .orderBy(lyricsDraftsTable.version);

    // Format the response
    const formattedDrafts = lyricsDrafts.map(draft => ({
      id: draft.id,
      version: draft.version || 1,
      customer_lyrics: (draft as any).customer_lyrics || null,
      model_ready_lyrics: (draft as any).model_ready_lyrics || null,
      song_title: draft.song_title,
      music_style: draft.music_style,
      lyrics_edit_prompt: draft.lyrics_edit_prompt,
      status: draft.status,
      created_at: draft.created_at.toISOString(),
      updated_at: draft.updated_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      requestId,
      lyricsDrafts: formattedDrafts,
      totalVersions: formattedDrafts.length,
    });
  } catch (error) {
    console.error('Error fetching lyrics iterations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lyrics iterations' },
      { status: 500 }
    );
  }
}

