/**
 * Templated song instance playback (public)
 * GET /api/templated-songs/instances/[slug]
 * Returns instance data for the player. Plain lyrics via replaced_lyrics; no timestamp/singalong lyrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  templatedSongInstancesTable,
  templatedSongsTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { SunoAPIFactory } from '@/lib/suno-api';
import { normalizeSunoVariantToStored } from '@/lib/utils/variant-utils';
import { mapSongVariantsRecordForResponse } from '@/lib/utils/url';

function getVariantBestImageUrl(v: any): string | null {
  if (!v || typeof v !== 'object') return null;
  return v.sourceImageUrl ?? v.imageUrl ?? null;
}

async function handler(
  req: NextRequest,
  context: { logger: any; requestId?: string; params?: Promise<{ slug: string }> }
) {
  if (req.method === 'GET') {
    return handleGet(req, context);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

async function handleGet(
  req: NextRequest,
  context: { logger: any; requestId?: string; params?: Promise<{ slug: string }> }
) {

  const logger = context.logger;
  const params = await (context.params ?? Promise.resolve({ slug: '' }));
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const instances = await db
      .select()
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.slug, slug))
      .limit(1);

    if (instances.length === 0) {
      logger.warn('Templated song instance not found', { slug });
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const instance = instances[0];

    const variantIndex = 0;

    // Repair: some existing records have empty image URLs due to inconsistent Suno casing.
    let songVariantsForPayload: unknown = instance.song_variants;
    try {
      const taskId = instance.suno_task_id?.trim();
      if (taskId) {
        const rawVariants =
          Array.isArray(instance.song_variants)
            ? instance.song_variants
            : instance.song_variants && typeof instance.song_variants === 'object'
              ? Object.values(instance.song_variants as any).filter(Boolean)
              : [];
        const selected = rawVariants[variantIndex] ?? rawVariants[0];
        const existingBestImage = getVariantBestImageUrl(selected);

        if (!existingBestImage && rawVariants.length > 0) {
          context.logger.info('Repairing missing variant images via Suno record-info', {
            slug,
            instanceId: instance.id,
            taskId,
            variantCount: rawVariants.length,
          });

          const sunoAPI = SunoAPIFactory.getAPI();
          const recordInfo = await sunoAPI.getRecordInfo(taskId);
          if (recordInfo.code === 200) {
            const sunoSongs: any[] =
              recordInfo.data?.response?.sunoData?.filter(Boolean) ?? [];
            const normalizedSong = sunoSongs.map((s: any) => normalizeSunoVariantToStored(s));

            const normalizedSongSelected = normalizedSong[variantIndex] ?? normalizedSong[0];
            const normalizedSongBestImage = getVariantBestImageUrl(normalizedSongSelected);
            if (normalizedSong.length > 0 && normalizedSongBestImage) {
              await db
                .update(templatedSongInstancesTable)
                .set({
                  song_variants: normalizedSong as any,
                  updated_at: new Date(),
                })
                .where(eq(templatedSongInstancesTable.id, instance.id));

              songVariantsForPayload = normalizedSong;
              logger.info('normalizedSong templated instance variants with image URLs', {
                slug,
                instanceId: instance.id,
                variantCount: normalizedSong.length,
              });
            } else {
              logger.warn('Suno record-info returned variants but no image URLs present', {
                slug,
                instanceId: instance.id,
                taskId,
                sunoVariantCount: normalizedSong.length,
              });
            }
          } else {
            logger.warn('Suno record-info failed during variant image repair', {
              slug,
              instanceId: instance.id,
              taskId,
              code: recordInfo.code,
              msg: recordInfo.msg,
            });
          }
        }
      }
    } catch (e) {
      logger.warn('Variant image repair attempt failed (non-blocking)', {
        slug,
        instanceId: instance.id,
        error: e instanceof Error ? e.message : e,
      });
    }

    const templateRows = await db
      .select({
        song_variants: templatedSongsTable.song_variants,
        selected_variant: templatedSongsTable.selected_variant,
      })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, instance.template_id))
      .limit(1);

    const templateSongVariants = templateRows[0]?.song_variants;
    const templateSelectedVariant = templateRows[0]?.selected_variant ?? 0;

    try {
      const rawVariants =
        Array.isArray(songVariantsForPayload)
          ? (songVariantsForPayload as any[])
          : songVariantsForPayload && typeof songVariantsForPayload === 'object'
            ? Object.values(songVariantsForPayload as any).filter(Boolean)
            : [];
      const selected = rawVariants[variantIndex] ?? rawVariants[0];
      const existingBestImage = getVariantBestImageUrl(selected);

      if (!existingBestImage && rawVariants.length > 0 && templateSongVariants) {
        const templateVariants =
          Array.isArray(templateSongVariants)
            ? (templateSongVariants as any[])
            : templateSongVariants && typeof templateSongVariants === 'object'
              ? Object.values(templateSongVariants as any).filter(Boolean)
              : [];
        const templateSelected =
          templateVariants[variantIndex] ??
          templateVariants[templateSelectedVariant] ??
          templateVariants[0];
        const templateBestImage = getVariantBestImageUrl(templateSelected);

        if (templateBestImage) {
          const patched = rawVariants.map((v: any, i: number) => {
            const currentBest = getVariantBestImageUrl(v);
            if (currentBest) return v;
            const tpl = templateVariants[i] ?? templateSelected;
            const tplImg = getVariantBestImageUrl(tpl) ?? templateBestImage;
            return {
              ...v,
              sourceImageUrl: tplImg,
              imageUrl: tplImg,
            };
          });

          await db
            .update(templatedSongInstancesTable)
            .set({
              song_variants: patched as any,
              updated_at: new Date(),
            })
            .where(eq(templatedSongInstancesTable.id, instance.id));

          songVariantsForPayload = patched;

          logger.info('Applied template image fallback to templated instance variants', {
            slug,
            instanceId: instance.id,
            variantCount: patched.length,
          });
        } else {
          logger.warn('Template has no variant images to use as fallback', {
            slug,
            instanceId: instance.id,
            templateId: instance.template_id,
          });
        }
      }
    } catch (e) {
      logger.warn('Template image fallback failed (non-blocking)', {
        slug,
        instanceId: instance.id,
        error: e instanceof Error ? e.message : e,
      });
    }

    const payload = {
      success: true,
      id: instance.id,
      slug: instance.slug,
      status: instance.status,
      song_title: instance.song_title,
      recipient_name: instance.recipient_name,
      replaced_lyrics: instance.replaced_lyrics ?? null,
      song_variants: mapSongVariantsRecordForResponse(songVariantsForPayload),
      variant_timestamp_lyrics_processed: {},
      variant_timestamp_lyrics_api_response: {},
    };

    return NextResponse.json(payload);
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-instance-get',
      requestId: context.requestId,
      additionalData: { slug },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get instance' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('templated-songs-instance-get', handler);
