/**
 * Song Generation Service
 *
 * This service centralizes the logic for generating a song, from calling the
 * Suno API to creating the necessary records in the database. It is designed
 * to be the single source of truth for song creation, usable by both API
 * routes and server actions to ensure consistency.
 */
import { db } from '@/lib/db';
import {
  userSongsTable,
  lyricsDraftsTable,
  songRequestsTable,
  personasTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SunoAPIFactory } from '@/lib/suno-api';
import { checkSunoCreditAndNotify } from '@/lib/suno-credit-alert';
import { generateBaseSlug } from '@/lib/utils/slug';
import { getBaseUrl } from '@/lib/utils/url';
import { DEMO_TASK_ID_PREFIX } from '@/lib/demo-mode';
import { craftAudioModelLyrics } from '@/lib/services/llm/llm-audio-model-lyrics-crafter';
import { logger } from '@/lib/logger';

/**
 * Generates a unique slug for a user song by checking against existing slugs in the database.
 * This matches the logic used in db/services.ts for creating songs.
 * @param title The title of the song.
 * @returns A unique slug string.
 */
async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = generateBaseSlug(title || 'song');

  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 1000;

  while (counter <= maxAttempts) {
    // Check if slug exists in user_songs table
    const existingSong = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.slug, slug))
      .limit(1);

    if (existingSong.length === 0) {
      return slug;
    }

    // Generate next slug with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Fallback: use timestamp to ensure uniqueness
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
}

/**
 * The main service function for generating a song.
 *
 * @param lyricsDraftId The ID of the approved lyrics draft (fallback if selected version not found).
 * @param songRequestId The ID of the original song request.
 * @returns An object indicating success or failure, along with the new song's data.
 */
