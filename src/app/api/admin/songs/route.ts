import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable, songRequestSongsTable } from '@/lib/db/schema';
import { desc, and, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all songs (excluding deleted ones) sorted by created_at descending
    const songs = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        slug: songsTable.slug,
        created_at: songsTable.created_at,
      })
      .from(songsTable)
      .where(and(
        eq(songsTable.is_deleted, false),
        eq(songsTable.add_to_library, true)
      ))
      .orderBy(desc(songsTable.created_at));

    // Get all linked songs from junction table
    const linkedSongs = await db
      .select({
        song_id: songRequestSongsTable.song_id,
      })
      .from(songRequestSongsTable);

    const linkedSongIds = new Set(linkedSongs.map(ls => ls.song_id));

    // Format for dropdown
    const formattedSongs = songs.map(song => {
      const isLinked = linkedSongIds.has(song.id);

      return {
        id: song.id,
        label: `${song.title} (ID: ${song.id})${isLinked ? ' - Linked' : ''}`,
        title: song.title,
        slug: song.slug,
        createdAt: song.created_at.toISOString(),
        isLinked,
      };
    });

    return NextResponse.json({
      success: true,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

