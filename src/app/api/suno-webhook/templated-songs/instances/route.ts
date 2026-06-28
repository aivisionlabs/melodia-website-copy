/**
 * Suno Webhook – Templated song instances only
 * POST /api/suno-webhook/templated-songs/instances
 *
 * Callback URL for when a consumer generates a song from a template (POST /api/templated-songs/generate).
 * Updates only templated_song_instances by task_id. Use this URL as callBackUrl when calling Suno
 * for instance generation so instance callbacks don't hit the main webhook.
 *
 * Same payload shape as main webhook; see https://docs.sunoapi.org/suno-api/generate-music-callbacks
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templatedSongInstancesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  normalizeSunoVariantToStored,
  mergeVariantsPreservingUrls,
  getVariantsList,
} from '@/lib/utils/variant-utils';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { completeTemplatedOrderAndNotify } from '@/lib/vendor-order/notification-helpers';
import { retryOrFailTemplatedInstance } from '@/lib/services/templated-song-retry';

interface SunoCallbackPayload {
  code: number;
  msg: string;
  data: {
    callbackType: 'text' | 'first' | 'complete' | 'error';
    task_id: string;
    data?: Array<Record<string, unknown>>;
  };
}

function mergeMetadata(existing: unknown, updates: Record<string, unknown>): Record<string, unknown> {
  const base =
    existing != null && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...updates };
}

async function handler(req: NextRequest, context: { logger: any }) {
  const logger = context.logger;

  try {
    const body: SunoCallbackPayload = await req.json();

    if (!body.data?.task_id) {
      logger.error('Templated-songs-instances webhook: invalid payload', {
        hasData: !!body.data,
        hasTaskId: !!body.data?.task_id,
      });
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
    }

    const { code, msg, data: callbackData } = body;
    const { task_id, callbackType, data: musicData } = callbackData;

    logger.info('Templated-songs-instances webhook received', {
      taskId: task_id,
      callbackType,
      code,
      musicDataLength: musicData?.length ?? 0,
    });

    const instances = await db
      .select()
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.suno_task_id, task_id))
      .limit(1);

    if (instances.length === 0) {
      logger.warn('Templated-songs-instances webhook: no instance for taskId', { taskId: task_id });
      return NextResponse.json({ status: 'received', message: 'Instance not found' });
    }

    const instance = instances[0];

    if (callbackType === 'error' || code !== 200) {
      logger.error('Templated-songs-instances webhook: task failed', {
        taskId: task_id,
        instanceId: instance.id,
        slug: instance.slug,
        code,
        message: msg,
      });

      // Update metadata with error details before handing off to the retry handler
      const updatedMetadata = mergeMetadata(instance.metadata, {
        error: msg,
        lastCallback: {
          type: callbackType,
          code,
          message: msg,
          timestamp: new Date().toISOString(),
        },
      });
      await db
        .update(templatedSongInstancesTable)
        .set({ metadata: updatedMetadata })
        .where(eq(templatedSongInstancesTable.id, instance.id));

      // Run retry/failure after response is sent so we don't block Suno's webhook delivery
      after(async () => {
        await retryOrFailTemplatedInstance({
          instance: { ...instance, metadata: updatedMetadata },
          errorMessage: msg || 'Suno callback error',
          source: 'suno-webhook-templated-instances',
          logger,
        });
      });

      return NextResponse.json({ status: 'received', message: 'Failure handled' });
    }

    if (!musicData || musicData.length === 0) {
      logger.warn('Templated-songs-instances webhook: no music data', { taskId: task_id });
      return NextResponse.json({ status: 'received' });
    }

    const incomingVariants = musicData.map((raw: any) => normalizeSunoVariantToStored(raw));
    const existingVariants = getVariantsList(instance.song_variants);
    const mergedVariants = mergeVariantsPreservingUrls(existingVariants, incomingVariants);

    const currentStatus = instance.status;
    const newStatus =
      callbackType === 'complete'
        ? 'completed'
        : callbackType === 'first' || callbackType === 'text'
          ? 'processing'
          : currentStatus;

    const updateData: Record<string, unknown> = {
      status: newStatus,
      song_variants: mergedVariants,
      metadata: mergeMetadata(instance.metadata, {
        lastCallback: { type: callbackType, code, timestamp: new Date().toISOString() },
      }),
    };

    await db
      .update(templatedSongInstancesTable)
      .set(updateData as any)
      .where(eq(templatedSongInstancesTable.id, instance.id));

    logger.info('Templated song instance updated from instances webhook', {
      taskId: task_id,
      instanceId: instance.id,
      slug: instance.slug,
      status: newStatus,
      variantCount: mergedVariants.length,
      callbackType,
    });

    // ── Partner API outbound webhook on completion ──────────────────
    if (instance.partner_api_order_id && newStatus === 'completed') {
      void completeTemplatedOrderAndNotify({
        orderId: instance.partner_api_order_id,
        instanceSlug: instance.slug,
        songTitle: instance.song_title,
        logger,
        errorMessage: 'Partner API: error processing completion notification',
      });
    }

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    logger.error('Templated-songs-instances webhook error', error);
    return NextResponse.json(
      { status: 'received', error: 'Internal error' },
      { status: 200 }
    );
  }
}

export const POST = withApiLogger('suno-webhook-templated-songs-instances', handler);
