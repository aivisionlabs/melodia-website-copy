"use server";

import { Song } from "@/types";
import { unstable_cache } from "next/cache";
import { createSong, updateSongStatus } from "../db/services";
import { checkSunoCreditAndNotify } from "@/lib/suno-credit-alert";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { eq, and } from "drizzle-orm";
import { transliterateToEnglish } from "@/lib/services/llm/llm-lyrics-transliteration";
import { getBaseUrl } from "@/lib/utils/url";
import { getVariantsList, normalizeSunoVariantToStored } from "@/lib/utils/variant-utils";

// Song creation action with Suno integration
/**
 * @deprecated This server action uses a legacy flow and interacts directly with the Suno API.
 * It is recommended to migrate any functionality using this action to use the centralized
 * `song-generation-service` to ensure consistency and maintainability across the application.
 * This action interacts with the older `songsTable` and is likely used by the admin portal.
 */
export async function createSongAction(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const lyrics = formData.get("lyrics") as string;
    const music_style = formData.get("music_style") as string;
    const selectedCategoriesJson = formData.get("selectedCategories") as string;
    const tags = formData.get("tags") as string;
    const negativeTags = formData.get("negativeTags") as string;
    const songRequestId = formData.get("songRequestId") as string;
    const personaId = (formData.get("personaId") as string) || "";
    const languagesJson = formData.get("languages") as string;
    const vocalGender = (formData.get("vocal_gender") as 'm' | 'f' | null) || undefined;

    const isUsingPersona = !!personaId;
    if (!title || !lyrics || (!isUsingPersona && !music_style)) {
      console.error("Missing required fields");
      return {
        success: false,
        error: isUsingPersona
          ? "Please fill in all required fields (title and lyrics)"
          : "Please fill in all required fields (title, lyrics, and music style)",
      };
    }

    // Parse selected categories
    let selectedCategoryIds: number[] = [];
    if (selectedCategoriesJson) {
      try {
        selectedCategoryIds = JSON.parse(selectedCategoriesJson);
      } catch (error) {
        console.error("Error parsing selected categories:", error);
      }
    }

    // Generate transliterated customer_lyrics for admin-pasted lyrics.
    // This is separate from user manual edits and should always run for admin-created songs.
    const customerLyrics =
      (await transliterateToEnglish({
        text: lyrics,
      })) || null;

    console.log('🎵 Admin song creation - transliteration result:', {
      hasCustomerLyrics: !!customerLyrics,
      lyricsLength: lyrics?.length || 0,
      customerLyricsLength: customerLyrics?.length || 0,
      demoMode: isDemoModeEnabled(),
    });

    // Parse selected languages
    let language: string | null = null;
    if (languagesJson) {
      try {
        const languagesArray = JSON.parse(languagesJson);
        if (Array.isArray(languagesArray) && languagesArray.length > 0) {
          language = languagesArray.join(", ");
        }
      } catch (error) {
        console.error("Error parsing languages:", error);
      }
    }

    // Create song in database (without categories array)
    const songData: any = {
      title,
      lyrics,
      customer_lyrics: customerLyrics,
      music_style: isUsingPersona ? null : music_style,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      negative_tags: negativeTags,
      prompt: lyrics,
      song_request_id: songRequestId ? parseInt(songRequestId, 10) : undefined,
      language: language,
      metadata: {
        ...(personaId ? { personaId } : {}),
      }
    };

    const songResult = await createSong(songData);

    if (!songResult.success) {
      console.error("Failed to create song:", songResult.error);
      return {
        success: false,
        error: songResult.error || "Failed to create song in database",
      };
    }

    // Link song to request via junction table if songRequestId is provided (for 999 packages)
    if (songRequestId && songResult.songId) {
      try {
        const { db } = await import('@/lib/db');
        const { songRequestSongsTable } = await import('@/lib/db/schema');
        const requestIdNum = parseInt(songRequestId, 10);

        // Check if link already exists
        const existingLinks = await db
          .select()
          .from(songRequestSongsTable)
          .where(
            and(
              eq(songRequestSongsTable.song_request_id, requestIdNum),
              eq(songRequestSongsTable.song_id, songResult.songId)
            )
          )
          .limit(1);

        if (existingLinks.length === 0) {
          // Create link in junction table
          await db.insert(songRequestSongsTable).values({
            song_request_id: requestIdNum,
            song_id: songResult.songId,
            created_at: new Date(),
          });
          console.log(
            `Linked song ${songResult.songId} to request ${requestIdNum} via junction table`,
          );
        }
      } catch (linkError) {
        console.error(
          "Failed to link song to request via junction table:",
          linkError,
        );
        // Continue with song creation even if linking fails
      }
    }

    // Create song-category mappings if categories are selected
    if (selectedCategoryIds.length > 0) {
      const { createSongCategoryMappings } = await import('@/lib/db/services');
      const mappingResult = await createSongCategoryMappings(songResult.songId!, selectedCategoryIds);

      if (!mappingResult.success) {
        console.error('Failed to create category mappings:', mappingResult.error);
        // Continue with song creation even if category mapping fails
      }
    }

    // Update status to pending
    await updateSongStatus(songResult.songId!, "pending");

    // Call Suno API to generate song
    const { SunoAPIFactory } = await import("@/lib/suno-api");
    const sunoAPI = SunoAPIFactory.getAPI();

    const baseUrl = await getBaseUrl();

    const generateRequest: any = {
      prompt: lyrics,
      ...(personaId ? {} : { style: music_style }),
      title: title,
      negativeTags: negativeTags || undefined,
      callBackUrl: `${baseUrl}/api/suno-webhook`,
      ...(personaId ? { personaId } : {}),
      vocalGender,
    };

    try {
      const sunoResponse = await sunoAPI.generateSong(generateRequest);

      if (sunoResponse.code === 200) {
        // Update song with task ID
        const updateResult = await updateSongStatus(
          songResult.songId!,
          "generating",
          undefined,
          sunoResponse.data.taskId
        );

        if (!updateResult.success) {
          console.error(
            "Failed to update song with task ID:",
            updateResult.error,
          );
          // Still redirect but log the error
        }

        // Small delay to ensure database transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 100));

        void checkSunoCreditAndNotify();

        // Redirect to progress page
        return {
          success: true,
          taskId: sunoResponse.data.taskId,
          redirect: `/song-admin-portal/generate/${sunoResponse.data.taskId}`,
        };
      } else {
        throw new Error(`Suno API error: ${sunoResponse.msg}`);
      }
    } catch (sunoError) {
      console.error("Suno API error:", sunoError);
      await updateSongStatus(songResult.songId!, "failed");

      const detailedMessage =
        sunoError instanceof Error
          ? sunoError.message
          : typeof sunoError === "string"
            ? sunoError
            : (sunoError as any)?.message || "Failed to start song generation";

      return {
        success: false,
        error: detailedMessage,
      };
    }

  } catch (error) {
    console.error("Error in createSongAction:", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function getSongByTaskIdAction(taskId: string) {
  try {
    const { getSongByTaskId } = await import('@/lib/db/services');
    const song = await getSongByTaskId(taskId);
    return { success: true, song };
  } catch (error) {
    console.error('Error in getSongByTaskIdAction:', error);
    return { success: false, error: 'Failed to get song by task ID' };
  }
}

export async function getActiveSongsAction(limit: number = 20, offset: number = 0): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const cachedResult = await unstable_cache(
      async () => {
        const { getAllSongsPaginated } = await import('@/lib/db/queries/select');
        const { songs: dbSongs, total } = await getAllSongsPaginated(limit, offset);

        // Transform database songs to match Song type (optimized - no heavy fields)
        const songs: Song[] = dbSongs.map(song => ({
          id: song.id,
          created_at: song.created_at.toISOString(),
          title: song.title,
          lyrics: null, // Not loaded for library view
          song_description: song.song_description ?? null,
          timestamp_lyrics: null, // Not loaded for library view
          timestamped_lyrics_variants: null, // Not loaded for library view
          timestamped_lyrics_api_responses: null, // Not loaded for library view
          music_style: song.music_style ?? null,
          service_provider: song.service_provider ?? null,
          song_requester: null, // Not needed for library view
          prompt: null, // Not needed for library view
          song_url: song.song_url ?? null,
          duration: song.duration ?? null,
          slug: song.slug,
          add_to_library: song.add_to_library ?? undefined,
          is_deleted: song.is_deleted ?? undefined,
          status: song.status ?? undefined,
          categories: song.categories ?? undefined,
          tags: song.tags ?? undefined,
          suno_task_id: undefined, // Not exposed in library
          negative_tags: undefined, // Not needed for library view
          suno_variants: song.suno_variants as any,
          selected_variant: song.selected_variant ?? undefined,
          metadata: undefined, // Not needed for library view
          sequence: song.sequence ?? undefined,
          show_lyrics: song.show_lyrics ?? true,
          likes_count: (song as any).likes_count ?? 0,
          hasPersona: (song as any).has_persona ?? false,
          language: (song as any).language ?? null,
        }));

        const hasMore = offset + songs.length < total;
        return { songs, total, hasMore };
      },
      [`songs-all-${limit}-${offset}`],
      {
        tags: ['songs', 'library'],
        revalidate: 60, // 1 minute
      }
    )();

    return { success: true, ...cachedResult };
  } catch (error) {
    console.error('Error in getActiveSongsAction:', error);
    return { success: false, error: 'Failed to get active songs', songs: [], total: 0, hasMore: false };
  }
}

