/**
 * Vendor Order Approve Lyrics API
 * POST /api/vendor-order/[orderToken]/approve-lyrics
 *
 * Customer approves lyrics on the co-branded page.
 * Skips payment — triggers song generation directly.
 * No core payment routes modified.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  partnerApiOrdersTable,
  lyricsDraftsTable,
  partnerApiVendorsTable,
  userSongsTable,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
import { checkApproveLyricsAllowed } from '@/lib/vendor-order/approve-lyrics-guards';
import { generateSong } from '@/lib/services/song-generation-service';
import { craftAudioModelLyrics } from '@/lib/services/llm/llm-audio-model-lyrics-crafter';
import { completeCustomSongOrderAndNotify } from '@/lib/vendor-order/notification-helpers';
import { logger } from '@/lib/logger';
import { isDemoModeEnabled, DEMO_SONG_VARIANTS } from '@/lib/demo-mode';

export const runtime = 'nodejs';

const approveSchema = z.object({
  lyricsDraftId: z.number().int().positive(),
  /** Manually edited lyrics from the customer; null/omitted means no manual edits */
  customerLyrics: z.string().optional().nullable(),
});

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ orderToken: string }> },
) {
  const { orderToken } = await params;

  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order, vendor } = resolved;

  const approveGuard = checkApproveLyricsAllowed(order);
  if (!approveGuard.ok) {
    return NextResponse.json({ error: approveGuard.error }, { status: approveGuard.httpStatus });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
      { status: 400 },
    );
  }

  const { lyricsDraftId, customerLyrics: editedLyrics } = parsed.data;

  // Verify the draft belongs to this song request
  const [draft] = await db
    .select()
    .from(lyricsDraftsTable)
    .where(
      and(
        eq(lyricsDraftsTable.id, lyricsDraftId),
        eq(lyricsDraftsTable.song_request_id, order.song_request_id!),
      ),
    )
    .limit(1);

  if (!draft) {
    return NextResponse.json({ error: 'Lyrics draft not found.' }, { status: 404 });
  }

  // Fetch song request for context
  const [songRequest] = await db
    .select()
    .from(songRequestsTable)
    .where(eq(songRequestsTable.id, order.song_request_id!))
    .limit(1);

  if (!songRequest) {
    return NextResponse.json({ error: 'Song request not found.' }, { status: 404 });
  }

  // Mark draft as approved + set selected_lyrics_draft_id on song request
  // If customer manually edited the lyrics, save those edits and clear model_ready_lyrics
  // so the crafter re-derives it from the updated customer text.
  await db.transaction(async (tx) => {
    await tx
      .update(lyricsDraftsTable)
      .set({
        status: 'approved',
        ...(editedLyrics != null
          ? { customer_lyrics: editedLyrics, model_ready_lyrics: null }
          : {}),
      } as any)
      .where(eq(lyricsDraftsTable.id, lyricsDraftId));

    await tx
      .update(songRequestsTable)
      .set({ selected_lyrics_draft_id: lyricsDraftId, updated_at: new Date() })
      .where(eq(songRequestsTable.id, order.song_request_id!));
  });

  // Advance order to lyrics_approved
  await db
    .update(partnerApiOrdersTable)
    .set({ status: 'lyrics_approved', updated_at: new Date() })
    .where(eq(partnerApiOrdersTable.id, order.id));

  logger.info('Vendor order: lyrics approved, triggering song generation', {
    orderId: order.id,
    songRequestId: order.song_request_id,
    lyricsDraftId,
    vendorId: vendor.id,
  });

  // Trigger song generation asynchronously
  // Use edited lyrics if customer made manual changes (overrides the pre-fetched draft)
  const draftForGeneration = editedLyrics != null
    ? { ...draft, customer_lyrics: editedLyrics, model_ready_lyrics: null }
    : draft;

  void triggerSongGeneration(
    order.id,
    order.song_request_id!,
    lyricsDraftId,
    draftForGeneration as any,
    songRequest as any,
    vendor,
    orderToken,
  ).catch((err) => {
    logger.error('Vendor order: song generation failed', {
      orderId: order.id,
      songRequestId: order.song_request_id,
      error: String(err),
    });
  });

  return NextResponse.json({ success: true });
}

