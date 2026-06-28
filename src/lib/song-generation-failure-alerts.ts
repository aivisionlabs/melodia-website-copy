/**
 * One-time ops email to info@melodia-songs.com when Suno generation fails for user songs
 * or templated instances (consumer or vendor). Deduped via metadata.ops_failure_notified_at.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { songRequestsTable, templatedSongInstancesTable, userSongsTable } from '@/lib/db/schema';
import { EmailFactory } from '@/lib/services/email/email-factory';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';

export const OPS_SONG_FAILURE_ALERT_EMAIL = 'info@melodia-songs.com';
export const OPS_FAILURE_NOTIFIED_KEY = 'ops_failure_notified_at';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mergeMetadata(existing: unknown, updates: Record<string, unknown>): Record<string, unknown> {
  const base =
    existing != null && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...updates };
}

export async function maybeNotifyOpsUserSongGenerationFailed(params: {
  userSongId: number;
  songRequestId: number;
  taskId: string | null | undefined;
  errorMessage: string;
  source?: string;
}): Promise<void> {
  if (isDemoModeEnabled() || process.env.EMAIL_DEMO === 'true') {
    logger.debug('Ops user-song failure email skipped (demo)', { userSongId: params.userSongId });
    return;
  }

  try {
    const rows = await db.select().from(userSongsTable).where(eq(userSongsTable.id, params.userSongId)).limit(1);
    if (!rows[0]) return;

    const meta = (rows[0].metadata as Record<string, unknown>) ?? {};
    if (meta[OPS_FAILURE_NOTIFIED_KEY]) return;

    const [sr] = await db
      .select({ partner_api_order_id: songRequestsTable.partner_api_order_id })
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, params.songRequestId))
      .limit(1);

    const partnerOrderId = sr?.partner_api_order_id ?? null;
    const segment =
      partnerOrderId != null
        ? `Vendor / partner custom song (partner order id ${partnerOrderId})`
        : 'Consumer user song';

    const html = `<p><strong>Suno generation failed</strong> — ${escapeHtml(segment)}.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
<tr><td style="padding:4px 12px 4px 0;"><strong>User song id</strong></td><td>${params.userSongId}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Song request id</strong></td><td>${params.songRequestId}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Task id</strong></td><td>${escapeHtml(params.taskId ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Source</strong></td><td>${escapeHtml(params.source ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Error</strong></td><td>${escapeHtml(params.errorMessage || 'Unknown')}</td></tr>
</table>
<p style="margin-top:12px;font-size:13px;color:#555;">Retry from the admin dashboard → <strong>User Generated Songs</strong> → <strong>Retry generation</strong> (failed songs only).</p>`;

    const provider = EmailFactory.getProvider();
    const result = await provider.sendInternalNotification(
      OPS_SONG_FAILURE_ALERT_EMAIL,
      `[Melodia] Song generation failed — user song #${params.userSongId}`,
      html,
    );

    if (!result.success) {
      logger.error('Ops user-song failure alert email failed', {
        userSongId: params.userSongId,
        error: result.error,
      });
      return;
    }

    await db
      .update(userSongsTable)
      .set({
        metadata: mergeMetadata(rows[0].metadata, {
          [OPS_FAILURE_NOTIFIED_KEY]: new Date().toISOString(),
        }) as any,
      })
      .where(eq(userSongsTable.id, params.userSongId));
  } catch (e) {
    logger.error('maybeNotifyOpsUserSongGenerationFailed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function maybeNotifyOpsTemplatedInstanceFailed(params: {
  instanceId: number;
  slug: string | null | undefined;
  taskId: string | null | undefined;
  errorMessage: string;
  partnerApiOrderId?: number | null;
  source?: string;
}): Promise<void> {
  if (isDemoModeEnabled() || process.env.EMAIL_DEMO === 'true') {
    logger.debug('Ops templated instance failure email skipped (demo)', { instanceId: params.instanceId });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(templatedSongInstancesTable)
      .where(eq(templatedSongInstancesTable.id, params.instanceId))
      .limit(1);
    if (!rows[0]) return;

    const meta = (rows[0].metadata as Record<string, unknown>) ?? {};
    if (meta[OPS_FAILURE_NOTIFIED_KEY]) return;

    const segment =
      params.partnerApiOrderId != null
        ? `Vendor templated instance (partner order id ${params.partnerApiOrderId})`
        : 'Consumer templated instance';

    const html = `<p><strong>Suno generation failed</strong> — ${escapeHtml(segment)}.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
<tr><td style="padding:4px 12px 4px 0;"><strong>Instance id</strong></td><td>${params.instanceId}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Slug</strong></td><td>${escapeHtml(params.slug ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Task id</strong></td><td>${escapeHtml(params.taskId ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Source</strong></td><td>${escapeHtml(params.source ?? '—')}</td></tr>
<tr><td style="padding:4px 12px 4px 0;"><strong>Error</strong></td><td>${escapeHtml(params.errorMessage || 'Unknown')}</td></tr>
</table>
<p style="margin-top:12px;font-size:13px;color:#555;">If this order is vendor-linked, follow up in the admin / partner tools as needed.</p>`;

    const provider = EmailFactory.getProvider();
    const result = await provider.sendInternalNotification(
      OPS_SONG_FAILURE_ALERT_EMAIL,
      `[Melodia] Song generation failed — templated instance #${params.instanceId}`,
      html,
    );

    if (!result.success) {
      logger.error('Ops templated-instance failure alert email failed', {
        instanceId: params.instanceId,
        error: result.error,
      });
      return;
    }

    await db
      .update(templatedSongInstancesTable)
      .set({
        metadata: mergeMetadata(rows[0].metadata, {
          [OPS_FAILURE_NOTIFIED_KEY]: new Date().toISOString(),
        }) as any,
      })
      .where(eq(templatedSongInstancesTable.id, params.instanceId));
  } catch (e) {
    logger.error('maybeNotifyOpsTemplatedInstanceFailed', { error: e instanceof Error ? e.message : String(e) });
  }
}
