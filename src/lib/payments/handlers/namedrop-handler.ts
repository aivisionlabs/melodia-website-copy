import { eq, desc, sql } from 'drizzle-orm';
import { templatedSongInstancesTable, songRequestsTable } from '@/lib/db/schema';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import type { PaymentSuccessContext, HandlerResult } from './types';

export async function namedropHandler(ctx: PaymentSuccessContext): Promise<HandlerResult> {
  const { db, logger, songRequest, requestId } = ctx;

  logger.info('Processing NameDrop payment success flow', {
    requestId,
    templateId: songRequest.namedrop_template_id,
  });

  const existing = await db
    .select({
      slug: templatedSongInstancesTable.slug,
      status: templatedSongInstancesTable.status,
    })
    .from(templatedSongInstancesTable)
    .where(
      sql`${templatedSongInstancesTable.metadata} ->> 'songRequestId' = ${String(songRequest.id)}`
    )
    .orderBy(desc(templatedSongInstancesTable.created_at))
    .limit(1);

  if (existing[0]) {
    logger.info('NameDrop instance already exists for song request', {
      requestId,
      slug: existing[0].slug,
      status: existing[0].status,
    });
    return {
      message: 'NameDrop song already in progress',
      templatedInstanceSlug: existing[0].slug,
      redirectUrl: `/song-template/song/${existing[0].slug}`,
    };
  }

  const recipientName = (songRequest.recipient_details || '').split(',')[0]?.trim() || 'Friend';
  const generated = await generateTemplatedInstanceForIdentity({
    templateId: songRequest.namedrop_template_id as number,
    name: recipientName,
    nameInScriptOverride: (songRequest as any).recipient_name_in_script ?? null,
    songRequestId: songRequest.id,
    userId: songRequest.user_id,
    anonymousUserId: songRequest.anonymous_user_id,
    logger,
  });

  await db
    .update(songRequestsTable)
    .set({ status: 'processing' })
    .where(eq(songRequestsTable.id, parseInt(requestId)));

  return {
    message: 'NameDrop song generation started',
    templatedInstanceSlug: generated.slug,
    redirectUrl: `/song-template/song/${generated.slug}`,
  };
}
