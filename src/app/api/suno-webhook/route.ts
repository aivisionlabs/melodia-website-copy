/**
 * Suno Webhook API
 * POST /api/suno-webhook
 * Receives callbacks from Suno API when music generation tasks complete
 *
 * Reference: https://docs.sunoapi.org/suno-api/generate-music-callbacks
 *
 * To test locally: when DEMO_MODE=true, POST to /api/demo/suno-webhook with
 * { taskId, callbackType? } to simulate a callback (taskId must exist in DB).
 */

import { db } from '@/lib/db';
import {
  partnerApiOrdersTable,
  partnerApiVendorsTable,
  songRequestsTable,
  songsTable,
  templatedSongInstancesTable,
  templatedSongsTable,
  userSongsTable,
  usersTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { failPartnerOrderIfLinked } from '@/lib/partner-api/fail-partner-order-if-linked';
import { completeCustomSongOrderAndNotify } from '@/lib/vendor-order/notification-helpers';
import { EmailFactory } from '@/lib/services/email/email-factory';
import { enrichAdminSongListingMetadata } from '@/lib/services/llm/llm-song-metadata';
import {
  maybeNotifyOpsTemplatedInstanceFailed,
  maybeNotifyOpsUserSongGenerationFailed,
} from '@/lib/song-generation-failure-alerts';
import { getVariantsList, mergeVariantsPreservingUrls, normalizeSunoVariantToStored } from '@/lib/utils/variant-utils';
import { and, eq, ne, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

interface SunoCallbackData {
  code: number;
  msg: string;
  data: {
    callbackType: 'text' | 'first' | 'complete' | 'error';
    task_id: string;
    data?: Array<{
      id: string;
      audio_url?: string;
      source_audio_url?: string;
      stream_audio_url?: string;
      source_stream_audio_url?: string;
      image_url?: string;
      source_image_url?: string;
      prompt?: string;
      model_name?: string;
      title?: string;
      tags?: string;
      createTime?: string;
      duration?: number;
    }>;
  };
}

/**
 * Find user_song by taskId stored in metadata.sunoTaskId
 */
async function findUserSongByTaskId(taskId: string) {
  const songs = await db
    .select()
    .from(userSongsTable)
    .where(
      sql`${userSongsTable.metadata}->>'sunoTaskId' = ${taskId} AND ${userSongsTable.metadata} IS NOT NULL`
    )
    .limit(1);

  return songs.length > 0 ? songs[0] : null;
}

/**
 * Find song from songs table (admin dashboard) by taskId stored in suno_task_id column
 */
async function findAdminSongByTaskId(taskId: string) {
  const songs = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.suno_task_id, taskId))
    .limit(1);

  return songs.length > 0 ? songs[0] : null;
}

/**
 * Find templated song instance by suno_task_id
 */
async function findTemplatedInstanceByTaskId(taskId: string) {
  const instances = await db
    .select()
    .from(templatedSongInstancesTable)
    .where(eq(templatedSongInstancesTable.suno_task_id, taskId))
    .limit(1);

  return instances.length > 0 ? instances[0] : null;
}

/**
 * Find templated song (template row) by suno_task_id (admin "Create Song" flow)
 */
async function findTemplatedSongByTaskId(taskId: string) {
  const templates = await db
    .select()
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.suno_task_id, taskId))
    .limit(1);

  return templates.length > 0 ? templates[0] : null;
}

/**
 * Merge updates into existing metadata without replacing the whole object.
 * Ensures existing keys are preserved and only specified keys are added/updated.
 */
function mergeMetadata(existing: unknown, updates: Record<string, unknown>): Record<string, unknown> {
  const base =
    existing != null && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...updates };
}

/**
 * Send email notification when song is ready
 */
async function sendSongReadyEmail(song: typeof userSongsTable.$inferSelect, songRequestId: number, logger: any) {
  try {
    logger.info('Preparing to send song ready email', {
      songId: song.id,
      songRequestId
    });

    const songRequest = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, songRequestId))
      .limit(1);

    if (songRequest.length === 0) {
      logger.warn('Song request not found for email notification', { songRequestId });
      return;
    }

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
        if (!recipientName) {
          recipientName = users[0].name || undefined;
        }
      }
    }

    // Send email if we have a recipient
    if (recipientEmail) {
      logger.info('Sending song ready email', {
        recipientEmail,
        recipientName,
        songTitle: (song.metadata as any)?.title || 'Your Song'
      });

      const emailProvider = EmailFactory.getProvider();
      await emailProvider.sendSongReadyNotification(
        recipientEmail,
        recipientName,
        (song.metadata as any)?.title || 'Your Song',
        song.id
      );

      logger.info('Song ready email sent successfully');
    } else {
      logger.warn('No email found for song ready notification', {
        songId: song.id,
        songRequestId
      });
    }
  } catch (error) {
    logger.error('Error sending song ready email', error);
    // Don't throw - email failure shouldn't break the webhook
  }
}

