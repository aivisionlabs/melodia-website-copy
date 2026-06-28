import { db } from '@/lib/db';
import {
  templatedSongInstancesTable,
  templatedSongsTable,
  personasTable,
  partnerApiOrdersTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from '@/lib/utils/url';
import { replacePlaceholderWithName } from '@/lib/templated-songs-utils';
import { convertNameToScript } from '@/lib/services/llm/llm-name-to-script';
import { SunoAPIFactory } from '@/lib/suno-api';
import { maybeNotifyOpsTemplatedInstanceFailed } from '@/lib/song-generation-failure-alerts';
import { notifyPartnerOrderFailedByOrderId } from '@/lib/vendor-order/notification-helpers';
import { isDemoTaskId } from '@/lib/demo-mode';

export const MAX_INSTANCE_RETRIES = 2;

type SimpleLogger = {
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
};

export type RetryableInstance = {
  id: number;
  slug: string;
  suno_task_id?: string | null;
  template_id: number;
  recipient_name: string;
  partner_api_order_id?: number | null;
  metadata?: unknown;
};

function getRetryCount(metadata: unknown): number {
  if (metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const v = (metadata as Record<string, unknown>).retry_count;
    return typeof v === 'number' ? v : 0;
  }
  return 0;
}

function mergeMetadata(existing: unknown, updates: Record<string, unknown>): Record<string, unknown> {
  const base =
    existing != null && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...updates };
}

/**
 * Called when a vendor-linked templated song instance has failed.
 *
 * If retry_count < MAX_INSTANCE_RETRIES, resubmits to Suno with the same params and
 * resets the instance + partner order back to in-progress.
 * If retries are exhausted, marks both as failed and sends the ops notification.
 *
 * Returns 'retried' if a new Suno task was queued, 'failed' if retries are exhausted.
 * Safe to call from the Suno webhook handler (via after()) and from active polling.
 */
export async function retryOrFailTemplatedInstance({
  instance,
  errorMessage,
  source,
  logger: log,
}: {
  instance: RetryableInstance;
  errorMessage: string;
  source: string;
  logger?: SimpleLogger;
}): Promise<'retried' | 'failed'> {
  // Sandbox/demo instances never receive real Suno callbacks — skip retry
  if (isDemoTaskId(instance.suno_task_id ?? '')) {
    return 'failed';
  }

  const retryCount = getRetryCount(instance.metadata);

  if (retryCount < MAX_INSTANCE_RETRIES) {
    const nextRetryCount = retryCount + 1;
    log?.info('Retrying failed templated song instance', {
      instanceId: instance.id,
      slug: instance.slug,
      attempt: nextRetryCount,
      maxRetries: MAX_INSTANCE_RETRIES,
      source,
    });

    try {
      const templates = await db
        .select()
        .from(templatedSongsTable)
        .where(eq(templatedSongsTable.id, instance.template_id))
        .limit(1);

      if (!templates[0]?.template_lyrics || !templates[0]?.persona_id) {
        throw new Error('Template missing lyrics or persona_id — cannot retry');
      }
      const template = templates[0];

      const personas = await db
        .select({ suno_persona_id: personasTable.suno_persona_id })
        .from(personasTable)
        .where(eq(personasTable.id, template.persona_id!))
        .limit(1);

      if (!personas[0]?.suno_persona_id) {
        throw new Error('Persona suno_persona_id not found — cannot retry');
      }

      // Use name_in_script stored on first generation to skip the LLM call on retry.
      const meta = (instance.metadata ?? {}) as Record<string, unknown>;
      const nameInScript =
        typeof meta.name_in_script === 'string'
          ? meta.name_in_script
          : await convertNameToScript(instance.recipient_name, template.template_lyrics!);

      const replacedLyricsForSuno = replacePlaceholderWithName(template.template_lyrics!, nameInScript);
      const songTitleForSuno =
        replacePlaceholderWithName(
          template.template_title ?? template.title ?? '',
          nameInScript,
        ).trim() || `${template.title ?? template.title} for ${instance.recipient_name}`;

      const baseUrl = await getBaseUrl();
      const callbackUrl = `${baseUrl}/api/suno-webhook/templated-songs/instances`;

      const sunoAPI = SunoAPIFactory.getAPI();
      const sunoResponse = await sunoAPI.generateSong({
        title: songTitleForSuno,
        prompt: replacedLyricsForSuno,
        callBackUrl: callbackUrl,
        personaId: personas[0].suno_persona_id,
      });

      if (sunoResponse.code !== 200 || !sunoResponse.data?.taskId) {
        throw new Error(sunoResponse.msg || 'Suno retry submission failed');
      }

      const newTaskId = sunoResponse.data.taskId.trim();

      await db
        .update(templatedSongInstancesTable)
        .set({
          suno_task_id: newTaskId,
          status: 'processing',
          updated_at: new Date(),
          metadata: mergeMetadata(instance.metadata, {
            retry_count: nextRetryCount,
            last_retry_at: new Date().toISOString(),
            last_error: errorMessage,
            sunoTaskId: newTaskId,
          }),
        } as any)
        .where(eq(templatedSongInstancesTable.id, instance.id));

      if (instance.partner_api_order_id) {
        await db
          .update(partnerApiOrdersTable)
          .set({ status: 'song_generation_inprogress', updated_at: new Date() })
          .where(eq(partnerApiOrdersTable.id, instance.partner_api_order_id));
      }

      log?.info('Templated instance retry submitted to Suno', {
        instanceId: instance.id,
        slug: instance.slug,
        newTaskId,
        attempt: nextRetryCount,
      });

      return 'retried';
    } catch (retryErr) {
      log?.error('Templated instance retry submission failed — exhausting retries', {
        instanceId: instance.id,
        slug: instance.slug,
        attempt: nextRetryCount,
        error: String(retryErr),
      });
      // Fall through to final failure handling
    }
  }

  // Retries exhausted (or the retry submission itself threw)
  await db
    .update(templatedSongInstancesTable)
    .set({
      status: 'failed',
      updated_at: new Date(),
      metadata: mergeMetadata(instance.metadata, {
        retry_count: retryCount,
        last_error: errorMessage,
      }),
    } as any)
    .where(eq(templatedSongInstancesTable.id, instance.id));

  if (instance.partner_api_order_id) {
    try {
      const orders = await db
        .select()
        .from(partnerApiOrdersTable)
        .where(eq(partnerApiOrdersTable.id, instance.partner_api_order_id))
        .limit(1);
      if (orders[0]) {
        await db
          .update(partnerApiOrdersTable)
          .set({
            status: 'failed',
            completed_at: new Date(),
            updated_at: new Date(),
            metadata: mergeMetadata(orders[0].metadata, { error: errorMessage }),
          })
          .where(eq(partnerApiOrdersTable.id, instance.partner_api_order_id));

        void notifyPartnerOrderFailedByOrderId(
          instance.partner_api_order_id,
          errorMessage,
          log ?? { error: () => {} },
        );
      }
    } catch (e) {
      log?.error('Partner order failure update error (non-blocking)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  void maybeNotifyOpsTemplatedInstanceFailed({
    instanceId: instance.id,
    slug: instance.slug,
    taskId: instance.suno_task_id ?? null,
    errorMessage,
    partnerApiOrderId: instance.partner_api_order_id ?? null,
    source,
  });

  return 'failed';
}
