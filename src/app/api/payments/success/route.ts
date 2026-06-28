import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  paymentsTable,
  songRequestsTable,
  lyricsDraftsTable,
  userSongsTable,
  packagesTable,
  templatedSongInstancesTable,
} from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';
import { craftAudioModelLyrics } from '@/lib/services/llm/llm-audio-model-lyrics-crafter';
import { approveLyricsAction } from '@/lib/lyrics-display-actions';

async function handler(request: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const { paymentId, requestId, selectedLyricsDraftId } = await request.json();

    if (!paymentId || !requestId) {
      logger.warn('Payment ID and Request ID are required during payment success processing');
      return NextResponse.json(
        { error: true, message: 'Payment ID and Request ID are required' },
        { status: 400 }
      );
    }

    // Verify payment exists and is completed
    const payment = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, parseInt(paymentId)))
      .limit(1);

    if (!payment[0] || payment[0].status !== 'completed') {
      logger.error('Payment not completed during success processing', { paymentId });
      return NextResponse.json(
        { error: true, message: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get song request data with package info
    const songRequests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, parseInt(requestId)))
      .limit(1);

    if (!songRequests[0] || !songRequests[0].songRequest) {
      logger.error('Song request not found during payment success processing', { requestId });
      return NextResponse.json(
        { error: true, message: 'Song request not found' },
        { status: 404 }
      );
    }

    const { songRequest, package: packageData } = songRequests[0];
    const isNameDropRequest =
      songRequest.request_source === 'namedrop_template' &&
      !!songRequest.namedrop_template_id;

    if (isNameDropRequest) {
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
        return NextResponse.json({
          success: true,
          message: 'NameDrop song already in progress',
          templatedInstanceSlug: existing[0].slug,
          redirectUrl: `/song-template/song/${existing[0].slug}`,
        });
      }

      // Trigger templated generation
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
        .set({
          status: 'processing',
        })
        .where(eq(songRequestsTable.id, parseInt(requestId)));

      return NextResponse.json({
        success: true,
        message: 'NameDrop song generation started',
        templatedInstanceSlug: generated.slug,
        redirectUrl: `/song-template/song/${generated.slug}`,
      });
    }

    // Check if expert-created package - skip automatic song generation
    const isPrimeCustomer = packageData?.expert_created === true;

    // For Prime customers, skip lyrics check and song generation
    // The team will handle it manually
    if (isPrimeCustomer) {
      // Update song request status to indicate payment completed
      // Team will handle the rest manually
      logger.info('Prime customer payment success, updating status for manual processing', { requestId });
      await db
        .update(songRequestsTable)
        .set({
          status: 'pending', // Keep as pending for manual team processing
        })
        .where(eq(songRequestsTable.id, parseInt(requestId)));

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully. Team will handle your Prime request manually.',
        isPrimeCustomer: true,
      });
    }

    const isAutoApproveWizardRequest =
      songRequest.request_source === 'create_song_wizard' ||
      songRequest.request_source === 'fathers_day_wizard';

    // Skip-lyrics-review automation is wizard-only; /create still requires approved lyrics.
    if (packageData?.slug === 'package_2' && isAutoApproveWizardRequest) {
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

        const generateLyricsResponse = await fetch(
          `${request.nextUrl.origin}/api/generate-lyrics`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              songRequestId: parseInt(requestId),
            }),
          }
        );

        if (!generateLyricsResponse.ok) {
          const generateLyricsError = await generateLyricsResponse.json().catch(() => ({}));
          logger.error('Fallback lyrics generation failed during payment success processing', {
            requestId,
            error: generateLyricsError,
          });
          throw new Error(generateLyricsError.error || generateLyricsError.message || 'Failed to generate fallback lyrics');
        }
      }

      const draftRows = await db
        .select({
          id: lyricsDraftsTable.id,
          status: lyricsDraftsTable.status,
        })
        .from(lyricsDraftsTable)
        .where(eq(lyricsDraftsTable.song_request_id, parseInt(requestId)))
        .orderBy(desc(lyricsDraftsTable.version));

      const latestDraft = draftRows[0];
      if (!latestDraft) {
        logger.error('No lyrics draft found after fallback generation during payment success processing', {
          requestId,
        });
        return NextResponse.json(
          { error: true, message: 'No lyrics draft found' },
          { status: 400 }
        );
      }

      // Approve the revision the user selected in the review step (if it belongs
      // to this request); otherwise fall back to the latest draft.
      const selectedId =
        typeof selectedLyricsDraftId === 'number'
          ? selectedLyricsDraftId
          : parseInt(selectedLyricsDraftId ?? '', 10);
      const targetDraft =
        (Number.isFinite(selectedId)
          ? draftRows.find((d) => d.id === selectedId)
          : undefined) ?? latestDraft;

      if (targetDraft.status !== 'approved') {
        const approveResult = await approveLyricsAction(targetDraft.id, parseInt(requestId), targetDraft.id);
        if (!approveResult.success) {
          logger.error('Fallback lyrics approval failed during payment success processing', {
            requestId,
            draftId: targetDraft.id,
            error: approveResult.error,
          });
          return NextResponse.json(
            { error: true, message: approveResult.error || 'Failed to approve lyrics' },
            { status: 500 }
          );
        }

        if (approveResult.songId) {
          logger.info('Fallback lyrics approval created song successfully during payment success processing', {
            requestId,
            songId: approveResult.songId,
          });
          return NextResponse.json({
            success: true,
            songId: approveResult.songId,
            redirectUrl: `/song-options/${approveResult.songId}`,
            message: 'Song created successfully',
          });
        }
      }
    }

    // For non-Prime customers, proceed with normal flow
    // Get approved lyrics for this request
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
      // Pay-first /create flow: lyrics are generated and reviewed *after* payment.
      // No approved lyrics yet just means the user hasn't reached the review step —
      // send them to /generate-lyrics rather than failing. Song generation is
      // triggered later by approveLyricsAction once payment is detected as completed.
      logger.info('Payment completed but no approved lyrics yet; routing to lyrics review', {
        requestId,
      });
      return NextResponse.json({
        success: true,
        redirectUrl: `/generate-lyrics/${requestId}`,
        message: 'Payment successful. Review your lyrics to generate your song.',
      });
    }

    // Ensure `model_ready_lyrics` exists *only after payment is completed*.
    // If it's missing (e.g. approval happened pre-payment), craft it now from the approved `customer_lyrics`.
    const approvedDraft = approvedLyrics[0] as any;
    const existingModelReady = (approvedDraft as any).model_ready_lyrics as string | null;
    const customerLyrics = (approvedDraft as any).customer_lyrics as string | null;

    if (!existingModelReady && customerLyrics) {
      logger.info('model_ready_lyrics missing; crafting after payment completion', {
        requestId,
        lyricsDraftId: approvedDraft.id,
        apiName: 'payment-success',
      });

      try {
        const crafted = await craftAudioModelLyrics({
          displayLyrics: customerLyrics,
          languages: (songRequest as any).languages || 'English',
          recipientDetails: (songRequest as any).recipient_details ?? undefined,
          recipientNameInScript: (songRequest as any).recipient_name_in_script ?? undefined,
        });

        if (crafted) {
          await db
            .update(lyricsDraftsTable)
            .set({ model_ready_lyrics: crafted } as any)
            .where(eq(lyricsDraftsTable.id, approvedDraft.id));

          logger.info('Audio-model-ready lyrics stored successfully (post-payment)', {
            requestId,
            lyricsDraftId: approvedDraft.id,
            modelReadyLyricsLength: crafted.length,
            apiName: 'payment-success',
          });
        } else {
          logger.warn('craftAudioModelLyrics returned null; proceeding without model_ready_lyrics', {
            requestId,
            lyricsDraftId: approvedDraft.id,
            apiName: 'payment-success',
          });
        }
      } catch (craftError) {
        // Non-blocking: allow song generation to use fallback logic if it still can.
        logger.error('Failed to craft audio-model-ready lyrics (post-payment); continuing', {
          requestId,
          lyricsDraftId: approvedDraft.id,
          error: craftError instanceof Error ? craftError : new Error(String(craftError)),
          apiName: 'payment-success',
        });
      }
    } else if (existingModelReady) {
      logger.info('model_ready_lyrics already present; skipping post-payment crafter', {
        requestId,
        lyricsDraftId: approvedDraft.id,
        apiName: 'payment-success',
      });
    }

    // Call /api/generate-song with lyrics data
    const generateSongResponse = await fetch(
      `${request.nextUrl.origin}/api/generate-song`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lyricsDraftId: approvedLyrics[0].id,
          songRequestId: parseInt(requestId),
        }),
      }
    );

    if (!generateSongResponse.ok) {
      const errorData = await generateSongResponse.json().catch(() => ({}));
      logger.error('Failed to generate song during payment success processing', errorData);
      throw new Error(errorData.message || 'Failed to generate song');
    }

    const generateSongData = await generateSongResponse.json();

    if (!generateSongData.success) {
      logger.error('Song generation failed during payment success processing', generateSongData);
      throw new Error(generateSongData.message || 'Song generation failed');
    }

    logger.info('Song generated successfully', {
      songId: generateSongData.songId,
      requestId
    });

    // Link payment to the newly created song
    await db
      .update(userSongsTable)
      .set({
        payment_id: parseInt(paymentId),
      })
      .where(eq(userSongsTable.id, generateSongData.songId));

    logger.info('Payment linked to song', {
      songId: generateSongData.songId,
      paymentId
    });

    // Update song request status
    await db
      .update(songRequestsTable)
      .set({
        status: 'processing',
      })
      .where(eq(songRequestsTable.id, parseInt(requestId)));

    return NextResponse.json({
      success: true,
      songId: generateSongData.songId,
      redirectUrl: `/song-options/${generateSongData.songId}`,
      message: 'Song created successfully',
    });
  } catch (error) {
    logger.error('Error processing payment success', error as any);
    return NextResponse.json(
      { error: true, message: 'Failed to process payment success' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('payment-success', handler);
