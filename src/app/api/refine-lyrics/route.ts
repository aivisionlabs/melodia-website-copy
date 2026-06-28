/**
 * Refine Lyrics API
 * POST /api/refine-lyrics
 * Modifies existing lyrics based on user feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { lyricsDraftReviewsTable, lyricsDraftsTable, songRequestsTable, packagesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refineLyrics } from '@/lib/services/llm/llm-lyrics-operation';
import { reviewAndFixLyrics } from '@/lib/services/llm/llm-lyrics-review';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';
import { z } from 'zod';

// Feature flag: keep OFF by default
const LYRICS_REVIEW_ENABLED = process.env.LYRICS_REVIEW_ENABLED === 'true';

const refineLyricsSchema = z.object({
  lyricsDraftId: z.number(),
  editPrompt: z.string().min(5, 'Please provide editing instructions'),
});

async function handler(req: NextRequest, { logger, startTime }: any) {
  const timer = createApiTimer({ logger, requestId: '', startTime });

  try {
    const body = await req.json();
    const validatedData = refineLyricsSchema.parse(body);

    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin-auth')?.value === 'true';

    logger.info('Validated refine lyrics request', {
      lyricsDraftId: validatedData.lyricsDraftId,
      editPromptLength: validatedData.editPrompt.length,
      lyricsReviewEnabled: LYRICS_REVIEW_ENABLED,
      isAdmin,
    });

    // Get existing lyrics draft
    timer.mark('fetch_draft_start');
    const drafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, validatedData.lyricsDraftId))
      .limit(1);
    timer.mark('fetch_draft_end');

    if (drafts.length === 0) {
      logger.warn('Lyrics draft not found', { lyricsDraftId: validatedData.lyricsDraftId });
      return NextResponse.json(
        { error: 'Lyrics draft not found' },
        { status: 404 }
      );
    }

    const draft = drafts[0];

    // Fetch song request context (for app-equivalent refinement prompts)
    timer.mark('fetch_song_request_start');
    const songRequests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, draft.song_request_id))
      .limit(1);
    timer.mark('fetch_song_request_end');

    const songRequest = songRequests[0];
    if (!songRequest) {
      logger.warn('Song request not found for draft', {
        lyricsDraftId: validatedData.lyricsDraftId,
        songRequestId: draft.song_request_id,
      });
      return NextResponse.json(
        { error: 'Song request not found for this draft' },
        { status: 404 }
      );
    }

    // Check if user has remaining edits BEFORE calling LLMs
    const currentEditsUsed = songRequest.lyrics_edits_used || 0;

    timer.mark('fetch_package_start');
    const packageData = await db
      .select({
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, draft.song_request_id))
      .limit(1);
    timer.mark('fetch_package_end');

    const allowedEdits = packageData[0]?.package?.allowed_lyrics_edits || 2;

    // Admin portal can refine without consuming the consumer's package edit limit
    if (!isAdmin && currentEditsUsed >= allowedEdits) {
      logger.info('User exceeded allowed lyrics edits', {
        songRequestId: draft.song_request_id,
        currentEditsUsed,
        allowedEdits,
      });
      return NextResponse.json(
        {
          error: `You have used all ${allowedEdits} allowed edits. Please approve the current lyrics or upgrade your package.`,
        },
        { status: 403 }
      );
    }

    // Refine lyrics using same pipeline rules (cached SongRequirements so context is preserved)
    const songRequirements = draft.song_requirements as Record<string, unknown> | null;
    timer.mark('refine_start');
    logger.info('Starting LLM lyrics refinement', {
      songRequestId: draft.song_request_id,
      hasCachedRequirements: !!songRequirements,
    });
    // Use customer_lyrics (Romanized display) as input to the refinement LLM
    const lyricsToRefine = (draft as any).customer_lyrics || '';

    const refinedLyrics = await refineLyrics({
      currentLyrics: lyricsToRefine,
      refineText: validatedData.editPrompt,
      songRequest: songRequest as any,
      songRequirements: songRequirements ? JSON.parse(JSON.stringify(songRequirements)) : null,
    });
    timer.mark('refine_end');

    // Review + auto-fix (feature-flagged)
    let fixedLyrics: string = refinedLyrics;
    let reviewReport: any = null;
    let reviewModelName: string | null = null;

    if (LYRICS_REVIEW_ENABLED) {
      timer.mark('review_start');
      logger.info('Starting refined lyrics review + auto-fix', {
        songRequestId: draft.song_request_id,
        refinedLyricsLength: refinedLyrics.length,
      });

      try {
        const reviewResult = await reviewAndFixLyrics({
          lyrics: refinedLyrics,
          context: {
            languages: songRequest.languages,
            recipientDetails: songRequest.recipient_details,
            occasion: songRequest.occasion || '',
            mood: songRequest.mood || [],
          },
        });
        fixedLyrics = reviewResult.fixedLyrics;
        reviewReport = reviewResult.reviewReport;
        reviewModelName = reviewResult.reviewModelName;
      } catch (error) {
        logger.error('Lyrics review failed during refine - refusing to create draft', {
          songRequestId: draft.song_request_id,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          { error: 'Lyrics review is currently unavailable. Please retry in a moment.' },
          { status: 503 }
        );
      } finally {
        timer.mark('review_end');
      }
    } else {
      logger.info('Lyrics review disabled; skipping review layer', {
        songRequestId: draft.song_request_id,
      });
    }

    // In the two-phase architecture, the refinement LLM directly outputs Romanized lyrics.
    // No transliteration step needed here; model_ready_lyrics is crafted only at approval time.
    logger.info('Refined display lyrics ready', { fixedLyricsLength: fixedLyrics.length });

    // Get next version number
    timer.mark('check_existing_drafts');
    const allDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, draft.song_request_id));

    const nextVersion = Math.max(...allDrafts.map(d => d.version || 1)) + 1;

    // Create new version with reference to original version
    // Find the original version (first version or the one this draft was derived from)
    const originalVersionId = draft.original_version_id || (draft.version === 1 ? draft.id : null);

    timer.mark('save_draft_start');
    logger.info('Saving refined lyrics draft + review report', {
      songRequestId: draft.song_request_id,
      nextVersion,
      reviewModelName,
    });

    const { newDraft } = await db.transaction(async (tx) => {
      const insertedDrafts = await tx
        .insert(lyricsDraftsTable)
        .values({
          song_request_id: draft.song_request_id,
          version: nextVersion,
          original_version_id: originalVersionId || draft.id,
          customer_lyrics: fixedLyrics,
          model_ready_lyrics: null,
          song_title: draft.song_title,
          music_style: draft.music_style,
          language: draft.language,
          llm_model_name: draft.llm_model_name,
          lyrics_edit_prompt: validatedData.editPrompt,
          status: 'draft',
          // Preserve cached SongRequirements so regenerate-music-style and downstream flows stay consistent
          song_requirements: draft.song_requirements,
        })
        .returning();

      const inserted = insertedDrafts[0];

      if (LYRICS_REVIEW_ENABLED) {
        await tx.insert(lyricsDraftReviewsTable).values({
          lyrics_draft_id: inserted.id,
          review_report: reviewReport,
          review_model_name: reviewModelName,
          reviewed_at: new Date(),
        });
      }

      // Only increment consumer's edit count when not from admin portal
      if (!isAdmin) {
        await tx
          .update(songRequestsTable)
          .set({
            lyrics_edits_used: currentEditsUsed + 1,
            updated_at: new Date(),
          })
          .where(eq(songRequestsTable.id, draft.song_request_id));
      } else {
        await tx
          .update(songRequestsTable)
          .set({ updated_at: new Date() })
          .where(eq(songRequestsTable.id, draft.song_request_id));
      }

      return { newDraft: inserted };
    });

    timer.mark('save_draft_end');

    logger.info('Refined lyrics draft saved successfully (post-review)', {
      draftId: newDraft.id,
      version: newDraft.version,
      songRequestId: draft.song_request_id,
    });

    timer.logSummary();

    return NextResponse.json({
      success: true,
      draft: {
        id: newDraft.id,
        lyrics: (newDraft as any).customer_lyrics,
        title: newDraft.song_title,
        version: newDraft.version,
      },
    });
  } catch (error) {
    logger.error('Refine lyrics error', error);

    if (error instanceof z.ZodError) {
      logger.warn('Validation error in refine lyrics', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to refine lyrics. Please try again.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('refine-lyrics', handler);
export const POST = withRateLimit('song.generate_lyrics', handlerWithLogging);

