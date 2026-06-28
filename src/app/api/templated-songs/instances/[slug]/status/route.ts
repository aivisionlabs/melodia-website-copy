/**
 * Templated song instance status (public)
 * GET /api/templated-songs/instances/[slug]/status
 * Mirrors the user-song flow: actively checks Suno task status during polling,
 * persists variants/status, and returns a lightweight payload for the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templatedSongInstancesTable } from '@/lib/db/schema';
import { isDemoTaskId, DEMO_SONG_VARIANTS } from '@/lib/demo-mode';
import { eq } from 'drizzle-orm';
import { normalizeSunoVariantToStored } from '@/lib/utils/variant-utils';
import { normalizeSunoStatus, SunoAPIFactory } from '@/lib/suno-api';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { completeTemplatedOrderAndNotify } from '@/lib/vendor-order/notification-helpers';
import { mapSongVariantsRecordForResponse } from '@/lib/utils/url';
import { maybeNotifyOpsTemplatedInstanceFailed } from '@/lib/song-generation-failure-alerts';

async function handler(
  req: NextRequest,
  context: { logger: any; requestId?: string; params?: Promise<{ slug: string }> }
) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const logger = context.logger;
  const params = await (context.params ?? Promise.resolve({ slug: '' }));
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const instances = await db
      .select({
        id: templatedSongInstancesTable.id,
        slug: templatedSongInstancesTable.slug,
        status: templatedSongInstancesTable.status,
        suno_task_id: templatedSongInstancesTable.suno_task_id,
        song_variants: templatedSongInstancesTable.song_variants,
        song_title: templatedSongInstancesTable.song_title,
        recipient_name: templatedSongInstancesTable.recipient_name,
        partner_api_order_id: templatedSongInstancesTable.partner_api_order_id,
        metadata: templatedSongInstancesTable.metadata,
        created_at: templatedSongInstancesTable.created_at,
      })
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.slug, slug))
      .limit(1);

    if (instances.length === 0) {
      logger.warn('Templated song instance not found', { slug });
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const instance = instances[0];

    const taskIdRaw =
      (instance.suno_task_id && String(instance.suno_task_id).trim()) ||
      ((instance.metadata as any)?.sunoTaskId as string | undefined) ||
      null;

    // If already completed/failed, return current DB state (lightweight)
    if (instance.status === 'completed' || instance.status === 'failed') {
      return NextResponse.json({
        success: true,
        slug: instance.slug,
        status: instance.status,
        song_variants: mapSongVariantsRecordForResponse(instance.song_variants),
      });
    }

    // If we don't have a task id, we can't actively poll Suno
    if (!taskIdRaw) {
      logger.warn('Templated instance has no taskId for status polling', {
        slug,
        instanceId: instance.id,
      });
      return NextResponse.json({
        success: true,
        slug: instance.slug,
        status: instance.status ?? 'processing',
        song_variants: mapSongVariantsRecordForResponse(instance.song_variants),
      });
    }

    // Demo-mode parity with user-song flow: progressively return variants and persist completion.
    // (Only triggers when taskId starts with demo-task-)
    if (isDemoTaskId(taskIdRaw)) {
      const DEMO_V1_STREAM_MS = 1 * 1000; // 1s
      const DEMO_V1_DOWNLOAD_MS = 3 * 1000; // 3s
      const DEMO_V2_STREAM_MS = 2 * 1000; // 2s
      const DEMO_V2_DOWNLOAD_MS = 5 * 1000; // 5s
      const createdAtMs = new Date(instance.created_at as any).getTime();
      const elapsed = Date.now() - createdAtMs;

      const baseVariants = [
        { ...DEMO_SONG_VARIANTS[0], title: 'Demo templated song', streamThreshold: DEMO_V1_STREAM_MS, downloadThreshold: DEMO_V1_DOWNLOAD_MS },
        { ...DEMO_SONG_VARIANTS[1], title: 'Demo templated song', streamThreshold: DEMO_V2_STREAM_MS, downloadThreshold: DEMO_V2_DOWNLOAD_MS },
      ];

      const variantStates = baseVariants.map((v) => {
        if (elapsed < v.streamThreshold) {
          return {
            id: v.id,
            title: v.title,
            imageUrl: v.imageUrl,
            sourceImageUrl: v.sourceImageUrl,
            duration: v.duration,
            modelName: v.modelName,
            variantStatus: 'PENDING' as const,
          };
        }
        if (elapsed < v.downloadThreshold) {
          return {
            id: v.id,
            title: v.title,
            imageUrl: v.imageUrl,
            sourceImageUrl: v.sourceImageUrl,
            duration: v.duration,
            modelName: v.modelName,
            streamAudioUrl: v.streamAudioUrl,
            sourceStreamAudioUrl: v.sourceStreamAudioUrl,
            variantStatus: 'STREAM_READY' as const,
          };
        }
        return {
          id: v.id,
          title: v.title,
          imageUrl: v.imageUrl,
          sourceImageUrl: v.sourceImageUrl,
          duration: v.duration,
          modelName: v.modelName,
          streamAudioUrl: v.streamAudioUrl,
          sourceStreamAudioUrl: v.sourceStreamAudioUrl,
          audioUrl: v.audioUrl,
          sourceAudioUrl: v.sourceAudioUrl,
          variantStatus: 'DOWNLOAD_READY' as const,
        };
      });

      const allDone = elapsed >= DEMO_V2_DOWNLOAD_MS;
      if (allDone) {
        await db
          .update(templatedSongInstancesTable)
          .set({ status: 'completed', song_variants: variantStates })
          .where(eq(templatedSongInstancesTable.id, instance.id));

        // Complete partner order + notify channels (fire-and-forget)
        if (instance.partner_api_order_id) {
          void completeTemplatedOrderAndNotify({
            orderId: instance.partner_api_order_id,
            instanceSlug: instance.slug,
            songTitle: instance.song_title ?? '',
            logger,
            errorMessage: 'Demo: partner completion notification failed',
          });
        }

        return NextResponse.json({
          success: true,
          slug: instance.slug,
          status: 'completed',
          song_variants: mapSongVariantsRecordForResponse(variantStates),
        });
      }

      return NextResponse.json({
        success: true,
        slug: instance.slug,
        status: 'processing',
        song_variants: mapSongVariantsRecordForResponse(variantStates),
      });
    }

    // Non-demo: actively check Suno API task status (same as user flow)
    const sunoAPI = SunoAPIFactory.getAPI();
    const recordInfo = await sunoAPI.getRecordInfo(taskIdRaw);

    if (recordInfo.code !== 200) {
      logger.error('Suno record-info request failed for templated instance', {
        slug,
        instanceId: instance.id,
        taskId: taskIdRaw,
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

    const normalized = normalizeSunoStatus(recordInfo.data.status);
    const mappedStatus: 'completed' | 'failed' | 'processing' =
      recordInfo.data.errorCode
        ? 'failed'
        : normalized === 'completed'
          ? 'completed'
          : normalized === 'failed'
            ? 'failed'
            : 'processing';

    const sunoSongs: any[] = recordInfo.data.response?.sunoData?.filter(Boolean) ?? [];

    // Same normalizer as webhook and song-status for consistent storage
    const variants = sunoSongs.map((s: any) => normalizeSunoVariantToStored(s));

    if (mappedStatus === 'completed') {
      // If Suno says completed but there are no variants yet, keep processing (timing edge case)
      if (variants.length === 0) {
        return NextResponse.json({
          success: true,
          slug: instance.slug,
          status: 'processing',
          song_variants: mapSongVariantsRecordForResponse(instance.song_variants),
        });
      }

      const updatePayload = {
        status: 'completed' as const,
        song_variants: variants,
        updated_at: new Date(),
      };

      await db
        .update(templatedSongInstancesTable)
        .set(updatePayload)
        .where(eq(templatedSongInstancesTable.id, instance.id));

      logger.info('Templated instance marked completed via polling', {
        slug,
        instanceId: instance.id,
        variantCount: variants.length,
      });

      if (instance.partner_api_order_id) {
        void completeTemplatedOrderAndNotify({
          orderId: instance.partner_api_order_id,
          instanceSlug: instance.slug,
          songTitle: instance.song_title ?? '',
          logger,
          errorMessage: 'Poll status: partner completion notification failed',
        });
      }

      return NextResponse.json({
        success: true,
        slug: instance.slug,
        status: 'completed',
        song_variants: mapSongVariantsRecordForResponse(variants),
      });
    }

    if (mappedStatus === 'failed') {
      const failMsg = recordInfo.data.errorMessage || recordInfo.msg || 'Suno task failed';
      await db
        .update(templatedSongInstancesTable)
        .set({
          status: 'failed',
          metadata: {
            ...((instance.metadata as any) ?? {}),
            error: failMsg,
          },
        })
        .where(eq(templatedSongInstancesTable.id, instance.id));

      logger.warn('Templated instance marked failed via polling', {
        slug,
        instanceId: instance.id,
        error: failMsg,
      });

      void maybeNotifyOpsTemplatedInstanceFailed({
        instanceId: instance.id,
        slug: instance.slug,
        taskId: instance.suno_task_id,
        errorMessage: failMsg,
        partnerApiOrderId: instance.partner_api_order_id,
        source: 'templated-instance-status-poll',
      });

      return NextResponse.json({
        success: true,
        slug: instance.slug,
        status: 'failed',
        song_variants: mapSongVariantsRecordForResponse(variants),
      });
    }

    // Still processing: return progressive variants (do not necessarily persist on each poll)
    return NextResponse.json({
      success: true,
      slug: instance.slug,
      status: 'processing',
      song_variants: mapSongVariantsRecordForResponse(
        variants.length > 0 ? variants : instance.song_variants,
      ),
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-instance-status',
      requestId: context.requestId,
      additionalData: { slug },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('templated-songs-instance-status', handler);