// Server-side: get songs that support similar-style generation (persona associated)
export async function getPersonaSongsAction(limit: number = 20, offset: number = 0): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const cachedResult = await unstable_cache(
      async () => {
        const { getSongsWithPersonaPaginated } = await import('@/lib/db/queries/select');
        const { songs: dbSongs, total } = await getSongsWithPersonaPaginated(limit, offset);

        const songs: Song[] = dbSongs.map((song) => ({
          id: song.id,
          created_at: song.created_at.toISOString(),
          title: song.title,
          lyrics: null,
          song_description: song.song_description ?? null,
          timestamp_lyrics: null,
          timestamped_lyrics_variants: null,
          timestamped_lyrics_api_responses: null,
          music_style: song.music_style ?? null,
          service_provider: song.service_provider ?? null,
          song_requester: null,
          prompt: null,
          song_url: song.song_url ?? null,
          duration: song.duration ?? null,
          slug: song.slug,
          add_to_library: song.add_to_library ?? undefined,
          is_deleted: song.is_deleted ?? undefined,
          status: song.status ?? undefined,
          categories: song.categories ?? undefined,
          tags: song.tags ?? undefined,
          suno_task_id: undefined,
          negative_tags: undefined,
          suno_variants: song.suno_variants as any,
          selected_variant: song.selected_variant ?? undefined,
          metadata: undefined,
          sequence: song.sequence ?? undefined,
          show_lyrics: song.show_lyrics ?? true,
          likes_count: (song as any).likes_count ?? 0,
          hasPersona: true,
          language: (song as any).language ?? null,
        }));

        const hasMore = offset + songs.length < total;
        return { songs, total, hasMore };
      },
      [`songs-persona-${limit}-${offset}`],
      {
        tags: ['songs', 'library', 'personas'],
        revalidate: 60,
      }
    )();

    return { success: true, ...cachedResult };
  } catch (error) {
    console.error('Error in getPersonaSongsAction:', error);
    return { success: false, error: 'Failed to get persona songs', songs: [], total: 0, hasMore: false };
  }
}

