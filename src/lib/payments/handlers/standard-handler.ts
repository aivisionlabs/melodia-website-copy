import { eq, and } from 'drizzle-orm';
import { lyricsDraftsTable } from '@/lib/db/schema';
import { HandlerError } from './types';
import { generateSongFromApprovedLyrics } from './shared';
import type { PaymentSuccessContext, HandlerResult } from './types';

export async function standardHandler(ctx: PaymentSuccessContext): Promise<HandlerResult> {
  const { db, logger, requestId } = ctx;

  const approvedLyrics = await db
    .select()
    .from(lyricsDraftsTable)
    .where(
      and(
        eq(lyricsDraftsTable.song_request_id, parseInt(requestId)),
        eq(lyricsDraftsTable.status, 'approved')
      )
    )
    .limit(1);

  if (!approvedLyrics[0]) {
    logger.error('No approved lyrics found during payment success processing', { requestId });
    throw new HandlerError('No approved lyrics found', 400);
  }

  return generateSongFromApprovedLyrics(ctx, approvedLyrics[0]);
}
