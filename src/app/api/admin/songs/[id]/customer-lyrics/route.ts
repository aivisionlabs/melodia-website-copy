import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
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
    const songId = parseInt(id);
    if (isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    // Fetch the song to get customer_lyrics
    const song = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        customer_lyrics: songsTable.customer_lyrics,
      })
      .from(songsTable)
      .where(eq(songsTable.id, songId))
      .limit(1);

    if (!song || song.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const songData = song[0];

    return NextResponse.json({
      success: true,
      songId: songData.id,
      title: songData.title,
      customer_lyrics: songData.customer_lyrics || '',
    });
  } catch (error) {
    console.error('Error fetching customer lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer lyrics' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
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
    const songId = parseInt(id);
    if (isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    const body = await request.json();
    const { customer_lyrics } = body;

    if (customer_lyrics === undefined || customer_lyrics === null) {
      return NextResponse.json(
        { error: 'Customer lyrics is required' },
        { status: 400 }
      );
    }

    // Update the song with the new customer_lyrics
    await db
      .update(songsTable)
      .set({ customer_lyrics: customer_lyrics })
      .where(eq(songsTable.id, songId));

    return NextResponse.json({
      success: true,
      songId,
      message: 'Customer lyrics updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to update customer lyrics' },
      { status: 500 }
    );
  }
}