// Server-side: get persona-associated songs filtered by category slug (for "Spark Your Creativity" rail)
export async function getPersonaSongsByCategoryAction(
  categorySlug: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const safeSlug = categorySlug && categorySlug !== "all" ? categorySlug : "all";

    const cachedResult = await unstable_cache(
      async () => {
        const { getSongsWithPersonaByCategorySlugPaginated } = await import(
          "@/lib/db/queries/select"
        );
        const { songs: dbSongs, total } =
          await getSongsWithPersonaByCategorySlugPaginated(categorySlug, limit, offset);

        const songs: Song[] = dbSongs.map((song) => ({
          id: song.id,
          created_at: song.created_at.toISOString(),
          title: song.title,
          lyrics: null,
          song_description: song.song_description ?? null,
          timestamp_lyrics: null,
          timestamped_lyrics_variants: null,
          timestamped_lyrics_api_responses: null,
          music_style: song.music_style ?? null,
          service_provider: song.service_provider ?? null,
          song_requester: null,
          prompt: null,
          song_url: song.song_url ?? null,
          duration: song.duration ?? null,
          slug: song.slug,
          add_to_library: song.add_to_library ?? undefined,
          is_deleted: song.is_deleted ?? undefined,
          status: song.status ?? undefined,
          categories: song.categories ?? undefined,
          tags: song.tags ?? undefined,
          suno_task_id: undefined,
          negative_tags: undefined,
          suno_variants: song.suno_variants as any,
          selected_variant: song.selected_variant ?? undefined,
          metadata: undefined,
          sequence: song.sequence ?? undefined,
          show_lyrics: song.show_lyrics ?? true,
          likes_count: (song as any).likes_count ?? 0,
          hasPersona: true,
          language: (song as any).language ?? null,
        }));

        const hasMore = offset + songs.length < total;
        return { songs, total, hasMore };
      },
      [`songs-persona-category-${safeSlug}-${limit}-${offset}`],
      {
        tags: ["songs", "library", "personas"],
        revalidate: 60,
      }
    )();

    return { success: true, ...cachedResult };
  } catch (error) {
    console.error("Error in getPersonaSongsByCategoryAction:", error);
    return {
      success: false,
      error: "Failed to get persona songs for category",
      songs: [],
      total: 0,
      hasMore: false,
    };
  }
}