async function triggerSongGeneration(
  orderId: number,
  songRequestId: number,
  lyricsDraftId: number,
  draft: { customer_lyrics: string | null; model_ready_lyrics: string | null },
  songRequest: typeof songRequestsTable.$inferSelect,
  vendor: typeof partnerApiVendorsTable.$inferSelect,
  orderToken: string,
) {
  await db
    .update(partnerApiOrdersTable)
    .set({ status: 'song_generation_inprogress', updated_at: new Date() })
    .where(eq(partnerApiOrdersTable.id, orderId));

  // Craft model_ready_lyrics before triggering Suno (same as the payment success flow)
  const customerLyrics = draft.customer_lyrics;
  const existingModelReady = draft.model_ready_lyrics;

  if (!existingModelReady && customerLyrics) {
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
          .where(eq(lyricsDraftsTable.id, lyricsDraftId));
      }
    } catch (err) {
      // Non-blocking — song generation will use fallback
      logger.error('Vendor order: failed to craft audio-model-ready lyrics; continuing', {
        orderId,
        lyricsDraftId,
        error: String(err),
      });
    }
  }

  const songResult = await generateSong(lyricsDraftId, songRequestId, undefined, { sandbox: vendor.sandbox ?? false });

  if (!songResult.success) {
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'failed', completed_at: new Date(), updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId));

    logger.error('Vendor order: song generation failed', {
      orderId,
      songRequestId,
      message: songResult.message,
    });
    return;
  }

  // Song generation initiated. The order status will be advanced to 'completed'
  // by the Suno webhook handler when the song is ready (see task 6: status sync).
  // We store the songId in order metadata so the webhook handler can find the order.
  await db
    .update(partnerApiOrdersTable)
    .set({
      metadata: {
        ...(await db
          .select({ metadata: partnerApiOrdersTable.metadata })
          .from(partnerApiOrdersTable)
          .where(eq(partnerApiOrdersTable.id, orderId))
          .limit(1)
          .then((r) => (r[0]?.metadata as object | null) ?? {})),
        user_song_id: songResult.songId,
        order_token: orderToken,
      },
      updated_at: new Date(),
    })
    .where(eq(partnerApiOrdersTable.id, orderId));

  logger.info('Vendor order: song generation initiated', {
    orderId,
    songRequestId,
    userSongId: songResult.songId,
  });

  // In global demo mode the Suno webhook never fires — directly complete the order after a short delay.
  // Sandbox vendors are handled by progressive polling in the vendor-order GET endpoint instead.
  if (isDemoModeEnabled() && !vendor.sandbox) {
    const songId = songResult.songId;
    void (async () => {
      try {
        await new Promise((r) => setTimeout(r, 3000));

        const demoVariants = DEMO_SONG_VARIANTS.map((v) => ({
          id: v.id,
          title: 'Demo Song',
          audioUrl: v.audioUrl,
          sourceAudioUrl: v.sourceAudioUrl,
          streamAudioUrl: v.streamAudioUrl,
          sourceStreamAudioUrl: v.sourceStreamAudioUrl,
          imageUrl: v.imageUrl,
          sourceImageUrl: v.sourceImageUrl,
          duration: v.duration,
          modelName: v.modelName,
          variantStatus: 'DOWNLOAD_READY',
        }));

        await db
          .update(userSongsTable)
          .set({ status: 'completed', song_variants: demoVariants })
          .where(eq(userSongsTable.id, songId));

        await db
          .update(songRequestsTable)
          .set({ status: 'completed' })
          .where(eq(songRequestsTable.id, songRequestId));

        const [songRow] = await db
          .select()
          .from(userSongsTable)
          .where(eq(userSongsTable.id, songId))
          .limit(1);

        if (songRow) {
          await completeCustomSongOrderAndNotify({
            orderId,
            songSlug: songRow.slug,
            variants: demoVariants,
            logger,
            errorMessage: 'Vendor order: demo mode completion notification failed',
          });
        }

        logger.info('Vendor order: demo mode completed', { orderId, songId, songRequestId });
      } catch (err) {
        logger.error('Vendor order: demo mode completion failed', {
          orderId,
          songId,
          error: String(err),
        });
      }
    })();
  }
}

export const POST = withRateLimit('vendor.order.approve_lyrics', handler);
