/**
 * Vendor Order State API
 * GET /api/vendor-order/[orderToken]
 *
 * Returns the full state needed to render the co-branded customer page.
 * No auth required — the orderToken is the access secret.
 * Polled by the client component to track progress through the flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  lyricsDraftsTable,
  songRequestsTable,
  templatedSongInstancesTable,
  userSongsTable,
  partnerApiOrdersTable,
  packagesTable,
} from '@/lib/db/schema';
import { eq, desc, ne, and, isNotNull } from 'drizzle-orm';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
import { computeVariationsRemaining } from '@/lib/packages/allowed-variations';
import { logger } from '@/lib/logger';
import { SunoAPIFactory, normalizeSunoStatus } from '@/lib/suno-api';
import { normalizeSunoVariantToStored } from '@/lib/utils/variant-utils';
import { isDemoTaskId, getDemoTaskTimestamp, DEMO_SONG_VARIANTS } from '@/lib/demo-mode';
import {
  completeCustomSongOrderAndNotify,
  completeTemplatedOrderAndNotify,
  notifyPartnerOrderFailedByOrderId,
} from '@/lib/vendor-order/notification-helpers';
import { mapSongVariantsRecordForResponse } from '@/lib/utils/url';
import { getEffectiveVendorOrderStatusForResponse } from '@/lib/vendor-order/effective-order-status';
import {
  maybeNotifyOpsTemplatedInstanceFailed,
  maybeNotifyOpsUserSongGenerationFailed,
} from '@/lib/song-generation-failure-alerts';

export const runtime = 'nodejs';

// Demo/sandbox progressive timing — mirrors real Suno lifecycle
const DEMO_STREAM_READY_MS = 5_000;   // First variant becomes STREAM_READY
const DEMO_DOWNLOAD_READY_MS = 10_000; // Both variants become DOWNLOAD_READY → completed

/**
 * Actively checks Suno status for a processing templated instance.
 * Updates the instance (and linked partner order) to completed/failed when ready.
 * Returns the (potentially updated) instance data.
 */