/**
 * Automatically store variants for songs when generation completes
 * This is called when variants are detected (both demo and production mode) to store them in the database
 */
export async function autoStoreVariantsAction(
  taskId: string,
  variants: any[]
) {
  // Hoisted so the enrichment block can read them without a second DB fetch
  let storedSongId: number | undefined;
  let alreadyHasDescription: boolean = false;

  try {
    // Find the song by taskId in songs table (admin dashboard)
    const { getSongByTaskId } = await import('@/lib/db/services');
    const song = await getSongByTaskId(taskId);

    if (!song) {
      return { success: false, error: 'Song not found' };
    }

    storedSongId = song.id;
    alreadyHasDescription = !!song.song_description;

    // Check if variants are already stored (array or legacy keyed object)
    const existingList = getVariantsList(song.suno_variants);
    if (existingList.length > 0) {
      return { success: true, message: 'Variants already stored' };
    }

    const transformedVariants = variants.map((v: any) => normalizeSunoVariantToStored(v));

    // Store variants in database, keeping status as "generating"
    const { updateSong } = await import('@/lib/db/queries/update');
    await updateSong(song.id, {
      suno_variants: transformedVariants,
      status: 'generating', // Keep as generating until variant is selected
      selected_variant: 0, // Default to first variant
    });

    return { success: true, songId: song.id };
  } catch (error) {
    console.error('Error auto-storing variants:', error);
    return { success: false, error: 'Failed to store variants' };
  } finally {
    // Best-effort metadata enrichment — isolated so it never affects the return value above
    if (storedSongId && !alreadyHasDescription) {
      try {
        const { enrichAdminSongListingMetadata } = await import('@/lib/services/llm/llm-song-metadata');
        await enrichAdminSongListingMetadata(storedSongId);
      } catch (enrichErr) {
        console.error('Admin song metadata enrichment failed (non-fatal)', enrichErr instanceof Error ? enrichErr : new Error(String(enrichErr)));
      }
    }
  }
}

