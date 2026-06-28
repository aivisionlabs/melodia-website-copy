import { eq } from 'drizzle-orm';
import { lyricsDraftsTable, userSongsTable, songRequestsTable } from '@/lib/db/schema';

import { craftAudioModelLyrics } from '@/lib/services/llm/llm-audio-model-lyrics-crafter';
import type { PaymentSuccessContext, HandlerResult } from './types';

type ApprovedDraft = typeof lyricsDraftsTable.$inferSelect;

export async function generateSongFromApprovedLyrics(
  ctx: PaymentSuccessContext,
  approvedDraft: ApprovedDraft
): Promise<HandlerResult> {
  const { db, logger, requestId, paymentId, songRequest, origin } = ctx;

  // Idempotency guard: if a song already exists for this request, return it immediately.
  // Prevents duplicate song creation on page refresh or double-call.
  const existingSongs = await db
    .select({ id: userSongsTable.id })
    .from(userSongsTable)
    .where(eq(userSongsTable.song_request_id, parseInt(requestId)))
    .limit(1);

  if (existingSongs[0]) {
    logger.info('Song already exists for request; returning existing song (idempotent)', {
      requestId,
      songId: existingSongs[0].id,
    });
    return {
      message: 'Song created successfully',
      songId: existingSongs[0].id,
      redirectUrl: `/song-options/${existingSongs[0].id}`,
    };
  }

  const existingModelReady = (approvedDraft as any).model_ready_lyrics as string | null;
  const customerLyrics = (approvedDraft as any).customer_lyrics as string | null;

  if (!existingModelReady && customerLyrics) {
    logger.info('model_ready_lyrics missing; crafting after payment completion', {
      requestId,
      lyricsDraftId: approvedDraft.id,
      apiName: 'payment-success',
    });

    try {
      const crafted = await craftAudioModelLyrics({
        displayLyrics: customerLyrics,
        languages: (songRequest as any).languages || 'English',
        recipientDetails: (songRequest as any).recipient_details ?? undefined,
        recipientNameInScript: (songRequest as any).recipient_name_in_script ?? undefined,
      });

      if (crafted) {
        await db
          .update(lyricsDraftsTable)
          .set({ model_ready_lyrics: crafted } as any)
          .where(eq(lyricsDraftsTable.id, approvedDraft.id));

        logger.info('Audio-model-ready lyrics stored successfully (post-payment)', {
          requestId,
          lyricsDraftId: approvedDraft.id,
          modelReadyLyricsLength: crafted.length,
          apiName: 'payment-success',
        });
      } else {
        logger.warn('craftAudioModelLyrics returned null; proceeding without model_ready_lyrics', {
          requestId,
          lyricsDraftId: approvedDraft.id,
          apiName: 'payment-success',
        });
      }
    } catch (craftError) {
      // Non-blocking: allow song generation to use fallback logic if it still can.
      logger.error('Failed to craft audio-model-ready lyrics (post-payment); continuing', {
        requestId,
        lyricsDraftId: approvedDraft.id,
        error: craftError instanceof Error ? craftError : new Error(String(craftError)),
        apiName: 'payment-success',
      });
    }
  } else if (existingModelReady) {
    logger.info('model_ready_lyrics already present; skipping post-payment crafter', {
      requestId,
      lyricsDraftId: approvedDraft.id,
      apiName: 'payment-success',
    });
  }

  const generateSongResponse = await fetch(`${origin}/api/generate-song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lyricsDraftId: approvedDraft.id,
      songRequestId: parseInt(requestId),
    }),
  });

  if (!generateSongResponse.ok) {
    const errorData = await generateSongResponse.json().catch(() => ({}));
    logger.error('Failed to generate song during payment success processing', errorData);
    throw new Error(errorData.message || 'Failed to generate song');
  }

  const generateSongData = await generateSongResponse.json();

  if (!generateSongData.success) {
    logger.error('Song generation failed during payment success processing', generateSongData);
    throw new Error(generateSongData.message || 'Song generation failed');
  }

  logger.info('Song generated successfully', { songId: generateSongData.songId, requestId });

  await db
    .update(userSongsTable)
    .set({ payment_id: paymentId })
    .where(eq(userSongsTable.id, generateSongData.songId));

  logger.info('Payment linked to song', { songId: generateSongData.songId, paymentId });

  await db
    .update(songRequestsTable)
    .set({ status: 'processing' })
    .where(eq(songRequestsTable.id, parseInt(requestId)));

  return {
    message: 'Song created successfully',
    songId: generateSongData.songId,
    redirectUrl: `/song-options/${generateSongData.songId}`,
  };
}
