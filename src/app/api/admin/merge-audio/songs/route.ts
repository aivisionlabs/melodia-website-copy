import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable } from '@/lib/db/schema';
import { and, eq, desc, isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all songs with audio URLs (excluding deleted ones)
    const songs = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        slug: songsTable.slug,
        song_url: songsTable.song_url,
        song_url_variant_1: songsTable.song_url_variant_1,
        suno_variants: songsTable.suno_variants,
        selected_variant: songsTable.selected_variant,
        created_at: songsTable.created_at,
      })
      .from(songsTable)
      .where(
        and(
          eq(songsTable.is_deleted, false),
          isNotNull(songsTable.song_url)
        )
      )
      .orderBy(desc(songsTable.created_at));

    // Format songs with available audio URLs
    const formattedSongs = songs
      .map(song => {
        // Get primary audio URL
        let audioUrl = song.song_url;

        // If there are variants, try to get the selected variant's audio URL
        if (song.suno_variants && typeof song.suno_variants === 'object') {
          const variants = Array.isArray(song.suno_variants)
            ? song.suno_variants
            : Object.values(song.suno_variants);

          if (variants.length > 0) {
            const selectedIndex = song.selected_variant ?? 0;
            const selectedVariant = variants[selectedIndex];
            if (selectedVariant?.audioUrl || selectedVariant?.streamAudioUrl) {
              audioUrl = selectedVariant.audioUrl || selectedVariant.streamAudioUrl;
            }
          }
        }

        // Fallback to variant 1 URL if available
        if (!audioUrl && song.song_url_variant_1) {
          audioUrl = song.song_url_variant_1;
        }

        return {
          id: song.id,
          title: song.title,
          slug: song.slug,
          audioUrl: audioUrl,
          createdAt: song.created_at.toISOString(),
        };
      })
      .filter(song => song.audioUrl); // Only include songs with valid audio URLs

    return NextResponse.json({
      success: true,
      songs: formattedSongs,
    });
  } catch (error) {
    console.error('Error fetching songs for merge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