/**
 * Store variants for a templated song when polling returns SUCCESS.
 * Used by the template generate page so song_variants are persisted even if the webhook does not run.
 */
export async function autoStoreTemplatedSongVariantsAction(
  taskId: string,
  variants: any[]
) {
  try {
    const { db } = await import('@/lib/db');
    const { templatedSongsTable } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const rows = await db
      .select({ id: templatedSongsTable.id, song_variants: templatedSongsTable.song_variants, selected_variant: templatedSongsTable.selected_variant })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.suno_task_id, taskId))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: 'Templated song not found for taskId' };
    }

    const row = rows[0];
    const existing = row.song_variants;
    if (Array.isArray(existing) && existing.length > 0) {
      return { success: true, message: 'Variants already stored' };
    }
    if (existing && typeof existing === 'object' && !Array.isArray(existing) && Object.keys(existing as object).length > 0) {
      return { success: true, message: 'Variants already stored' };
    }

    const transformedVariants = variants.map((v: any) => normalizeSunoVariantToStored(v));

    await db
      .update(templatedSongsTable)
      .set({
        song_variants: transformedVariants,
        selected_variant: row.selected_variant ?? 0,
        updated_at: new Date(),
      })
      .where(eq(templatedSongsTable.id, row.id));

    return { success: true, templateId: row.id };
  } catch (error) {
    console.error('Error auto-storing templated song variants:', error);
    return { success: false, error: 'Failed to store variants' };
  }
}

