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

    // Fetch song with timestamp lyrics
    const song = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        slug: songsTable.slug,
        timestamp_lyrics: songsTable.timestamp_lyrics,
        timestamped_lyrics_variants: songsTable.timestamped_lyrics_variants,
        selected_variant: songsTable.selected_variant,
      })
      .from(songsTable)
      .where(eq(songsTable.id, songId))
      .limit(1);

    if (!song || song.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const songData = song[0];

    // Determine which timestamp lyrics to return
    let timestampLyrics = songData.timestamp_lyrics;



    if (!timestampLyrics) {
      return NextResponse.json({ error: 'No timestamp lyrics found for this song' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      songId: songData.id,
      title: songData.title,
      slug: songData.slug,
      timestamp_lyrics: timestampLyrics,
      selected_variant: songData.selected_variant,
    });
  } catch (error) {
    console.error('Error fetching timestamp lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timestamp lyrics' },
      { status: 500 }
    );
  }
}

