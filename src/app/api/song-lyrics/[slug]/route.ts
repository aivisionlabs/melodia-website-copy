import { NextRequest, NextResponse } from 'next/server';
import { getSongBySlug } from '@/lib/db/queries/select';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Song slug is required' },
        { status: 400 }
      );
    }

    // Get the song by slug
    const song = await getSongBySlug(slug);

    if (!song) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    // Prefer customer_lyrics (English transliteration) for end-customer display,
    // but always fall back to original lyrics if transliteration is not available.
    const plainLyrics = (song as any).customer_lyrics || song.lyrics;

    // Return only the lyrics-related fields
    const lyricsData = {
      success: true,
      song: {
        slug: song.slug,
        title: song.title,
        lyrics: plainLyrics,
        timestamp_lyrics: song.timestamp_lyrics,
        timestamped_lyrics_variants: song.timestamped_lyrics_variants,
        selected_variant: song.selected_variant,
        show_lyrics: song.show_lyrics,
      }
    };

    return NextResponse.json(lyricsData);
  } catch (error) {
    console.error('Error fetching song lyrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch song lyrics' },
      { status: 500 }
    );
  }
}