export async function updateSongWithVariantsAction(
  songId: number,
  variants: any[],
  selectedVariant: number,
  addToLibrary?: boolean,
  showLyrics?: boolean,
  downloadAllowed?: boolean
) {
  try {
    const { updateSongWithSunoVariants } = await import('@/lib/db/services');
    const result = await updateSongWithSunoVariants(songId, variants, selectedVariant, addToLibrary, showLyrics, downloadAllowed);

    if (result.success && showLyrics) {
      // After successfully updating the song with variants, generate timestamped lyrics
      // Only fetch if "Show Lyrics" is enabled, since timestamps are only needed for lyric display
      try {
        // Get the song to access suno_task_id
        const { getSongById } = await import('@/lib/db/services');
        const song = await getSongById(songId);

        if (!song) {
          console.error(`Song ${songId} not found when trying to generate timestamped lyrics`);
          return {
            ...result,
            timestampedLyricsGenerated: false,
            lyricsError: 'Song not found'
          };
        }

        if (!song.suno_task_id) {
          console.warn(`Song ${songId} does not have suno_task_id, cannot generate timestamped lyrics`);
          return {
            ...result,
            timestampedLyricsGenerated: false,
            lyricsError: 'Song does not have a task ID for lyrics generation'
          };
        }

        console.log(`Generating timestamped lyrics for selected variant ${selectedVariant} of song ${songId} with taskId ${song.suno_task_id}`);

        // Generate timestamped lyrics for the selected variant
        const lyricsResult = await generateTimestampedLyricsAction(
          song.suno_task_id,
          selectedVariant
        );

        if (lyricsResult.success) {
          console.log(`Successfully generated timestamped lyrics for variant ${selectedVariant}`);

          // Store lyrics in timestamped_lyrics_variants for the selected variant
          // Also store the original alignedWords for future reference
          const { updateTimestampedLyricsForVariant } = await import('@/lib/db/queries/update');

          await updateTimestampedLyricsForVariant(
            songId,
            selectedVariant,
            lyricsResult.lyricLines,
            lyricsResult.alignedWords
          );

          // Update the main timestamp_lyrics field for compatibility with existing components
          const { updateSong } = await import('@/lib/db/queries/update');
          const sel = variants[selectedVariant];
          const fromVariant = sel
            ? String(sel.sourceAudioUrl || sel.audioUrl || sel.streamAudioUrl || '').trim()
            : '';
          await updateSong(songId, {
            timestamp_lyrics: lyricsResult.lyricLines,
            ...(fromVariant ? { song_url: fromVariant } : {}),
            duration: (variants[selectedVariant]?.duration || song.duration)?.toString()
          });

          console.log(`Successfully stored timestamped lyrics for variant ${selectedVariant} of song ${songId}`);

          return {
            ...result,
            timestampedLyricsGenerated: true,
            lyricLines: lyricsResult.lyricLines
          };
        } else {
          console.warn(`Failed to generate timestamped lyrics for variant ${selectedVariant}: ${lyricsResult.error}`);
          // Continue with the result even if lyrics generation fails
          return {
            ...result,
            timestampedLyricsGenerated: false,
            lyricsError: lyricsResult.error
          };
        }
      } catch (lyricsError) {
        console.error('Error generating timestamped lyrics:', lyricsError);
        // Continue with the result even if lyrics generation fails
        return {
          ...result,
          timestampedLyricsGenerated: false,
          lyricsError: lyricsError instanceof Error ? lyricsError.message : 'Failed to generate timestamped lyrics'
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Error in updateSongWithVariantsAction:', error);
    return { success: false, error: 'Failed to update song with variants' };
  }
}

export async function softDeleteSongAction(songId: number) {
  try {
    const { softDeleteSong } = await import('@/lib/db/services');
    const result = await softDeleteSong(songId);
    return result;
  } catch (error) {
    console.error('Error in softDeleteSongAction:', error);
    return { success: false, error: 'Failed to delete song' };
  }
}

export async function restoreSongAction(songId: number) {
  try {
    const { restoreSong } = await import('@/lib/db/services');
    const result = await restoreSong(songId);
    return result;
  } catch (error) {
    console.error('Error in restoreSongAction:', error);
    return { success: false, error: 'Failed to restore song' };
  }
}

// Action to generate timestamped lyrics for a variant
async function generateTimestampedLyricsAction(
  taskId: string,
  variantIndex: number
): Promise<{ success: true; lyricLines: any[]; alignedWords: any[] } | { success: false; error: string }> {
  try {
    console.log(`Generating timestamped lyrics for taskId: ${taskId}, variantIndex: ${variantIndex}`);

    // Import the necessary functions
    const { getTimestampedLyrics } = await import('@/lib/suno-api');
    const { convertAlignedWordsToLyricLines } = await import('@/lib/utils');

    // Fetch timestamped lyrics from Suno API for the selected variant
    const lyricsResult = await getTimestampedLyrics({
      taskId,
      musicIndex: variantIndex
    });

    if (!lyricsResult.success) {
      console.error('Failed to fetch timestamped lyrics:', lyricsResult.error);
      return {
        success: false,
        error: lyricsResult.error instanceof Error
          ? lyricsResult.error.message
          : 'Failed to fetch timestamped lyrics from Suno API'
      };
    }

    // Get alignedWords from the response
    const alignedWords = lyricsResult.lyrics || [];

    if (!Array.isArray(alignedWords) || alignedWords.length === 0) {
      console.warn('No aligned words found in lyrics response');
      return {
        success: false,
        error: 'No lyrics data found for this variant'
      };
    }

    // Convert alignedWords to lyricLines (line-by-line format)
    const lyricLines = convertAlignedWordsToLyricLines(alignedWords);

    if (!lyricLines || lyricLines.length === 0) {
      console.warn('Failed to convert aligned words to lyric lines');
      return {
        success: false,
        error: 'Failed to convert lyrics to line format'
      };
    }

    console.log(`Successfully converted ${lyricLines.length} lyric lines for variant ${variantIndex}`);

    return {
      success: true,
      lyricLines,
      alignedWords
    };
  } catch (error) {
    console.error('Error generating timestamped lyrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate timestamped lyrics'
    };
  }
}

// Action to update timestamp_lyrics field in the database
export async function updateTimestampLyricsAction(
  songId: number,
  timestampLyrics: any
) {
  try {
    // Validate that timestampLyrics is a valid array
    if (!Array.isArray(timestampLyrics)) {
      return {
        success: false,
        error: 'Invalid format: timestamp_lyrics must be an array'
      };
    }

    // Validate that each item in the array is a valid LyricLine
    const LyricLine = timestampLyrics as any[];
    for (let i = 0; i < LyricLine.length; i++) {
      const line = LyricLine[i];
      if (!line || typeof line !== 'object') {
        return {
          success: false,
          error: `Invalid format at index ${i}: each item must be an object`
        };
      }

      // Check for required fields
      if (typeof line.index !== 'number') {
        return {
          success: false,
          error: `Invalid format at index ${i}: 'index' must be a number`
        };
      }

      if (typeof line.text !== 'string') {
        return {
          success: false,
          error: `Invalid format at index ${i}: 'text' must be a string`
        };
      }

      if (typeof line.start !== 'number') {
        return {
          success: false,
          error: `Invalid format at index ${i}: 'start' must be a number`
        };
      }

      if (typeof line.end !== 'number') {
        return {
          success: false,
          error: `Invalid format at index ${i}: 'end' must be a number`
        };
      }

      // Validate that end is greater than start
      if (line.end <= line.start) {
        return {
          success: false,
          error: `Invalid format at index ${i}: 'end' must be greater than 'start'`
        };
      }
    }

    // Update the database
    const { updateSong } = await import('@/lib/db/queries/update');
    await updateSong(songId, {
      timestamp_lyrics: timestampLyrics
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating timestamp lyrics:', error);
    return {
      success: false,
      error: 'Failed to update timestamp lyrics'
    };
  }
}

// Action to get full song data including timestamp_lyrics and lyrics
export async function getSongWithLyricsAction(songId: number) {
  try {
    const { getSongById } = await import('@/lib/db/services');
    const song = await getSongById(songId);

    if (!song) {
      return {
        success: false,
        error: 'Song not found'
      };
    }

    // Always use the main timestamp_lyrics field (which contains the fixed/edited lyrics)
    // Do not prioritize timestamped_lyrics_variants as it causes the "Fix Lyrics" bug
    // where fixed lyrics get reverted when the editor is reopened

    return {
      success: true,
      song: {
        id: song.id,
        title: song.title,
        slug: song.slug,
        lyrics: song.lyrics,
        timestamp_lyrics: song.timestamp_lyrics,
        timestamped_lyrics_variants: song.timestamped_lyrics_variants,
        selected_variant: song.selected_variant
      }
    };
  } catch (error) {
    console.error('Error getting song with lyrics:', error);
    return {
      success: false,
      error: 'Failed to get song data'
    };
  }
}

// Action to toggle show_lyrics field for a song
export async function toggleShowLyricsAction(songId: number, showLyrics: boolean) {
  try {
    const { updateSong } = await import('@/lib/db/queries/update');
    await updateSong(songId, {
      show_lyrics: showLyrics
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling show lyrics:', error);
    return { success: false, error: 'Failed to update show_lyrics' };
  }
}

// Admin-only action to update likes_count for a song
export async function updateLikesCountAction(
  songId: number,
  likesCount: number
) {
  try {
    const safeLikes = Number.isFinite(likesCount) && likesCount >= 0 ? Math.floor(likesCount) : 0;

    const { updateSong } = await import('@/lib/db/queries/update');
    await updateSong(songId, {
      likes_count: safeLikes,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating likes_count:', error);
    return { success: false, error: 'Failed to update likes_count' };
  }
}


// Action to toggle download_allowed field for a song
export async function toggleDownloadAllowedAction(songId: number, downloadAllowed: boolean) {
  try {
    const { updateSong } = await import('@/lib/db/queries/update');
    await updateSong(songId, {
      download_allowed: downloadAllowed
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling download allowed:', error);
    return { success: false, error: 'Failed to update download_allowed' };
  }
}