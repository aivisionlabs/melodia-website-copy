/**
 * Suno Webhook – Templated songs only
 * POST /api/suno-webhook/templated-songs
 *
 * Callback URL used when creating a template song via admin (create-song).
 * Updates only templated_songs rows by task_id. Use this URL as callBackUrl
 * when calling Suno for template generation so template callbacks don't hit the main webhook.
 *
 * Same payload shape as main webhook; see https://docs.sunoapi.org/suno-api/generate-music-callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templatedSongsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  normalizeSunoVariantToStored,
  mergeVariantsPreservingUrls,
  getVariantsList,
} from '@/lib/utils/variant-utils';
import { withApiLogger } from '@/lib/logger/api-middleware';

interface SunoCallbackPayload {
  code: number;
  msg: string;
  data: {
    callbackType: 'text' | 'first' | 'complete' | 'error';
    task_id: string;
    data?: Array<Record<string, unknown>>;
  };
}

async function handler(req: NextRequest, context: { logger: any }) {
  const logger = context.logger;

  try {
    const body: SunoCallbackPayload = await req.json();

    if (!body.data?.task_id) {
      logger.error('Templated-songs webhook: invalid payload', {
        hasData: !!body.data,
        hasTaskId: !!body.data?.task_id,
      });
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
    }

    const { code, msg, data: callbackData } = body;
    const { task_id, callbackType, data: musicData } = callbackData;

    logger.info('Templated-songs webhook received', {
      taskId: task_id,
      callbackType,
      code,
      musicDataLength: musicData?.length ?? 0,
    });

    const templates = await db
      .select()
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.suno_task_id, task_id))
      .limit(1);

    if (templates.length === 0) {
      logger.warn('Templated-songs webhook: no template for taskId', { taskId: task_id });
      return NextResponse.json({ status: 'received', message: 'Template not found' });
    }

    const template = templates[0];

    if (callbackType === 'error' || code !== 200) {
      logger.error('Templated-songs webhook: task failed', {
        taskId: task_id,
        templateId: template.id,
        code,
        message: msg,
      });
      await db
        .update(templatedSongsTable)
        .set({ updated_at: new Date() })
        .where(eq(templatedSongsTable.id, template.id));
      return NextResponse.json({ status: 'received', message: 'Failure handled' });
    }

    if (!musicData || musicData.length === 0) {
      logger.warn('Templated-songs webhook: no music data', { taskId: task_id });
      return NextResponse.json({ status: 'received' });
    }

    const incomingVariants = musicData.map((raw: any) => normalizeSunoVariantToStored(raw));
    const existingVariants = getVariantsList(template.song_variants);
    const mergedVariants = mergeVariantsPreservingUrls(existingVariants, incomingVariants);

    const currentSelectedVariant = template.selected_variant;

    await db
      .update(templatedSongsTable)
      .set({
        song_variants: mergedVariants,
        selected_variant:
          currentSelectedVariant === null && mergedVariants.length > 0 ? 0 : (template.selected_variant ?? 0),
        updated_at: new Date(),
      })
      .where(eq(templatedSongsTable.id, template.id));

    logger.info('Templated song (template) updated from webhook', {
      taskId: task_id,
      templateId: template.id,
      slug: template.slug,
      variantCount: mergedVariants.length,
      callbackType,
    });

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    logger.error('Templated-songs webhook error', error);
    return NextResponse.json(
      { status: 'received', error: 'Internal error' },
      { status: 200 }
    );
  }
}

export const POST = withApiLogger('suno-webhook-templated-songs', handler);