async function pollAndUpdateTemplatedInstance(
  instance: {
    id: number;
    slug: string;
    status: string | null;
    song_title: string;
    recipient_name: string;
    replaced_lyrics: string | null;
    song_variants: unknown;
    suno_task_id?: string | null;
    partner_api_order_id?: number | null;
    created_at?: Date | string | null;
    metadata?: unknown;
  },
  orderId: number,
): Promise<typeof instance> {
  const taskId =
    (instance as any).suno_task_id ??
    ((instance.metadata as any)?.sunoTaskId as string | undefined) ??
    null;

  if (!taskId) return instance;

  // ── Demo/sandbox mode — progressive status changes mirroring real Suno ────
  if (isDemoTaskId(taskId)) {
    const createdAtMs = getDemoTaskTimestamp(taskId) ?? (
      instance.created_at ? new Date(instance.created_at as any).getTime() : Date.now()
    );
    const elapsed = Date.now() - createdAtMs;

    // Build variant with a given status — stream-only URLs for STREAM_READY, full URLs for DOWNLOAD_READY
    const buildDemoVariant = (idx: number, status: 'STREAM_READY' | 'DOWNLOAD_READY') => ({
      id: DEMO_SONG_VARIANTS[idx].id,
      title: 'Demo Song',
      imageUrl: DEMO_SONG_VARIANTS[idx].imageUrl,
      sourceImageUrl: DEMO_SONG_VARIANTS[idx].sourceImageUrl,
      streamAudioUrl: DEMO_SONG_VARIANTS[idx].streamAudioUrl,
      sourceStreamAudioUrl: DEMO_SONG_VARIANTS[idx].sourceStreamAudioUrl,
      ...(status === 'DOWNLOAD_READY'
        ? { audioUrl: DEMO_SONG_VARIANTS[idx].audioUrl, sourceAudioUrl: DEMO_SONG_VARIANTS[idx].sourceAudioUrl }
        : { audioUrl: '', sourceAudioUrl: '' }),
      duration: DEMO_SONG_VARIANTS[idx].duration,
      modelName: DEMO_SONG_VARIANTS[idx].modelName,
      variantStatus: status,
    });

    // Phase 3: ≥10s — both variants DOWNLOAD_READY → mark completed
    if (elapsed >= DEMO_DOWNLOAD_READY_MS) {
      const completedVariants = [buildDemoVariant(0, 'DOWNLOAD_READY'), buildDemoVariant(1, 'DOWNLOAD_READY')];

      await db
        .update(templatedSongInstancesTable)
        .set({ status: 'completed', song_variants: completedVariants })
        .where(eq(templatedSongInstancesTable.id, instance.id));

      void completePartnerOrder(orderId, instance.slug, instance.song_title);

      return { ...instance, status: 'completed', song_variants: completedVariants };
    }

    // Phase 2: ≥5s — first variant STREAM_READY (playable, not downloadable)
    if (elapsed >= DEMO_STREAM_READY_MS) {
      return { ...instance, status: 'processing', song_variants: [buildDemoVariant(0, 'STREAM_READY')] };
    }

    // Phase 1: <5s — still processing, no variants yet
    return instance;
  }

  // ── Real Suno polling ──────────────────────────────────────────────────────
  const sunoAPI = SunoAPIFactory.getAPI();
  const recordInfo = await sunoAPI.getRecordInfo(taskId).catch(() => null);
  if (!recordInfo || recordInfo.code !== 200) return instance;

  const normalized = normalizeSunoStatus(recordInfo.data.status);
  const mappedStatus: 'completed' | 'failed' | 'processing' =
    recordInfo.data.errorCode
      ? 'failed'
      : normalized === 'completed'
        ? 'completed'
        : normalized === 'failed'
          ? 'failed'
          : 'processing';

  const sunoSongs: unknown[] = (recordInfo.data.response?.sunoData ?? []).filter(Boolean);
  const variants = (sunoSongs as any[]).map((s) => normalizeSunoVariantToStored(s));

  if (mappedStatus === 'completed' && variants.length > 0) {
    await db
      .update(templatedSongInstancesTable)
      .set({ status: 'completed', song_variants: variants, updated_at: new Date() } as any)
      .where(eq(templatedSongInstancesTable.id, instance.id));

    void completePartnerOrder(orderId, instance.slug, instance.song_title);

    return { ...instance, status: 'completed', song_variants: variants };
  }

  if (mappedStatus === 'failed') {
    const failMsg =
      recordInfo.data.errorMessage || recordInfo.msg || 'Song generation failed';
    await db
      .update(templatedSongInstancesTable)
      .set({
        status: 'failed',
        metadata: {
          ...((instance.metadata as Record<string, unknown>) ?? {}),
          error: failMsg,
        },
        updated_at: new Date(),
      } as any)
      .where(eq(templatedSongInstancesTable.id, instance.id));

    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'failed', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId));

    void notifyPartnerOrderFailedByOrderId(orderId, failMsg, logger);

    void maybeNotifyOpsTemplatedInstanceFailed({
      instanceId: instance.id,
      slug: instance.slug,
      taskId,
      errorMessage: failMsg,
      partnerApiOrderId: instance.partner_api_order_id ?? orderId,
      source: 'vendor-order-poll-templated',
    });

    return { ...instance, status: 'failed' };
  }

  return { ...instance, song_variants: variants.length > 0 ? variants : instance.song_variants };
}

async function completePartnerOrder(orderId: number, instanceSlug: string, songTitle: string) {
  void completeTemplatedOrderAndNotify({
    orderId,
    instanceSlug,
    songTitle,
    logger,
    errorMessage: 'Vendor order: templated completion notification failed',
  });
}

/**
 * Actively checks Suno status for a custom song order's user_song.
 * Mirrors the logic from /api/song-status/[songId] — polls Suno, updates
 * user_song + song_request + partner order on completion/failure.
 */
