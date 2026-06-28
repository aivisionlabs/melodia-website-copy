import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSongsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTimestampedLyrics } from '@/lib/suno-api';

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
    const userSongId = parseInt(id);
    if (isNaN(userSongId)) {
      return NextResponse.json({ error: 'Invalid user song ID' }, { status: 400 });
    }

    // Fetch user song with timestamp lyrics
    const userSong = await db
      .select({
        id: userSongsTable.id,
        slug: userSongsTable.slug,
        metadata: userSongsTable.metadata,
        variant_timestamp_lyrics_processed: userSongsTable.variant_timestamp_lyrics_processed,
        variant_timestamp_lyrics_api_response: userSongsTable.variant_timestamp_lyrics_api_response,
      })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, userSongId))
      .limit(1);

    if (!userSong || userSong.length === 0) {
      return NextResponse.json({ error: 'User song not found' }, { status: 404 });
    }

    const songData = userSong[0];
    const title = (songData.metadata as any)?.title || 'Untitled Song';

    // Get timestamp lyrics from variant_timestamp_lyrics_api_response (raw API response)
    // Fallback to variant_timestamp_lyrics_processed if API response not available
    const apiResponses = (songData.variant_timestamp_lyrics_api_response as { [key: number]: any } | null) || {};
    const processedLyrics = (songData.variant_timestamp_lyrics_processed as { [key: number]: any[] } | null) || {};

    // Pick variant index:
    // - Prefer explicit query param `variantIndex`
    // - else 0
    const url = new URL(request.url);
    const variantIndexParam = url.searchParams.get('variantIndex');
    const variantIndexFromParam = variantIndexParam !== null ? parseInt(variantIndexParam, 10) : null;
    const variantIndex =
      variantIndexFromParam !== null && !Number.isNaN(variantIndexFromParam)
        ? variantIndexFromParam
        : 0;

    // Prefer raw API response, fallback to processed if needed
    let timestampLyrics: any[] | null = apiResponses?.[variantIndex] || processedLyrics?.[variantIndex] || null;
    let generated = false;

    // If missing, generate from Suno API and persist to DB before returning
    if (!timestampLyrics || timestampLyrics.length === 0) {
      const taskId = (songData.metadata as any)?.sunoTaskId as string | undefined;
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        return NextResponse.json(
          { error: 'No Suno taskId found for this song, cannot generate timestamp lyrics' },
          { status: 400 }
        );
      }

      console.log(`[Admin] Fetching timestamped lyrics from Suno: taskId=${taskId.trim()}, variantIndex=${variantIndex}`);
      const lyricsResult = await getTimestampedLyrics({
        taskId: taskId.trim(),
        musicIndex: variantIndex,
      });

      console.log(`[Admin] Suno API response:`, {
        success: lyricsResult.success,
        hasLyrics: !!(lyricsResult as any).lyrics,
        lyricsLength: Array.isArray((lyricsResult as any).lyrics) ? (lyricsResult as any).lyrics.length : 0,
        error: (lyricsResult as any).error,
        fullResponse: lyricsResult,
      });

      if (!lyricsResult.success) {
        const errorMessage = (lyricsResult as any).error?.message || (lyricsResult as any).error || 'Unknown error';
        console.error(`[Admin] Suno API failed:`, errorMessage);
        return NextResponse.json(
          {
            error: 'Failed to fetch timestamped lyrics from Suno',
            details: errorMessage,
          },
          { status: 502 }
        );
      }

      const alignedWords = (lyricsResult as any).lyrics || [];
      if (!Array.isArray(alignedWords)) {
        console.error(`[Admin] Suno returned non-array lyrics:`, typeof alignedWords, alignedWords);
        return NextResponse.json(
          {
            error: 'Invalid response format from Suno API',
            details: 'Expected array but got ' + typeof alignedWords,
          },
          { status: 502 }
        );
      }

      if (alignedWords.length === 0) {
        console.warn(`[Admin] Suno returned empty lyrics array for taskId=${taskId}, variantIndex=${variantIndex}`);
        return NextResponse.json(
          {
            error: 'No timestamp lyrics returned by Suno for this variant',
            details: 'The lyrics may not be available yet, or this variant may not have lyrics. Try again later or check if the song generation is complete.',
            taskId: taskId.trim(),
            variantIndex,
          },
          { status: 404 }
        );
      }

      const nextProcessed: { [key: number]: any[] } = processedLyrics && typeof processedLyrics === 'object' ? { ...(processedLyrics as any) } : {};
      const nextApiResponses: { [key: number]: any } = apiResponses && typeof apiResponses === 'object' ? { ...(apiResponses as any) } : {};

      // Store raw alignedWords in BOTH columns for now:
      // - `variant_timestamp_lyrics_api_response`: canonical raw payload
      // - `variant_timestamp_lyrics_processed`: kept in sync for backward compatibility with existing downloads/UI
      nextProcessed[variantIndex] = alignedWords;
      nextApiResponses[variantIndex] = alignedWords;

      await db
        .update(userSongsTable)
        .set({
          variant_timestamp_lyrics_processed: nextProcessed,
          variant_timestamp_lyrics_api_response: nextApiResponses,
        })
        .where(eq(userSongsTable.id, songData.id));

      timestampLyrics = alignedWords;
      generated = true;
    }

    return NextResponse.json({
      success: true,
      songId: songData.id,
      title: title,
      slug: songData.slug,
      timestamp_lyrics: timestampLyrics,
      selected_variant: 0,
      variant_index: variantIndex,
      generated,
      all_variants: (songData.variant_timestamp_lyrics_processed as any) || processedLyrics, // Include all variants for reference
    });
  } catch (error) {
    console.error('Error fetching user song timestamp lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timestamp lyrics' },
      { status: 500 }
    );
  }
}

