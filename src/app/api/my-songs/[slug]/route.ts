import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userSongsTable, songRequestsTable, lyricsDraftsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAnonymousCookie } from '@/lib/auth/cookies';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Song slug is required' }, { status: 400 });
    }

    // Check if admin is accessing
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin-auth")?.value === "true";

    const anonymousId = isAdmin ? null : await getAnonymousCookie();

    // Fetch song by slug
    const songs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.slug, slug))
      .limit(1);

    if (!songs.length) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    const song = songs[0];

    // Verify ownership via song_request
    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, song.song_request_id))
      .limit(1);

    if (!requests.length) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }
    const request = requests[0];

    // Skip ownership check for admin users
    if (!isAdmin && request.anonymous_user_id && anonymousId && request.anonymous_user_id !== anonymousId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Load lyrics draft (if approved)
    let lyricsDraft: any = null;
    if (song.approved_lyrics_id) {
      const drafts = await db
        .select()
        .from(lyricsDraftsTable)
        .where(eq(lyricsDraftsTable.id, song.approved_lyrics_id))
        .limit(1);
      lyricsDraft = drafts[0] || null;
    }

    // Normalize variants array
    const rawVariants: any = (song as any).song_variants || [];
    const variants: any[] = Array.isArray(rawVariants) ? rawVariants : Object.values(rawVariants);
    const selectedVariant = variants[0] || {};

    const processedMap = (song as any).variant_timestamp_lyrics_processed || {};
    const timestampedVariants = processedMap && typeof processedMap === 'object' ? processedMap : {};
    // Standardized priority: sourceAudioUrl (highest quality) > streamAudioUrl > audioUrl
    const songUrl =
      selectedVariant.sourceAudioUrl ||
      selectedVariant.streamAudioUrl ||
      selectedVariant.audioUrl ||
      undefined;

    const computedTitle = (song.metadata as any)?.title || lyricsDraft?.song_title || 'Your Song';

    const plainLyrics = (lyricsDraft as any)?.customer_lyrics || null;

    // Determine language from latest lyrics draft if available, otherwise fallback to request languages string
    let language: string | null = null;
    try {
      // Prefer explicit language column on lyrics drafts if present
      if (lyricsDraft && typeof lyricsDraft.language === 'string' && lyricsDraft.language.length > 0) {
        language = lyricsDraft.language;
      } else if (request && typeof request.languages === 'string' && request.languages.length > 0) {
        language = request.languages;
      }
    } catch { }

    return NextResponse.json({
      success: true,
      song: {
        id: String(song.id),
        title: computedTitle,
        artist: song.service_provider || 'Melodia',
        song_url: songUrl,
        duration: selectedVariant?.duration || 0,
        timestamp_lyrics: undefined,
        timestamped_lyrics_variants: timestampedVariants || undefined,
        selected_variant: 0,
        lyrics: plainLyrics,
        language: language,
        show_lyrics: true,
        slug: song.slug,
        likes_count: 0,
        download_allowed: true, // User songs always allow downloads
        // Include userSongId and status for admin conversion feature
        userSongId: song.id,
        userSongStatus: song.status,
        suno_variants: variants?.map((v: any) => ({
          id: v.id,
          // Standardized priority: sourceAudioUrl (highest quality) > streamAudioUrl > audioUrl
          sourceAudioUrl: v.sourceAudioUrl || null,
          streamAudioUrl: v.streamAudioUrl || null,
          audioUrl: v.audioUrl || v.sourceAudioUrl || v.streamAudioUrl || null,
          sourceImageUrl: v.imageUrl || '/images/melodia-logo-og.jpeg',
          prompt: v.prompt || '',
          modelName: v.modelName || '',
          title: v.title || computedTitle || 'Generated Song',
          tags: v.tags || '',
          createTime: v.createTime || new Date().toISOString(),
          duration: v.duration || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching my-song by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 });
  }
}


