import { eq } from 'drizzle-orm';
import { songRequestsTable } from '@/lib/db/schema';
import type { PaymentSuccessContext, HandlerResult } from './types';

export async function primeHandler(ctx: PaymentSuccessContext): Promise<HandlerResult> {
  const { db, logger, requestId, songRequest } = ctx;

  logger.info('Prime customer payment success, updating status for manual processing', { requestId });

  // Guard: only set 'pending' if the request hasn't already moved to 'processing' or beyond.
  // Re-calls after the team starts work must not regress the status backward.
  if (songRequest.status !== 'processing' && songRequest.status !== 'completed') {
    await db
      .update(songRequestsTable)
      .set({ status: 'pending' })
      .where(eq(songRequestsTable.id, parseInt(requestId)));
  } else {
    logger.info('Prime song request already in later state, skipping status update', {
      requestId,
      currentStatus: songRequest.status,
    });
  }

  return {
    message: 'Payment processed successfully. Team will handle your Prime request manually.',
    isPrimeCustomer: true,
  };
}