async function pollAndUpdateCustomSong(
  userSong: {
    id: number;
    slug: string;
    status: string | null;
    song_variants: unknown;
    metadata: unknown;
  },
  orderId: number,
  songRequestId: number,
): Promise<typeof userSong> {
  // Same field the song-generation-service stores the taskId in
  const taskId = (userSong.metadata as any)?.sunoTaskId as string | undefined;
  if (!taskId) return userSong;

  // Demo/sandbox mode — progressive status changes mirroring real Suno
  if (isDemoTaskId(taskId)) {
    const createdAtMs = getDemoTaskTimestamp(taskId) ?? Date.now();
    const elapsed = Date.now() - createdAtMs;

    const buildDemoVariant = (idx: number, status: 'STREAM_READY' | 'DOWNLOAD_READY') => ({
      id: DEMO_SONG_VARIANTS[idx].id,
      title: 'Demo Song',
      imageUrl: DEMO_SONG_VARIANTS[idx].imageUrl,
      sourceImageUrl: DEMO_SONG_VARIANTS[idx].sourceImageUrl,
      streamAudioUrl: DEMO_SONG_VARIANTS[idx].streamAudioUrl,
      sourceStreamAudioUrl: DEMO_SONG_VARIANTS[idx].sourceStreamAudioUrl,
      ...(status === 'DOWNLOAD_READY'
        ? { audioUrl: DEMO_SONG_VARIANTS[idx].audioUrl, sourceAudioUrl: DEMO_SONG_VARIANTS[idx].sourceAudioUrl }
        : { audioUrl: '', sourceAudioUrl: '' }),
      duration: DEMO_SONG_VARIANTS[idx].duration,
      modelName: DEMO_SONG_VARIANTS[idx].modelName,
      variantStatus: status,
    });

    // Phase 3: ≥10s — both variants DOWNLOAD_READY → mark completed
    if (elapsed >= DEMO_DOWNLOAD_READY_MS) {
      const completedVariants = [buildDemoVariant(0, 'DOWNLOAD_READY'), buildDemoVariant(1, 'DOWNLOAD_READY')];

      await db
        .update(userSongsTable)
        .set({ status: 'completed', song_variants: completedVariants })
        .where(eq(userSongsTable.id, userSong.id));

      await db
        .update(songRequestsTable)
        .set({ status: 'completed' })
        .where(eq(songRequestsTable.id, songRequestId));

      const orderTransitioned = await completeCustomSongOrderAndNotify({
        orderId,
        songSlug: userSong.slug,
        variants: completedVariants,
        logger,
        errorMessage: 'Vendor order: custom song completion notification failed',
      });

      logger.info('Vendor order: custom song completed (demo)', { orderId, userSongId: userSong.id });
      logger.info('Vendor order: custom song completion notification status', {
        orderId,
        orderTransitioned,
      });

      return { ...userSong, status: 'completed', song_variants: completedVariants };
    }

    // Phase 2: ≥5s — first variant STREAM_READY (playable, not downloadable)
    if (elapsed >= DEMO_STREAM_READY_MS) {
      return { ...userSong, song_variants: [buildDemoVariant(0, 'STREAM_READY')] };
    }

    // Phase 1: <5s — still processing, no variants yet
    return userSong;
  }

  // Real Suno polling — same as /api/song-status
  const sunoAPI = SunoAPIFactory.getAPI();
  const recordInfo = await sunoAPI.getRecordInfo(taskId).catch(() => null);
  if (!recordInfo || recordInfo.code !== 200) return userSong;

  const normalized = normalizeSunoStatus(recordInfo.data.status);
  const mappedStatus: 'completed' | 'failed' | 'processing' =
    recordInfo.data.errorCode
      ? 'failed'
      : normalized === 'completed'
        ? 'completed'
        : normalized === 'failed'
          ? 'failed'
          : 'processing';

  const sunoSongs: unknown[] = (recordInfo.data.response?.sunoData ?? []).filter(Boolean);
  const variants = (sunoSongs as any[]).map((s) => normalizeSunoVariantToStored(s));

  if (mappedStatus === 'completed') {
    if (!variants.length) {
      // Status says completed but no songs — timing issue, keep polling
      return userSong;
    }

    await db
      .update(userSongsTable)
      .set({ status: 'completed', song_variants: variants })
      .where(eq(userSongsTable.id, userSong.id));

    await db
      .update(songRequestsTable)
      .set({ status: 'completed' })
      .where(eq(songRequestsTable.id, songRequestId));

    const orderTransitioned = await completeCustomSongOrderAndNotify({
      orderId,
      songSlug: userSong.slug,
      variants,
      logger,
      errorMessage: 'Vendor order: custom song completion notification failed',
    });

    logger.info('Vendor order: custom song completed via active polling', {
      orderId,
      userSongId: userSong.id,
      orderTransitioned,
    });

    return { ...userSong, status: 'completed', song_variants: variants };
  }

  if (mappedStatus === 'failed') {
    const failMsg =
      recordInfo.data.errorMessage || recordInfo.msg || 'Song generation failed';
    await db
      .update(userSongsTable)
      .set({
        status: 'failed',
        metadata: { ...(userSong.metadata as any), error: failMsg },
      })
      .where(eq(userSongsTable.id, userSong.id));

    await db
      .update(songRequestsTable)
      .set({ status: 'failed' })
      .where(eq(songRequestsTable.id, songRequestId));

    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'failed', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId));

    void maybeNotifyOpsUserSongGenerationFailed({
      userSongId: userSong.id,
      songRequestId,
      taskId,
      errorMessage: failMsg,
      source: 'vendor-order-poll-custom-song',
    });

    return { ...userSong, status: 'failed' };
  }

  // Still processing — return partial variants if available
  if (variants.length > 0) {
    return { ...userSong, song_variants: variants };
  }

  return userSong;
}