/**
 * If the completed song is linked to a customer_custom_song partner order,
 * advance the order to 'completed' and run completion notifications (no partner webhook).
 */
async function completePartnerOrderIfLinked(
  songRequestId: number,
  song: typeof userSongsTable.$inferSelect,
  variants: any[],
  logger: any,
) {
  try {
    const [songRequest] = await db
      .select({ partner_api_order_id: songRequestsTable.partner_api_order_id })
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, songRequestId))
      .limit(1);

    const partnerApiOrderId = (songRequest as { partner_api_order_id?: number | null })
      ?.partner_api_order_id;
    if (!partnerApiOrderId) return;

    const transitioned = await completeCustomSongOrderAndNotify({
      orderId: partnerApiOrderId,
      songSlug: song.slug,
      variants,
      logger,
      errorMessage: 'Failed to complete partner order after song completion',
    });

    if (transitioned) {
      logger.info('Partner order completed via Suno webhook', {
        orderId: partnerApiOrderId,
        songRequestId,
        songId: song.id,
      });
    }
  } catch (err) {
    logger.error('Failed to complete partner order after song completion', {
      songRequestId,
      error: String(err),
    });
  }
}

async function webhookHandler(req: NextRequest, { logger }: any) {
  try {
    const body: SunoCallbackData = await req.json();

    // Validate request structure
    if (!body.data || !body.data.task_id) {
      logger.error('Invalid callback structure received', {
        hasData: !!body.data,
        hasTaskId: !!(body.data?.task_id)
      });
      return NextResponse.json(
        { error: 'Invalid callback structure' },
        { status: 400 }
      );
    }

    const { code, msg, data: callbackData } = body;
    const { task_id, callbackType, data: musicData } = callbackData;

    logger.info('Suno webhook callback received', {
      taskId: task_id,
      callbackType,
      code,
      hasData: !!musicData,
      dataLength: musicData?.length || 0
    });

    // Find the song by taskId - check user_songs, songs table, and templated_song_instances
    let song = await findUserSongByTaskId(task_id);
    let isAdminSong = false;
    let templatedInstance: typeof templatedSongInstancesTable.$inferSelect | null = null;

    let adminSong: typeof songsTable.$inferSelect | null = null;
    if (!song) {
      adminSong = await findAdminSongByTaskId(task_id);
      if (adminSong) {
        isAdminSong = true;
        logger.info('Found admin song for webhook', {
          songId: adminSong.id,
          currentStatus: adminSong.status
        });
      }
    } else {
      logger.info('Found user song for webhook', {
        songId: song.id,
        songRequestId: song.song_request_id,
        currentStatus: song.status
      });
    }

    let templatedSong: typeof templatedSongsTable.$inferSelect | null = null;
    if (!song && !adminSong) {
      templatedInstance = await findTemplatedInstanceByTaskId(task_id);
      if (templatedInstance) {
        logger.info('Found templated song instance for webhook', {
          instanceId: templatedInstance.id,
          slug: templatedInstance.slug,
          currentStatus: templatedInstance.status
        });
      } else {
        templatedSong = await findTemplatedSongByTaskId(task_id);
        if (templatedSong) {
          logger.info('Found templated song (template) for webhook', {
            templateId: templatedSong.id,
            slug: templatedSong.slug
          });
        }
      }
    }

    if (!song && !adminSong && !templatedInstance && !templatedSong) {
      logger.warn('Song not found for taskId', { taskId: task_id });
      return NextResponse.json({ status: 'received', message: 'Song not found' });
    }

    // Handle different callback types
    if (callbackType === 'error' || code !== 200) {
      // Task failed
      logger.error('Suno task failed', {
        taskId: task_id,
        code,
        message: msg,
        callbackType,
        isAdminSong
      });

      if (isAdminSong && adminSong) {
        await db
          .update(songsTable)
          .set({
            status: 'failed',
            metadata: mergeMetadata(adminSong.metadata, {
              error: msg,
              lastCallback: {
                type: callbackType,
                code,
                message: msg,
                timestamp: new Date().toISOString(),
              },
            }),
          })
          .where(eq(songsTable.id, adminSong.id));
      } else if (templatedSong) {
        // Template creation failed - clear suno_task_id so admin can retry
        await db
          .update(templatedSongsTable)
          .set({ updated_at: new Date() })
          .where(eq(templatedSongsTable.id, templatedSong.id));
        logger.info('Templated song (template) creation failed', { templateId: templatedSong.id });
      } else if (templatedInstance) {
        await db
          .update(templatedSongInstancesTable)
          .set({
            status: 'failed',
            metadata: mergeMetadata(templatedInstance.metadata, {
              error: msg,
              lastCallback: {
                type: callbackType,
                code,
                message: msg,
                timestamp: new Date().toISOString(),
              },
            }),
          })
          .where(eq(templatedSongInstancesTable.id, templatedInstance.id));

        void maybeNotifyOpsTemplatedInstanceFailed({
          instanceId: templatedInstance.id,
          slug: templatedInstance.slug,
          taskId: task_id,
          errorMessage: msg || 'Suno callback error',
          partnerApiOrderId: templatedInstance.partner_api_order_id,
          source: 'suno-webhook',
        });
      } else if (song) {
        await db
          .update(userSongsTable)
          .set({
            status: 'failed',
            metadata: mergeMetadata(song.metadata, {
              error: msg,
              lastCallback: {
                type: callbackType,
                code,
                message: msg,
                timestamp: new Date().toISOString(),
              },
            }),
          })
          .where(eq(userSongsTable.id, song.id));

        if (song.song_request_id) {
          await db
            .update(songRequestsTable)
            .set({ status: 'failed' })
            .where(eq(songRequestsTable.id, song.song_request_id));
          await failPartnerOrderIfLinked(song.song_request_id, msg || 'Song generation failed', logger);
        }

        void maybeNotifyOpsUserSongGenerationFailed({
          userSongId: song.id,
          songRequestId: song.song_request_id,
          taskId: task_id,
          errorMessage: msg || 'Suno callback error',
          source: 'suno-webhook',
        });
      }

      logger.info('Marked song as failed in database');

      return NextResponse.json({ status: 'received', message: 'Failure handled' });
    }

    // Handle success callbacks (text, first, complete)
    if (musicData && musicData.length > 0) {
      logger.info('Processing music data from callback', {
        variantCount: musicData.length,
        callbackType
      });
      // Use same normalizer as polling (song-status, templated instance status) for consistent storage
      const incomingVariants = musicData.map((raw: any) => normalizeSunoVariantToStored(raw));

      // Get existing variants (same shape as polling reads)
      const existingVariants: any[] = isAdminSong && adminSong
        ? getVariantsList(adminSong.suno_variants)
        : templatedSong
          ? getVariantsList(templatedSong.song_variants)
          : templatedInstance
            ? getVariantsList(templatedInstance.song_variants)
            : song
              ? getVariantsList(song.song_variants)
              : [];

      // Merge with URL preservation so late/duplicate callbacks don't overwrite good data
      const mergedVariants = mergeVariantsPreservingUrls(existingVariants, incomingVariants);

      // Determine status based on callback type and table type (templated_songs has no status column)
      const currentStatus = isAdminSong && adminSong
        ? adminSong.status
        : templatedInstance
          ? templatedInstance.status
          : (song?.status || null);
      let newStatus = currentStatus;
      if (isAdminSong) {
        if (callbackType === 'complete') newStatus = 'completed';
        else if (callbackType === 'first' || callbackType === 'text') newStatus = 'generating';
      } else if (templatedSong) {
        newStatus = null; // templated_songs has no status column
      } else if (templatedInstance) {
        if (callbackType === 'complete') newStatus = 'completed';
        else if (callbackType === 'first' || callbackType === 'text') newStatus = 'processing';
      } else {
        if (callbackType === 'complete') newStatus = 'completed';
        else if (callbackType === 'first' || callbackType === 'text') newStatus = 'processing';
      }

      // Update song with variants
      const currentSelectedVariant = isAdminSong && adminSong
        ? adminSong.selected_variant
        : templatedSong
          ? templatedSong.selected_variant
          : null;

      if (isAdminSong && adminSong) {
        const updateData: any = {
          status: newStatus,
          metadata: mergeMetadata(adminSong.metadata, {
            lastCallback: { type: callbackType, code, timestamp: new Date().toISOString() },
          }),
          suno_variants: mergedVariants,
          ...(currentSelectedVariant === null && mergedVariants.length > 0 ? { selected_variant: 0 } : {}),
        };
        await db.update(songsTable).set(updateData).where(eq(songsTable.id, adminSong.id));
      } else if (templatedSong) {
        await db
          .update(templatedSongsTable)
          .set({
            song_variants: mergedVariants,
            selected_variant: currentSelectedVariant === null && mergedVariants.length > 0 ? 0 : (templatedSong.selected_variant ?? 0),
            updated_at: new Date(),
          })
          .where(eq(templatedSongsTable.id, templatedSong.id));
        logger.info('Templated song (template) variants stored', {
          taskId: task_id,
          templateId: templatedSong.id,
          variantCount: mergedVariants.length,
        });
      } else if (templatedInstance) {
        const updateData: any = {
          status: newStatus,
          song_variants: mergedVariants,
          metadata: mergeMetadata(templatedInstance.metadata, {
            lastCallback: { type: callbackType, code, timestamp: new Date().toISOString() },
          }),
        };
        await db
          .update(templatedSongInstancesTable)
          .set(updateData)
          .where(eq(templatedSongInstancesTable.id, templatedInstance.id));
      } else if (song) {
        const updateData: any = {
          status: newStatus,
          song_variants: mergedVariants,
          metadata: mergeMetadata(song.metadata, {
            lastCallback: { type: callbackType, code, timestamp: new Date().toISOString() },
          }),
        };
        await db.update(userSongsTable).set(updateData).where(eq(userSongsTable.id, song.id));
      }

      if (callbackType === 'complete') {
        if (isAdminSong && adminSong) {
          logger.info('Admin song generation completed, variants stored', {
            taskId: task_id,
            variantCount: mergedVariants.length,
            songId: adminSong.id,
            status: newStatus
          });
          try {
            await enrichAdminSongListingMetadata(adminSong.id);
          } catch (enrichErr) {
            logger.error('Admin song metadata enrichment failed', enrichErr instanceof Error ? enrichErr : new Error(String(enrichErr)));
          }
        } else if (templatedSong) {
          logger.info('Templated song (template) creation completed', {
            taskId: task_id,
            templateId: templatedSong.id,
            variantCount: mergedVariants.length
          });
        } else if (templatedInstance) {
          logger.info('Templated song instance completed', {
            taskId: task_id,
            variantCount: mergedVariants.length,
            instanceId: templatedInstance.id,
            slug: templatedInstance.slug
          });
        } else if (song) {
          logger.info('Song generation completed, updating status');

          if (song.song_request_id) {
            await db
              .update(songRequestsTable)
              .set({ status: 'completed' })
              .where(eq(songRequestsTable.id, song.song_request_id));

            // Check if this song request was initiated by a partner API order (customer_custom_song)
            // and advance the order status + fire the partner webhook
            await completePartnerOrderIfLinked(song.song_request_id, song, mergedVariants, logger);
          }

          await sendSongReadyEmail(song, song.song_request_id, logger);

          logger.info('Task completed successfully', {
            taskId: task_id,
            variantCount: mergedVariants.length,
            songId: song.id
          });
        }
      } else {
        logger.info('Task progress callback received', {
          taskId: task_id,
          callbackType,
          variantCount: mergedVariants.length,
          isAdminSong
        });
      }
    } else {
      // Callback received but no music data (shouldn't happen for success, but handle gracefully)
      logger.warn('Callback received without music data', {
        taskId: task_id,
        callbackType
      });
    }

    // Always return 200 to acknowledge receipt
    logger.info('Webhook processed successfully');
    return NextResponse.json({ status: 'received' });
  } catch (error) {
    logger.error('Error processing Suno webhook callback', error);

    // Return 200 to prevent Suno from retrying on our errors
    // (we'll handle retries internally if needed)
    return NextResponse.json(
      { status: 'received', error: 'Internal error' },
      { status: 200 }
    );
  }
}

// Apply logging middleware (handler exported for demo test route)
export { webhookHandler };
export const POST = withApiLogger('suno-webhook', webhookHandler);