export async function generateSong(
  lyricsDraftId: number,
  songRequestId: number,
  personaId?: string,
  options?: { sandbox?: boolean },
) {
  const startTime = Date.now();
  logger.info('Song generation service started', {
    lyricsDraftId,
    songRequestId,
    hasPersona: !!personaId
  });

  try {
    // 1. Get song request to check for selected version
    logger.debug('Fetching song request', { songRequestId });
    const songRequests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, songRequestId))
      .limit(1);

    if (songRequests.length === 0) {
      logger.error('Song request not found', { songRequestId });
      throw new Error('Song request not found');
    }

    const songRequest = songRequests[0];

    // Auto-derive persona for similar-style requests (server-side source of truth)
    let resolvedPersonaId: string | undefined = personaId || undefined;
    if (!resolvedPersonaId && (songRequest as any).persona_id) {
      const personaDbId = (songRequest as any).persona_id as number;
      logger.debug('Resolving persona from song request', {
        songRequestId,
        personaDbId,
      });

      const personas = await db
        .select({ suno_persona_id: personasTable.suno_persona_id })
        .from(personasTable)
        .where(eq(personasTable.id, personaDbId))
        .limit(1);

      if (personas[0]?.suno_persona_id) {
        resolvedPersonaId = personas[0].suno_persona_id;
        logger.info('Resolved persona for song generation', {
          songRequestId,
          personaDbId,
          hasPersona: true,
        });
      } else {
        logger.warn('Persona referenced by song request was not found', {
          songRequestId,
          personaDbId,
        });
      }
    }

    // Use selected version if available, otherwise fall back to the passed draftId
    const versionToUse = songRequest.selected_lyrics_draft_id || lyricsDraftId;
    logger.debug('Determined lyrics version to use', {
      selectedVersion: songRequest.selected_lyrics_draft_id,
      fallbackVersion: lyricsDraftId,
      finalVersion: versionToUse
    });

    // 2. Fetch the selected lyrics draft
    logger.debug('Fetching lyrics draft', { draftId: versionToUse });
    const drafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, versionToUse))
      .limit(1);

    if (drafts.length === 0) {
      logger.error('Lyrics draft not found', { draftId: versionToUse });
      throw new Error('Selected lyrics draft not found');
    }
    const draft = drafts[0];

    let modelReadyLyrics = (draft as any).model_ready_lyrics as string | null;
    const customerLyrics = (draft as any).customer_lyrics as string | null;
    // If model_ready_lyrics is missing, populate it now as a safety fallback.
    // In the normal user flow it should already be set by payments/success.
    if (!modelReadyLyrics && customerLyrics) {
      logger.warn('model_ready_lyrics missing; crafting fallback before audio generation', {
        draftId: draft.id,
        songRequestId,
      });
      try {
        const crafted = await craftAudioModelLyrics({
          displayLyrics: customerLyrics,
          languages: songRequest.languages || 'English',
          recipientDetails: (songRequest as any).recipient_details ?? undefined,
          recipientNameInScript: (songRequest as any).recipient_name_in_script ?? undefined,
        });
        if (crafted) {
          modelReadyLyrics = crafted;
          // Persist so future requests reuse the crafted version
          await db
            .update(lyricsDraftsTable)
            .set({ model_ready_lyrics: crafted } as any)
            .where(eq(lyricsDraftsTable.id, draft.id));
          logger.info('Audio-model-ready lyrics crafted and stored', {
            draftId: draft.id,
            crafted_length: crafted.length,
          });
        }
      } catch (craftErr) {
        logger.error('Failed to craft audio-model-ready lyrics; falling back to customer_lyrics', {
          error: craftErr instanceof Error ? craftErr : new Error(String(craftErr)),
          draftId: draft.id,
        });
      }
    }

    // Final lyrics for the audio provider: prefer model_ready_lyrics, fallback to customer_lyrics
    const lyricsForAudioModel = modelReadyLyrics || customerLyrics || '';

    logger.info('Lyrics draft retrieved', {
      draftId: draft.id,
      title: draft.song_title,
      musicStyle: draft.music_style,
      hasModelReadyLyrics: !!modelReadyLyrics,
      lyricsLength: lyricsForAudioModel.length,
    });

    // 2. Check if a song already exists for this request to prevent duplicates
    logger.debug('Checking for existing songs', { songRequestId });
    const existingSongs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.song_request_id, songRequestId))
      .limit(1);

    let retryFailedSongId: number | null = null;

    if (existingSongs.length > 0) {
      const existingSong = existingSongs[0];
      const existingStatus = (existingSong.status || '').toLowerCase();

      if (existingStatus === 'failed') {
        retryFailedSongId = existingSong.id;
        logger.info('Retrying song generation after failure', {
          songId: existingSong.id,
          slug: existingSong.slug,
          songRequestId,
        });
      } else {
        logger.warn('Song already exists for this request', {
          songId: existingSong.id,
          slug: existingSong.slug,
          songRequestId,
          status: existingSong.status,
        });
        return {
          success: true,
          songId: existingSong.id,
          slug: existingSong.slug,
          message: 'Song already exists for this request',
          alreadyExists: true,
          status: existingSong.status,
        };
      }
    }

    // 3. Call the Suno API to start the song generation (or skip for sandbox)
    let sunoResult: { taskId: string; status: 'queued'; estimatedTime: number };

    if (options?.sandbox) {
      const taskId = `${DEMO_TASK_ID_PREFIX}${Date.now()}`;
      logger.info('Sandbox mode: using demo task ID', { taskId, songRequestId });
      sunoResult = { taskId, status: 'queued', estimatedTime: 120 };
    } else {
      const baseUrl = await getBaseUrl();
      const callbackUrl = `${baseUrl}/api/suno-webhook`;

      // vocalGender from cached SongRequirements (context analysis) — pass to Suno when present
      const songRequirements = draft.song_requirements as { vocalGender?: 'm' | 'f' | null } | null;
      const vocalGender =
        songRequirements?.vocalGender === 'm' || songRequirements?.vocalGender === 'f'
          ? songRequirements.vocalGender
          : undefined;

      logger.info('Calling Suno API', {
        title: draft.song_title,
        musicStyle: draft.music_style,
        hasPersona: !!resolvedPersonaId,
        vocalGender: vocalGender ?? 'not set',
        callbackUrl
      });

      const sunoAPI = SunoAPIFactory.getAPI();
      const sunoStartTime = Date.now();
      const sunoResponse = await sunoAPI.generateSong({
        title: draft.song_title || 'Untitled Song',
        prompt: lyricsForAudioModel,
        ...(resolvedPersonaId ? {} : { style: draft.music_style || 'Pop' }),
        callBackUrl: callbackUrl || '',
        ...(resolvedPersonaId ? { personaId: resolvedPersonaId } : {}),
        ...(vocalGender ? { vocalGender } : {}),
      });
      const sunoDuration = Date.now() - sunoStartTime;

      logger.debug('Suno API response received', {
        code: sunoResponse.code,
        hasTaskId: !!sunoResponse.data?.taskId,
        duration_ms: sunoDuration
      });

      if (sunoResponse.code !== 200 || !sunoResponse.data.taskId) {
        logger.error('Suno API error', {
          code: sunoResponse.code,
          message: sunoResponse.msg
        });
        throw new Error(sunoResponse.msg || 'Failed to start song generation');
      }

      if (!sunoResponse.data.taskId.trim()) {
        logger.error('Invalid task ID received from Suno API', {
          taskId: sunoResponse.data.taskId
        });
        throw new Error('Invalid task ID received from Suno API');
      }

      sunoResult = {
        taskId: sunoResponse.data.taskId,
        status: 'queued',
        estimatedTime: 120,
      };

      logger.info('Suno task created successfully', {
        taskId: sunoResult.taskId,
        estimatedTime: sunoResult.estimatedTime
      });
    }

    const songVariantsPayload = {
      [sunoResult.taskId]: {
        taskId: sunoResult.taskId,
        status: sunoResult.status,
        title: draft.song_title,
        style: draft.music_style,
      },
    };

    const metadataPayload = {
      sunoTaskId: sunoResult.taskId,
      estimatedTime: sunoResult.estimatedTime,
      ...(resolvedPersonaId ? { personaId: resolvedPersonaId } : {}),
    };

    let newSong: { id: number; slug: string };

    if (retryFailedSongId !== null) {
      logger.info('Updating failed song record for retry', { songId: retryFailedSongId });
      const updated = await db
        .update(userSongsTable)
        .set({
          status: 'processing',
          approved_lyrics_id: versionToUse,
          song_variants: songVariantsPayload,
          metadata: metadataPayload,
          variant_timestamp_lyrics_api_response: {},
          variant_timestamp_lyrics_processed: {},
        })
        .where(eq(userSongsTable.id, retryFailedSongId))
        .returning({ id: userSongsTable.id, slug: userSongsTable.slug });

      const row = updated[0];
      if (!row) {
        logger.error('Failed to update song row on retry', { retryFailedSongId });
        throw new Error('Failed to update song record for retry');
      }
      newSong = row;
    } else {
      // 4. Create the new song record in the database
      logger.debug('Generating unique slug', { title: draft.song_title });
      const slug = await generateUniqueSlug(draft.song_title || 'song');
      logger.debug('Slug generated', { slug });

      logger.info('Creating song record in database');
      const newSongs = await db
        .insert(userSongsTable)
        .values({
          song_request_id: songRequestId,
          slug,
          status: 'processing',
          approved_lyrics_id: versionToUse,
          song_variants: songVariantsPayload,
          metadata: metadataPayload,
        })
        .returning();

      newSong = newSongs[0];
    }

    logger.info(retryFailedSongId !== null ? 'Song record updated for retry' : 'Song record created', {
      songId: newSong.id,
      slug: newSong.slug,
    });

    // 5. Update the original song request's status to 'processing'
    logger.debug('Updating song request status');
    await db
      .update(songRequestsTable)
      .set({ status: 'processing' })
      .where(eq(songRequestsTable.id, songRequestId));

    // Fire-and-forget: check Suno credit and send low-balance alert if needed
    if (!options?.sandbox) {
      void checkSunoCreditAndNotify();
    }

    const totalDuration = Date.now() - startTime;
    logger.info('Song generation completed successfully', {
      songId: newSong.id,
      taskId: sunoResult.taskId,
      slug: newSong.slug,
      duration_ms: totalDuration,
      retriedFromFailure: retryFailedSongId !== null,
    });

    return {
      success: true,
      songId: newSong.id,
      slug: newSong.slug,
      taskId: sunoResult.taskId,
      estimatedTime: sunoResult.estimatedTime,
      message:
        retryFailedSongId !== null
          ? 'Song generation restarted after a previous failure.'
          : 'Song generation started successfully!',
      status: 'processing',
      retriedFromFailure: retryFailedSongId !== null,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Song generation failed', {
      error,
      lyricsDraftId,
      songRequestId,
      duration_ms: duration
    });
    throw error;
  }
}
