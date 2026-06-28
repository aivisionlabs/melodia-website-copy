import { eq, desc } from 'drizzle-orm';
import { lyricsDraftsTable, userSongsTable } from '@/lib/db/schema';
import { approveLyricsAction } from '@/lib/lyrics-display-actions';
import { HandlerError } from './types';
import type { PaymentSuccessContext, HandlerResult } from './types';

/**
 * Returns HandlerResult when song creation is complete, or null to signal
 * fallthrough to standardHandler (e.g. when the draft was already approved
 * before this call, or approveLyricsAction succeeds but doesn't return a songId).
 */
export async function wizardHandler(ctx: PaymentSuccessContext): Promise<HandlerResult | null> {
  const { db, logger, requestId, origin } = ctx;

  // Idempotency guard: if a song already exists for this request, return it immediately.
  // Prevents duplicate song creation on page refresh or double-call.
  const existingSongs = await db
    .select({ id: userSongsTable.id })
    .from(userSongsTable)
    .where(eq(userSongsTable.song_request_id, parseInt(requestId)))
    .limit(1);

  if (existingSongs[0]) {
    logger.info('Song already exists for wizard request; returning existing song (idempotent)', {
      requestId,
      songId: existingSongs[0].id,
    });
    return {
      message: 'Song created successfully',
      songId: existingSongs[0].id,
      redirectUrl: `/song-options/${existingSongs[0].id}`,
    };
  }

  const existingDrafts = await db
    .select({
      id: lyricsDraftsTable.id,
      version: lyricsDraftsTable.version,
      status: lyricsDraftsTable.status,
    })
    .from(lyricsDraftsTable)
    .where(eq(lyricsDraftsTable.song_request_id, parseInt(requestId)))
    .orderBy(desc(lyricsDraftsTable.version));

  if (existingDrafts.length === 0) {
    logger.info('No lyrics drafts found for package_2 payment success; generating fallback draft', {
      requestId,
    });

    const generateLyricsResponse = await fetch(`${origin}/api/generate-lyrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songRequestId: parseInt(requestId) }),
    });

    if (!generateLyricsResponse.ok) {
      const generateLyricsError = await generateLyricsResponse.json().catch(() => ({}));
      logger.error('Fallback lyrics generation failed during payment success processing', {
        requestId,
        error: generateLyricsError,
      });
      throw new Error(
        generateLyricsError.error || generateLyricsError.message || 'Failed to generate fallback lyrics'
      );
    }
  }

  const latestDraftRows = await db
    .select({
      id: lyricsDraftsTable.id,
      status: lyricsDraftsTable.status,
    })
    .from(lyricsDraftsTable)
    .where(eq(lyricsDraftsTable.song_request_id, parseInt(requestId)))
    .orderBy(desc(lyricsDraftsTable.version))
    .limit(1);

  const latestDraft = latestDraftRows[0];
  if (!latestDraft) {
    logger.error('No lyrics draft found after fallback generation during payment success processing', {
      requestId,
    });
    throw new HandlerError('No lyrics draft found', 400);
  }

  if (latestDraft.status !== 'approved') {
    const approveResult = await approveLyricsAction(latestDraft.id, parseInt(requestId), latestDraft.id);
    if (!approveResult.success) {
      logger.error('Fallback lyrics approval failed during payment success processing', {
        requestId,
        draftId: latestDraft.id,
        error: approveResult.error,
      });
      throw new HandlerError(approveResult.error || 'Failed to approve lyrics', 500);
    }

    if (approveResult.songId) {
      logger.info('Fallback lyrics approval created song successfully during payment success processing', {
        requestId,
        songId: approveResult.songId,
      });
      return {
        message: 'Song created successfully',
        songId: approveResult.songId,
        redirectUrl: `/song-options/${approveResult.songId}`,
      };
    }
  }

  // Draft already approved or approval succeeded without songId → fall through to standard handler
  return null;
}
