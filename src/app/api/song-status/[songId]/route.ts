/**
 * Song Status API
 * GET /api/song-status/[songId]
 * Checks the generation status of a song
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userSongsTable, songRequestsTable, lyricsDraftsTable, usersTable, packagesTable } from '@/lib/db/schema';
import { isDemoTaskId } from '@/lib/demo-mode';
import { eq } from 'drizzle-orm';
import { normalizeSunoStatus, SunoAPIFactory } from '@/lib/suno-api';
import { EmailFactory } from '@/lib/services/email/email-factory';
import { normalizeSunoVariantToStored } from '@/lib/utils/variant-utils';
import { createContextLogger } from '@/lib/logger';
import { mapSongVariantsSourceImagesForResponse } from '@/lib/utils/url';
import { failPartnerOrderIfLinked } from '@/lib/partner-api/fail-partner-order-if-linked';
import { maybeNotifyOpsUserSongGenerationFailed } from '@/lib/song-generation-failure-alerts';
import { computeVariationsRemaining } from '@/lib/packages/allowed-variations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const { songId: songIdParam } = await params;
    const songId = parseInt(songIdParam);
    const log = createContextLogger({ apiName: 'song-status', songId });

    if (isNaN(songId)) {
      log.warn('Invalid songId provided', { songIdParam });
      return NextResponse.json(
        { error: 'Invalid song ID' },
        { status: 400 }
      );
    }

    // Get song record
    const songs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.id, songId))
      .limit(1);

    if (songs.length === 0) {
      log.warn('Song not found', { songId });
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    const song = songs[0];
    log.debug('Song loaded', { dbStatus: song.status, hasMetadata: Boolean(song.metadata) });

    // Fetch variation info + request metadata
    let variationsRemaining = 0;
    let occasion: string | null = null;
    let languages: string | null = null;
    let recipientName: string | null = null;

    if (song.song_request_id) {
      try {
        const [songRequest] = await db
          .select({
            package_id: songRequestsTable.package_id,
            variations_used: songRequestsTable.variations_used,
            parent_request_id: songRequestsTable.parent_request_id,
            occasion: songRequestsTable.occasion,
            languages: songRequestsTable.languages,
            requester_name: songRequestsTable.requester_name,
          })
          .from(songRequestsTable)
          .where(eq(songRequestsTable.id, song.song_request_id))
          .limit(1);

        if (songRequest && !songRequest.parent_request_id) {
          occasion = songRequest.occasion ?? null;
          languages = songRequest.languages ?? null;
          recipientName = songRequest.requester_name ?? null;

          if (songRequest.package_id) {
            const [pkg] = await db
              .select({
                allowed_variations: packagesTable.allowed_variations,
                slug: packagesTable.slug,
              })
              .from(packagesTable)
              .where(eq(packagesTable.id, songRequest.package_id))
              .limit(1);
            variationsRemaining = computeVariationsRemaining(
              pkg,
              songRequest.variations_used,
            );
          }
        }
      } catch (err) {
        log.warn('Error fetching variation info', { error: err });
      }
    }

    // Fetch lyrics draft title if approved_lyrics_id exists
    let lyricsDraftTitle: string | null = null;
    if (song.approved_lyrics_id) {
      try {
        const lyricsDraft = await db
          .select({ song_title: lyricsDraftsTable.song_title })
          .from(lyricsDraftsTable)
          .where(eq(lyricsDraftsTable.id, song.approved_lyrics_id))
          .limit(1);
        lyricsDraftTitle = lyricsDraft[0]?.song_title || null;
      } catch (error) {
        log.warn('Error fetching lyrics draft title', { error });
        // Continue without title if fetch fails
      }
    }

    // Get taskId from metadata early to allow demo handling to take precedence
    const taskId = (song.metadata as any)?.sunoTaskId;

    // Handle demo mode tasks FIRST (regardless of current song.status)
    if (isDemoTaskId(taskId)) {
      const DEMO_V1_STREAM_MS = 1 * 1000; // 1s
      const DEMO_V1_DOWNLOAD_MS = 3 * 1000; // 3s
      const DEMO_V2_STREAM_MS = 2 * 1000; // 2s
      const DEMO_V2_DOWNLOAD_MS = 5 * 1000; // 5s
      const songCreatedAt = new Date(song.created_at).getTime();
      const elapsed = Date.now() - songCreatedAt;

      // Base mock variants blueprint (from provided data)
      const baseVariants = [
        {
          id: 'ce5b09ea-ad49-4a6c-b449-e4c47597d123',
          title: 'Anaya turns 4',
          imageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
          streamUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          downloadUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          duration: 85.76,
          streamThreshold: DEMO_V1_STREAM_MS,
          downloadThreshold: DEMO_V1_DOWNLOAD_MS,
        },
        {
          id: 'e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608',
          title: 'Anaya turns 4',
          imageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
          streamUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          downloadUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          duration: 89.92,
          streamThreshold: DEMO_V2_STREAM_MS,
          downloadThreshold: DEMO_V2_DOWNLOAD_MS,
        },
      ];

      // Build variant states based on elapsed time
      const variantStates = baseVariants.map((v) => {
        if (elapsed < v.streamThreshold) {
          return {
            id: v.id,
            title: v.title,
            imageUrl: v.imageUrl,
            sourceImageUrl: v.imageUrl,
            duration: v.duration,
            modelName: 'DEMO',
            variantStatus: 'PENDING' as const,
          };
        }
        if (elapsed < v.downloadThreshold) {
          return {
            id: v.id,
            title: v.title,
            imageUrl: v.imageUrl,
            sourceImageUrl: v.imageUrl,
            duration: v.duration,
            modelName: 'DEMO',
            streamAudioUrl: v.streamUrl,
            sourceStreamAudioUrl: v.streamUrl,
            variantStatus: 'STREAM_READY' as const,
          };
        }
        return {
          id: v.id,
          title: v.title,
          imageUrl: v.imageUrl,
          sourceImageUrl: v.imageUrl,
          duration: v.duration,
          modelName: 'DEMO',
          streamAudioUrl: v.streamUrl,
          sourceStreamAudioUrl: v.streamUrl,
          audioUrl: v.downloadUrl,
          sourceAudioUrl: v.downloadUrl,
          variantStatus: 'DOWNLOAD_READY' as const,
        };
      });

      // Persist completed state when both are ready, otherwise keep processing
      const allDone = elapsed >= DEMO_V2_DOWNLOAD_MS;
      if (allDone) {
        // Only update DB if not already matching the new variant set
        await db
          .update(userSongsTable)
          .set({
            status: 'completed',
            song_variants: variantStates,
          })
          .where(eq(userSongsTable.id, songId));

        await db
          .update(songRequestsTable)
          .set({ status: 'completed' })
          .where(eq(songRequestsTable.id, song.song_request_id));

        return NextResponse.json({
          status: 'completed',
          songVariants: mapSongVariantsSourceImagesForResponse(variantStates as any) ?? variantStates,
          slug: song.slug,
          songId: song.id,
          taskId,
          lyricsDraftTitle,
          songRequestId: song.song_request_id,
          variationsRemaining,
          occasion,
          languages,
          recipientName,
        });
      }

      // Processing state with progressive variants
      return NextResponse.json({
        status: 'processing',
        message: 'Demo song is being generated',
        songVariants: mapSongVariantsSourceImagesForResponse(variantStates as any) ?? variantStates,
        slug: song.slug,
        songId: song.id,
        taskId,
        lyricsDraftTitle,
        songRequestId: song.song_request_id,
        variationsRemaining,
        occasion,
        languages,
        recipientName,
      });
    }

    // If already completed or failed, return current status (non-demo)
    if (song.status === 'completed' || song.status === 'failed') {
      // Normalize variants to array if stored as object
      const storedVariants: any = song.song_variants || [];
      const variantArrayRaw = Array.isArray(storedVariants)
        ? storedVariants
        : Object.keys(storedVariants).map((k) => storedVariants[k]);

      // Ensure each variant has variantStatus and streamAudioUrl
      const variantArray = variantArrayRaw.map((v: any) => {
        const hasStatus = typeof v?.variantStatus === 'string' && v.variantStatus.length > 0;
        const hasDownload = !!(v?.audioUrl || v?.sourceAudioUrl);
        const hasStream = !!(v?.streamAudioUrl || v?.sourceStreamAudioUrl);
        const variantStatus = hasStatus
          ? v.variantStatus
          : hasDownload
            ? 'DOWNLOAD_READY'
            : hasStream
              ? 'STREAM_READY'
              : 'PENDING';

        const streamAudioUrl = v?.streamAudioUrl
          || v?.sourceStreamAudioUrl
          || v?.audioUrl
          || v?.sourceAudioUrl
          || undefined;

        return {
          ...v,
          variantStatus,
          streamAudioUrl,
        };
      });

      return NextResponse.json({
        status: song.status,
        songVariants: mapSongVariantsSourceImagesForResponse(variantArray as any) ?? variantArray,
        slug: song.slug,
        songId: song.id,
        taskId,
        lyricsDraftTitle,
        songRequestId: song.song_request_id,
        variationsRemaining,
        occasion,
        languages,
        recipientName,
      });
    }

    // If we reach here, non-demo: verify taskId exists
    if (!taskId) {
      return NextResponse.json(
        { error: 'No task ID found' },
        { status: 400 }
      );
    }

    // Check Suno API status using factory pattern (non-demo)
    const sunoAPI = SunoAPIFactory.getAPI();
    const recordInfo = await sunoAPI.getRecordInfo(taskId);

    if (recordInfo.code !== 200) {
      log.error('Suno record-info request failed', {
        taskId,
        code: recordInfo.code,
        msg: recordInfo.msg,
        errorCode: recordInfo.data?.errorCode,
        errorMessage: recordInfo.data?.errorMessage,
      });
      return NextResponse.json(
        { error: recordInfo.msg || 'Failed to check song status' },
        { status: 500 }
      );
    }

    // Transform factory response to match expected format
    const normalized = normalizeSunoStatus(recordInfo.data.status);
    const mappedStatus: 'completed' | 'failed' | 'processing' =
      recordInfo.data.errorCode ? 'failed' :
        normalized === 'completed' ? 'completed' :
          normalized === 'failed' ? 'failed' :
            'processing';

    log.debug('Suno status mapped', {
      taskId,
      sunoStatus: recordInfo.data.status,
      normalizedStatus: normalized,
      mappedStatus,
      variantCount: Array.isArray(recordInfo.data.response?.sunoData) ? recordInfo.data.response.sunoData.length : 0,
    });

    const sunoStatus = {
      taskId: recordInfo.data.taskId,
      status: mappedStatus,
      songs: recordInfo.data.response?.sunoData?.filter(Boolean).map((song: any) =>
        normalizeSunoVariantToStored(song)
      ),
      error: recordInfo.data.errorMessage || recordInfo.msg,
    };

    // Update database based on status
    // Handle case where status is completed but songs array is empty/undefined
    if (sunoStatus.status === 'completed') {
      if (!sunoStatus.songs || sunoStatus.songs.length === 0) {
        // Status says completed but no songs - treat as processing (might be a timing issue)
        console.warn(`Song ${songId} marked as completed but no songs found. Keeping as processing.`);
        return NextResponse.json({
          status: 'processing',
          message: 'Song generation is still in progress',
          songId: song.id,
          taskId,
          lyricsDraftTitle,
          songRequestId: song.song_request_id,
          variationsRemaining,
          occasion,
          languages,
          recipientName,
        });
      }

      // Process completed songs -> ARRAY variants (same normalizer as webhook for consistent storage)
      const variants = sunoStatus.songs.map((s: any) => normalizeSunoVariantToStored(s));

      const timestampedLyrics: Record<number, any> = {};

      await db
        .update(userSongsTable)
        .set({
          status: 'completed',
          song_variants: variants,
          variant_timestamp_lyrics_api_response: timestampedLyrics,
        })
        .where(eq(userSongsTable.id, songId));

      // Update song request status
      await db
        .update(songRequestsTable)
        .set({ status: 'completed' })
        .where(eq(songRequestsTable.id, song.song_request_id));

      // Send notification email with fallback logic
      const songRequest = await db
        .select()
        .from(songRequestsTable)
        .where(eq(songRequestsTable.id, song.song_request_id))
        .limit(1);

      if (songRequest.length > 0) {
        let recipientEmail: string | null = null;
        let recipientName: string | undefined = songRequest[0].requester_name ?? undefined;

        // Priority 1: Use email from song request
        recipientEmail = songRequest[0].email || null;

        // Priority 2: Fallback to user account email if song request email is missing
        if (!recipientEmail && songRequest[0].user_id) {
          const users = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, songRequest[0].user_id))
            .limit(1);

          if (users.length > 0) {
            recipientEmail = users[0].email || null;
            // Use user's name if requester name is not available
            if (!recipientName) {
              recipientName = users[0].name || undefined;
            }
          }
        }

        // Send email if we have a recipient
        if (recipientEmail) {
          const emailProvider = EmailFactory.getProvider();
          await emailProvider.sendSongReadyNotification(
            recipientEmail,
            recipientName,
            (song.metadata as any)?.title || 'Your Song',
            song.slug
          );
        } else {
          console.warn(
            `⚠️ No email found for song ready notification. Song ID: ${songId}, Song Request ID: ${song.song_request_id}`
          );
        }
      }

      return NextResponse.json({
        status: 'completed',
        songVariants: mapSongVariantsSourceImagesForResponse(variants as any) ?? variants,
        slug: song.slug,
        songId: song.id,
        taskId,
        lyricsDraftTitle,
        songRequestId: song.song_request_id,
        variationsRemaining,
        occasion,
        languages,
        recipientName,
      });
    } else if (sunoStatus.status === 'failed') {
      // Mark as failed
      await db
        .update(userSongsTable)
        .set({
          status: 'failed',
          metadata: {
            ...(song.metadata as any),
            error: sunoStatus.error,
          },
        })
        .where(eq(userSongsTable.id, songId));

      await db
        .update(songRequestsTable)
        .set({ status: 'failed' })
        .where(eq(songRequestsTable.id, song.song_request_id));

      await failPartnerOrderIfLinked(
        song.song_request_id,
        sunoStatus.error || 'Song generation failed',
        log,
      );

      void maybeNotifyOpsUserSongGenerationFailed({
        userSongId: song.id,
        songRequestId: song.song_request_id,
        taskId,
        errorMessage: sunoStatus.error || 'Song generation failed (poll)',
        source: 'song-status-poll',
      });

      return NextResponse.json({
        status: 'failed',
        error: sunoStatus.error,
        songId: song.id,
        taskId,
        lyricsDraftTitle,
        songRequestId: song.song_request_id,
        variationsRemaining,
        occasion,
        languages,
        recipientName,
      });
    }

    // Still processing - but check if we have partial variants (for progressive UI)
    // Suno API can return variants during processing (e.g., FIRST_SUCCESS, TEXT_SUCCESS states)
    if (sunoStatus.songs && sunoStatus.songs.length > 0) {
      const variants = sunoStatus.songs.map((s: any) => normalizeSunoVariantToStored(s));

      // Return variants even during processing (for progressive UI)
      return NextResponse.json({
        status: 'processing',
        message: 'Song is still being generated',
        songVariants: mapSongVariantsSourceImagesForResponse(variants as any) ?? variants,
        slug: song.slug,
        songId: song.id,
        taskId,
        lyricsDraftTitle,
        songRequestId: song.song_request_id,
        variationsRemaining,
        occasion,
        languages,
        recipientName,
      });
    }

    // Still processing with no variants yet
    return NextResponse.json({
      status: 'processing',
      message: 'Song is still being generated',
      songId: song.id,
      taskId,
      lyricsDraftTitle,
      songRequestId: song.song_request_id,
      variationsRemaining,
      occasion,
      languages,
      recipientName,
    });
  } catch (error) {
    console.error('Song status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check song status' },
      { status: 500 }
    );
  }
}