// Auto-fail orders stuck in transient states for longer than this
const STUCK_ORDER_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

const STUCK_STATUSES = new Set([
  'form_submitted',
  'lyrics_generation_inprogress',
]);

async function handler(
  _req: NextRequest,
  { params }: { params: Promise<{ orderToken: string }> },
) {
  const { orderToken } = await params;

  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order, vendor } = resolved;

  // Auto-fail customer_custom_song orders stuck in transient states
  if (
    order.product_type === 'customer_custom_song' &&
    STUCK_STATUSES.has(order.status) &&
    order.updated_at
  ) {
    const elapsed = Date.now() - new Date(order.updated_at).getTime();
    if (elapsed > STUCK_ORDER_TIMEOUT_MS) {
      logger.warn('Vendor order: auto-failing stuck order', {
        orderId: order.id,
        status: order.status,
        elapsedMs: elapsed,
      });
      await db
        .update(partnerApiOrdersTable)
        .set({ status: 'failed', updated_at: new Date() })
        .where(eq(partnerApiOrdersTable.id, order.id));
      order.status = 'failed';
    }
  }

  let songRequest = null;
  let activeDrafts: (typeof lyricsDraftsTable.$inferSelect)[] = [];
  let userSong = null;
  let variationsRemaining = 0;
  let variationSongs: Array<{ slug: string; status: string | null; song_variants: unknown }> = [];
  let templatedInstance = null;

  // For customer_templated_song orders, fetch the linked templated instance
  if (order.product_type === 'customer_templated_song') {
    const instances = await db
      .select({
        id: templatedSongInstancesTable.id,
        slug: templatedSongInstancesTable.slug,
        status: templatedSongInstancesTable.status,
        song_title: templatedSongInstancesTable.song_title,
        recipient_name: templatedSongInstancesTable.recipient_name,
        replaced_lyrics: templatedSongInstancesTable.replaced_lyrics,
        song_variants: templatedSongInstancesTable.song_variants,
        suno_task_id: templatedSongInstancesTable.suno_task_id,
        partner_api_order_id: templatedSongInstancesTable.partner_api_order_id,
        created_at: templatedSongInstancesTable.created_at,
        metadata: templatedSongInstancesTable.metadata,
      })
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.partner_api_order_id, order.id))
      .orderBy(desc(templatedSongInstancesTable.id))
      .limit(1);
    templatedInstance = instances[0] ?? null;

    // Actively poll Suno status on each client poll when instance is still processing.
    // This drives completion without relying on the Suno webhook (handles demo mode + dev).
    if (
      templatedInstance &&
      order.status === 'song_generation_inprogress' &&
      templatedInstance.status !== 'completed' &&
      templatedInstance.status !== 'failed'
    ) {
      templatedInstance = await pollAndUpdateTemplatedInstance(templatedInstance, order.id);
    }
  }

  if (order.song_request_id) {
    const songRequests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, order.song_request_id))
      .limit(1);
    songRequest = songRequests[0] ?? null;

    if (songRequest) {
      // Get all non-archived lyrics drafts ordered newest-first
      const drafts = await db
        .select()
        .from(lyricsDraftsTable)
        .where(eq(lyricsDraftsTable.song_request_id, songRequest.id))
        .orderBy(desc(lyricsDraftsTable.version))
        .limit(10);

      activeDrafts = drafts.filter((d) => d.status !== 'archived');

      // Check for generated song
      const songs = await db
        .select({
          id: userSongsTable.id,
          slug: userSongsTable.slug,
          status: userSongsTable.status,
          song_variants: userSongsTable.song_variants,
          metadata: userSongsTable.metadata,
        })
        .from(userSongsTable)
        .where(eq(userSongsTable.song_request_id, songRequest.id))
        .limit(1);
      userSong = songs[0] ?? null;

      // Actively poll Suno for customer_custom_song orders in song_generation_inprogress
      // Mirrors the /api/song-status/[songId] polling approach
      if (
        userSong &&
        order.product_type === 'customer_custom_song' &&
        order.status === 'song_generation_inprogress' &&
        userSong.status !== 'completed' &&
        userSong.status !== 'failed'
      ) {
        userSong = await pollAndUpdateCustomSong(userSong, order.id, songRequest.id);
      }

      // Fetch variation requests and their songs (for completed custom song orders)
      if (order.product_type === 'customer_custom_song') {
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
            (songRequest as any).variations_used,
          );
        }

        // Fetch child variation requests and their user_songs
        const variationRequests = await db
          .select({ id: songRequestsTable.id })
          .from(songRequestsTable)
          .where(eq((songRequestsTable as any).parent_request_id, songRequest.id));

        if (variationRequests.length > 0) {
          const variationRequestIds = variationRequests.map((r) => r.id);
          for (const vrId of variationRequestIds) {
            const [vs] = await db
              .select({
                slug: userSongsTable.slug,
                status: userSongsTable.status,
                song_variants: userSongsTable.song_variants,
              })
              .from(userSongsTable)
              .where(eq(userSongsTable.song_request_id, vrId))
              .limit(1);
            if (vs) variationSongs.push(vs);
          }
        }
      }
    }
  }

  const mapDraft = (d: (typeof activeDrafts)[number]) => ({
    id: d.id,
    status: d.status,
    version: d.version,
    customer_lyrics: (d as any).customer_lyrics as string | null,
    song_title: d.song_title,
    music_style: d.music_style,
  });

  const effectiveOrderStatus = getEffectiveVendorOrderStatusForResponse({
    orderStatus: order.status,
    productType: order.product_type,
    templatedInstanceStatus: templatedInstance?.status,
    userSongStatus: userSong?.status,
  });

  return NextResponse.json({
    vendor: {
      name: vendor.name,
      slug: vendor.slug,
      logo_url: vendor.logo_url,
    },
    order: {
      id: order.id,
      external_order_id: order.external_order_id,
      status: effectiveOrderStatus,
      product_type: order.product_type,
      customer_name: order.customer_name,
      template_id: order.template_id,
      occasion: order.occasion,
      package_slug: order.package_slug,
      song_request_id: order.song_request_id,
      metadata: order.metadata,
    },
    song_request: songRequest
      ? {
        id: songRequest.id,
        status: songRequest.status,
        occasion: songRequest.occasion,
        languages: songRequest.languages,
        lyrics_edits_used: songRequest.lyrics_edits_used,
      }
      : null,
    variations_remaining: variationsRemaining,
    variations: variationSongs.map((vs) => ({
      slug: vs.slug,
      status: vs.status,
      song_variants: mapSongVariantsRecordForResponse(vs.song_variants),
    })),
    // All non-archived drafts, newest first — lets the client render version tabs
    lyrics_drafts: activeDrafts.map(mapDraft),
    user_song: userSong
      ? {
        id: userSong.id,
        slug: userSong.slug,
        status: userSong.status,
        song_variants: mapSongVariantsRecordForResponse(userSong.song_variants),
      }
      : null,
    templated_instance: templatedInstance
      ? {
        id: templatedInstance.id,
        slug: templatedInstance.slug,
        status: templatedInstance.status,
        song_title: templatedInstance.song_title,
        recipient_name: templatedInstance.recipient_name,
        replaced_lyrics: templatedInstance.replaced_lyrics,
        song_variants: mapSongVariantsRecordForResponse(templatedInstance.song_variants),
      }
      : null,
  });
}

export const GET = withRateLimit('vendor.order.state', handler);
