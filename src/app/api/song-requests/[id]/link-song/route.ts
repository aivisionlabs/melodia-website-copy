import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable, songRequestsTable, auditLogEventsTable, songRequestSongsTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function logAuditSongRequest(id: number, action: string, before: any, after: any) {
  await db.insert(auditLogEventsTable).values({
    entity_type: 'song_request',
    entity_id: String(id),
    action,
    before: before ? JSON.stringify(before) as any : null,
    after: after ? JSON.stringify(after) as any : null,
    created_at: new Date(),
  });
}

export async function POST(
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

    const { id: idParam } = await params;
    const requestId = parseInt(idParam);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await req.json();
    const { songId } = body || {};

    if (!songId || !Number.isFinite(Number(songId))) {
      return NextResponse.json({ error: 'Valid songId is required' }, { status: 400 });
    }

    const songIdNum = Number(songId);

    // Verify song request exists
    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, requestId))
      .limit(1);

    if (requests.length === 0) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }

    // Verify song exists
    const songs = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, songIdNum))
      .limit(1);

    if (songs.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = songs[0];

    // Check if link already exists
    const existingLinks = await db
      .select()
      .from(songRequestSongsTable)
      .where(
        and(
          eq(songRequestSongsTable.song_request_id, requestId),
          eq(songRequestSongsTable.song_id, songIdNum)
        )
      )
      .limit(1);

    if (existingLinks.length > 0) {
      return NextResponse.json(
        { error: 'Song is already linked to this request' },
        { status: 400 }
      );
    }

    // Link the song to the request via junction table
    const [newLink] = await db
      .insert(songRequestSongsTable)
      .values({
        song_request_id: requestId,
        song_id: songIdNum,
        created_at: new Date(),
      })
      .returning();

    // Log the audit
    await logAuditSongRequest(requestId, 'song_request.link_song', null, newLink);

    return NextResponse.json({
      success: true,
      data: { ...song, linkId: newLink.id },
    });
  } catch (error) {
    console.error('Error linking song to request:', error);
    return NextResponse.json(
      { error: 'Failed to link song to request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id: idParam } = await params;
    const requestId = parseInt(idParam);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await req.json();
    const { songId } = body || {};

    if (!songId || !Number.isFinite(Number(songId))) {
      return NextResponse.json({ error: 'Valid songId is required' }, { status: 400 });
    }

    const songIdNum = Number(songId);

    // Verify song exists and is linked to this request
    const songs = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, songIdNum))
      .limit(1);

    if (songs.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Verify link exists in junction table
    const existingLinks = await db
      .select()
      .from(songRequestSongsTable)
      .where(
        and(
          eq(songRequestSongsTable.song_request_id, requestId),
          eq(songRequestSongsTable.song_id, songIdNum)
        )
      )
      .limit(1);

    if (existingLinks.length === 0) {
      return NextResponse.json(
        { error: 'Song is not linked to this request' },
        { status: 400 }
      );
    }

    const linkToDelete = existingLinks[0];

    // Unlink the song from the request by deleting from junction table
    await db
      .delete(songRequestSongsTable)
      .where(
        and(
          eq(songRequestSongsTable.song_request_id, requestId),
          eq(songRequestSongsTable.song_id, songIdNum)
        )
      );

    // Log the audit
    await logAuditSongRequest(requestId, 'song_request.unlink_song', linkToDelete, null);

    return NextResponse.json({
      success: true,
      data: { id: songIdNum, unlinked: true },
    });
  } catch (error) {
    console.error('Error unlinking song from request:', error);
    return NextResponse.json(
      { error: 'Failed to unlink song from request' },
      { status: 500 }
    );
  }
}

