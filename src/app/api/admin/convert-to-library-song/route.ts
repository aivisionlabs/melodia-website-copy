import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  userSongsTable,
  songsTable,
  songRequestsTable,
  lyricsDraftsTable,
  categoriesTable,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createSongCategoryMappings } from '@/lib/db/services';
import { SunoAPIFactory } from '@/lib/suno-api';
import { withApiLogger } from '@/lib/logger/api-middleware';

export const POST = withApiLogger('admin-convert-to-library-song', async (req: NextRequest) => {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userSongId, categoryIds, selectedVariantIndex, language } = body;

    if (!userSongId || isNaN(Number(userSongId))) {
      return NextResponse.json(
        { error: 'Invalid user song ID' },
        { status: 400 }
      );
    }

    // Validate categoryIds if provided
    const validCategoryIds: number[] = [];
    if (categoryIds && Array.isArray(categoryIds)) {
      validCategoryIds.push(
        ...categoryIds
          .filter((id: any) => typeof id === 'number' && !isNaN(id) && id > 0)
          .map((id: any) => Number(id))
      );
    }

    // Fetch user song with related data
    const userSongData = await db
      .select({
        userSong: userSongsTable,
        songRequest: songRequestsTable,
        lyricsDraft: lyricsDraftsTable,
      })
      .from(userSongsTable)
      .innerJoin(
        songRequestsTable,
        eq(userSongsTable.song_request_id, songRequestsTable.id)
      )
      .leftJoin(
        lyricsDraftsTable,
        eq(userSongsTable.approved_lyrics_id, lyricsDraftsTable.id)
      )
      .where(eq(userSongsTable.id, Number(userSongId)))
      .limit(1);

    if (!userSongData.length || !userSongData[0]) {
      return NextResponse.json(
        { error: 'User song not found' },
        { status: 404 }
      );
    }

    const { userSong, songRequest, lyricsDraft } = userSongData[0];

    if (validCategoryIds.length === 0) {
      const slugs =
        (lyricsDraft as { category_slugs?: string[] | null } | null)?.category_slugs?.filter(Boolean) ??
        userSong.categories?.filter(Boolean) ??
        [];
      if (slugs.length > 0) {
        const catRows = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(inArray(categoriesTable.slug, slugs));
        validCategoryIds.push(...catRows.map((r) => r.id));
      }
    }

    // Check if song is completed
    if (userSong.status !== 'completed') {
      return NextResponse.json(
        { error: 'Song must be completed before converting to library song' },
        { status: 400 }
      );
    }

    // Check if song is already converted (check if a song with this user_song_id exists)
    const existingLibrarySong = await db
      .select({ id: songsTable.id, slug: songsTable.slug })
      .from(songsTable)
      .where(eq(songsTable.user_song_id, userSong.id))
      .limit(1);

    if (existingLibrarySong.length > 0) {
      return NextResponse.json({
        success: true,
        song: {
          id: existingLibrarySong[0].id,
          slug: existingLibrarySong[0].slug,
        },
        message: 'Song already converted to library',
      });
    }

    // Get title from lyrics draft, metadata, or fallback
    let title = lyricsDraft?.song_title;
    if (!title && userSong.metadata) {
      const metadata = userSong.metadata as any;
      title = metadata.title;
    }
    if (!title) {
      title = `Song for ${songRequest.recipient_details}`;
    }

    // Handle slug conflicts - append suffix if exists
    let finalSlug = userSong.slug;
    let slugSuffix = 1;
    while (true) {
      const existingSong = await db
        .select({ id: songsTable.id })
        .from(songsTable)
        .where(eq(songsTable.slug, finalSlug))
        .limit(1);

      if (!existingSong.length) {
        break; // Slug is available
      }

      slugSuffix++;
      finalSlug = `${userSong.slug}-${slugSuffix}`;
    }

    // Extract song URL and duration from selected variant
    let songUrl: string | null = null;
    let songUrlVariant1: string | null = null;
    let duration: string | null = null;
    const variants = (userSong.song_variants as any) || {};
    const variantArray = Array.isArray(variants) ? variants : Object.values(variants);

    // Use provided selectedVariantIndex, or default to 0
    const variantIndex = selectedVariantIndex !== undefined && selectedVariantIndex !== null
      ? Number(selectedVariantIndex)
      : 0;

    if (variantArray.length > 0) {
      // Ensure variantIndex is within bounds
      const safeVariantIndex = Math.max(0, Math.min(variantIndex, variantArray.length - 1));
      const selectedVariant = variantArray[safeVariantIndex] || variantArray[0];

      if (selectedVariant) {
        songUrl = selectedVariant.sourceAudioUrl || selectedVariant.audioUrl || selectedVariant.streamAudioUrl || null;
        duration = selectedVariant.duration?.toString() || null;
      }

      // Get first variant URL for song_url_variant_1
      const firstVariant = variantArray[0];
      if (firstVariant) {
        songUrlVariant1 = firstVariant.sourceAudioUrl || firstVariant.audioUrl || firstVariant.streamAudioUrl || null;
      }
    }

    // Extract timestamped lyrics for selected variant
    let timestampLyrics: any = null;
    const timestampedVariants = userSong.variant_timestamp_lyrics_processed as any;
    if (timestampedVariants && typeof timestampedVariants === 'object') {
      const safeVariantIndex = Math.max(0, Math.min(variantIndex, Object.keys(timestampedVariants).length - 1));
      timestampLyrics = timestampedVariants[safeVariantIndex] || timestampedVariants[0] || null;
    }

    // Extract suno_task_id from metadata
    let sunoTaskId: string | null = null;
    if (userSong.metadata) {
      const metadata = userSong.metadata as any;
      sunoTaskId = metadata.sunoTaskId || null;
    }

    // Fetch original lyrics and music style from Suno API response
    let originalLyrics: string | null = null;
    let originalMusicStyle: string | null = null;

    // 1. Fetch original lyrics from Suno API response
    try {
      if (sunoTaskId) {
        console.log(`Fetching original lyrics from Suno API for task ID: ${sunoTaskId}`);
        const sunoAPI = SunoAPIFactory.getAPI();
        const recordInfo = await sunoAPI.getRecordInfo(sunoTaskId);

        if (recordInfo.code === 200) {
          const sunoDataRaw = recordInfo.data?.response?.sunoData;
          const variants: any[] = Array.isArray(sunoDataRaw)
            ? sunoDataRaw.filter(Boolean)
            : [];

          console.log(`Found ${variants.length} variants in Suno response for task ${sunoTaskId}`);

          // Extract lyrics from the first variant (or any variant that has lyrics)
          for (const variant of variants) {
            const variantLyrics = extractLyricsTextFromVariant(variant);
            if (variantLyrics) {
              originalLyrics = variantLyrics;
              console.log(`Successfully extracted original lyrics from Suno API (${variantLyrics.length} characters)`);
              break;
            }
          }

          if (!originalLyrics) {
            console.log(`No lyrics found in Suno API response for task ${sunoTaskId}`);
          }
        } else {
          console.warn(`Suno API returned non-200 status for task ${sunoTaskId}: ${recordInfo.code}`);
        }
      } else {
        console.log('No Suno task ID found in user song metadata');
      }
    } catch (error) {
      console.warn('Failed to fetch original lyrics from Suno API:', error);
      // Continue without original lyrics - this is not a critical error
    }

    // 2. Fetch music style from approved lyrics draft (fallback to lyrics draft music style)
    if (lyricsDraft?.music_style) {
      originalMusicStyle = lyricsDraft.music_style;
      console.log(`Using music style from lyrics draft: ${originalMusicStyle}`);
    } else {
      console.log('No music style found in lyrics draft');
    }

    // Determine final lyrics and music style for migration
    const finalLyrics = originalLyrics || (lyricsDraft as any)?.model_ready_lyrics || (lyricsDraft as any)?.customer_lyrics || null;
    const finalMusicStyle = originalMusicStyle || lyricsDraft?.music_style || null;

    // Prepare song data for insertion
    const songData: any = {
      created_at: userSong.created_at,
      title: title,
      lyrics: finalLyrics,
      customer_lyrics: (lyricsDraft as any)?.customer_lyrics || null,
      song_description: lyricsDraft?.description || null,
      timestamp_lyrics: timestampLyrics,
      timestamped_lyrics_variants: userSong.variant_timestamp_lyrics_processed || null,
      timestamped_lyrics_api_responses: userSong.variant_timestamp_lyrics_api_response || null,
      music_style: finalMusicStyle,
      service_provider: 'Melodia',
      song_requester: songRequest.recipient_details,
      prompt: (lyricsDraft as any)?.model_ready_lyrics || (lyricsDraft as any)?.customer_lyrics || null,
      song_url: songUrl,
      song_url_variant_1: songUrlVariant1,
      duration: duration,
      slug: finalSlug,
      add_to_library: true,
      is_deleted: false,
      is_active: true,
      status: 'completed',
      tags: userSong.tags || [],
      categories: userSong.categories || [],
      suno_task_id: sunoTaskId,
      suno_variants: userSong.song_variants || null,
      selected_variant: variantIndex,
      metadata: userSong.metadata || null,
      show_lyrics: true,
      likes_count: 0,
      song_request_id: userSong.song_request_id,
      user_id: songRequest.user_id || null,
      is_featured: userSong.is_featured || false,
      download_allowed: false,
      user_song_id: Number(userSong.id), // Store reference to the user_song that was migrated (ensure it's a number)
      language: language || null, // Store language as comma-separated string
    };

    const [newSong] = await db
      .insert(songsTable)
      .values(songData)
      .returning();

    // Create song-category mappings if categories are provided
    const uniqueCategoryIds = [...new Set(validCategoryIds)];
    if (uniqueCategoryIds.length > 0) {
      console.log(`Creating category mappings for song ${newSong.id} with categories:`, uniqueCategoryIds);
      const mappingResult = await createSongCategoryMappings(
        newSong.id,
        uniqueCategoryIds
      );

      if (!mappingResult.success) {
        console.error('Failed to create category mappings:', mappingResult.error);
        // Continue with conversion even if category mapping fails
      } else {
        console.log(`Successfully created ${uniqueCategoryIds.length} category mapping(s) for song ${newSong.id}`);
      }
    } else {
      console.log(`No categories provided for song ${newSong.id}, skipping category mappings`);
    }

    // Update user_songs to mark as added to library
    await db
      .update(userSongsTable)
      .set({ add_to_library: true })
      .where(eq(userSongsTable.id, userSong.id));

    return NextResponse.json({
      success: true,
      song: {
        id: newSong.id,
        slug: newSong.slug,
      },
    });
  } catch (error) {
    console.error('Error converting user song to library song:', error);
    return NextResponse.json(
      { error: 'Failed to convert song to library song' },
      { status: 500 }
    );
  }
});

function extractLyricsTextFromVariant(variant: any): string | null {
  if (!variant || typeof variant !== 'object') return null;

  const candidates: Array<unknown> = [
    // Some Suno payloads embed the full lyrics in prompt
    variant.prompt,
    variant.lyrics,
    variant.lyric,
    variant.promptLyrics,
    variant.prompt_lyrics,
    variant.text,
    variant?.metadata?.lyrics,
    variant?.meta?.lyrics,
    variant?.response?.lyrics,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }

  return null;
}

