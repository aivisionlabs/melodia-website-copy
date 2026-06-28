import { db } from '@/lib/db';
import { songRequestsTable, lyricsDraftsTable, paymentsTable, userSongsTable, packagesTable } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { generateSong } from '@/lib/services/song-generation-service';
import { logger } from '@/lib/logger';

export interface LyricsDisplayData {
  songRequest: {
    id: number;
    recipientDetails: string;
    languages: string;
    requesterName: string | null;
    createdAt: string;
    packageId: number | null;
    lyricsEditsUsed: number;
  };
  lyricsDraft: {
    id: number;
    modelReadyLyrics: string | null;
    customerLyrics: string | null;
    status: string;
    version: number;
    createdAt: string;
    title: string | null;
    language: string | null;
    customLyrics: boolean; // Flag to distinguish user-provided lyrics from AI-generated
    musicStyle: string | null;
  };
  package?: {
    id: number;
    name: string;
    slug: string;
    allowedLyricsEdits: number;
  } | null;
  editsRemaining: number; // Calculated: allowedLyricsEdits - lyricsEditsUsed
}

export async function getLyricsDisplayData(requestId: number): Promise<LyricsDisplayData | null> {
  try {
    // Validate input
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      logger.error('Invalid requestId provided to getLyricsDisplayData', {
        requestId,
        apiName: 'getLyricsDisplayData'
      });
      throw new Error(`Invalid requestId: ${requestId}`);
    }

    // Get song request data with package info
    const songRequestData = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, Number(requestId)))
      .limit(1);

    logger.debug('Song request query completed', {
      requestId,
      resultCount: songRequestData.length,
      apiName: 'getLyricsDisplayData'
    });

    if (!songRequestData[0]) {
      logger.warn('No song request found for ID', {
        requestId,
        apiName: 'getLyricsDisplayData'
      });
      return null;
    }

    const { songRequest, package: packageData } = songRequestData[0];
    const foundId = songRequest.id;
    logger.info('Found song request', {
      requestId,
      foundId,
      apiName: 'getLyricsDisplayData'
    });

    // Double-check we got the right record
    if (foundId !== Number(requestId)) {
      logger.error('CRITICAL: ID mismatch in getLyricsDisplayData', {
        requested: requestId,
        received: foundId,
        apiName: 'getLyricsDisplayData'
      });
      throw new Error(`Database returned wrong record! Requested ID ${requestId}, got ${foundId}`);
    }

    // Get the lyrics draft used for song generation (selected_lyrics_draft_id),
    // falling back to the latest draft when no selection is present.
    const selectedLyricsDraftId: number | null =
      (songRequest as any).selected_lyrics_draft_id ?? null;

    let lyricsDraft = selectedLyricsDraftId
      ? await db
        .select()
        .from(lyricsDraftsTable)
        .where(
          and(
            eq(lyricsDraftsTable.id, selectedLyricsDraftId),
            eq(lyricsDraftsTable.song_request_id, requestId)
          )
        )
        .limit(1)
      : [];

    if (!lyricsDraft[0]) {
      lyricsDraft = await db
        .select()
        .from(lyricsDraftsTable)
        .where(eq(lyricsDraftsTable.song_request_id, requestId))
        .orderBy(desc(lyricsDraftsTable.version))
        .limit(1);
    }

    if (!lyricsDraft[0]) {
      return null;
    }

    // Calculate remaining edits
    const allowedEdits = packageData?.allowed_lyrics_edits || 2; // Default to 2 if no package
    const editsUsed = songRequest.lyrics_edits_used || 0;
    const editsRemaining = Math.max(0, allowedEdits - editsUsed);

    return {
      songRequest: {
        id: songRequest.id,
        recipientDetails: songRequest.recipient_details,
        languages: songRequest.languages || '',
        requesterName: songRequest.requester_name,
        createdAt: songRequest.created_at.toISOString(),
        packageId: songRequest.package_id,
        lyricsEditsUsed: editsUsed,
      },
      lyricsDraft: {
        id: lyricsDraft[0].id,
        modelReadyLyrics: (lyricsDraft[0] as any).model_ready_lyrics ?? null,
        customerLyrics: (lyricsDraft[0] as any).customer_lyrics || null,
        status: lyricsDraft[0].status || 'draft',
        version: lyricsDraft[0].version || 1,
        createdAt: lyricsDraft[0].created_at.toISOString(),
        title: lyricsDraft[0].song_title || null,
        language: lyricsDraft[0].language || null,
        customLyrics: (lyricsDraft[0] as any).custom_lyrics || false,
        musicStyle: lyricsDraft[0].music_style || null,
      },
      package: packageData ? {
        id: packageData.id,
        name: packageData.name,
        slug: packageData.slug,
        allowedLyricsEdits: packageData.allowed_lyrics_edits || 2,
      } : null,
      editsRemaining,
    };
  } catch (error) {
    logger.error('Error fetching lyrics display data', {
      error: error instanceof Error ? error : new Error(String(error)),
      requestId,
      apiName: 'getLyricsDisplayData'
    });
    return null;
  }
}

export async function updateLyricsAction(draftId: number, editedLyrics: string) {
  try {
    // Get existing lyrics draft
    const drafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, draftId))
      .limit(1);

    if (drafts.length === 0) {
      throw new Error("Lyrics draft not found");
    }

    const draft = drafts[0];

    // Get next version number (create new version like refine-lyrics does)
    const allDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, draft.song_request_id));

    const nextVersion = Math.max(...allDrafts.map(d => d.version || 1)) + 1;

    // Find the original version (first version or the one this draft was derived from)
    const originalVersionId = draft.original_version_id || (draft.version === 1 ? draft.id : null);

    // Create new version with manually edited lyrics (user edits go into customer_lyrics only).
    // `model_ready_lyrics` is intentionally generated only after payment is completed.
    const newDrafts = await db
      .insert(lyricsDraftsTable)
      .values({
        song_request_id: draft.song_request_id,
        version: nextVersion,
        original_version_id: originalVersionId || draft.id,
        customer_lyrics: editedLyrics,
        model_ready_lyrics: null,
        song_title: draft.song_title,
        music_style: draft.music_style,
        language: draft.language,
        llm_model_name: draft.llm_model_name,
        status: 'draft',
      } as any)
      .returning();

    const newDraft = newDrafts[0];

    return {
      success: true,
      draft: {
        id: newDraft.id,
        lyrics: (newDraft as any).customer_lyrics || "",
        title: newDraft.song_title,
        version: newDraft.version,
      },
    };
  } catch (error) {
    logger.error('Error updating lyrics', {
      error: error instanceof Error ? error : new Error(String(error)),
      draftId,
      apiName: 'updateLyricsAction'
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unknown error occurred while updating lyrics.",
    };
  }
}

// Approve lyrics and redirect to payment or song-options based on payment status
export async function approveLyricsAction(
  draftId: number,
  requestId: number,
  selectedLyricsDraftId?: number
) {
  try {
    // The draft to work with is the selected version (or the one being approved)
    const targetDraftId = selectedLyricsDraftId || draftId;

    // Fetch the target draft to validate the approval request.
    // NOTE: We intentionally do NOT craft `model_ready_lyrics` here; it must only happen after payment is completed.
    const targetDraftRows = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, targetDraftId))
      .limit(1);

    const targetDraft = targetDraftRows[0];
    if (!targetDraft) {
      logger.error('Lyrics draft not found during approval', {
        draftId: targetDraftId,
        requestId,
        apiName: 'approveLyricsAction',
      });
      return { success: false, error: 'Lyrics draft not found' };
    }

    logger.debug('Lyrics approved', {
      draftId: targetDraftId,
      requestId,
      apiName: 'approveLyricsAction',
    });

    // Update draft status
    await db
      .update(lyricsDraftsTable)
      .set({ status: 'approved' })
      .where(eq(lyricsDraftsTable.id, draftId));

    // Store selected version for song generation (defaults to approved draft if not specified)
    const versionToUse = targetDraftId;
    await db
      .update(songRequestsTable)
      .set({
        selected_lyrics_draft_id: versionToUse,
        updated_at: new Date(),
      })
      .where(eq(songRequestsTable.id, requestId));

    // Check if payment exists for this song request
    const payment = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.song_request_id, requestId),
          eq(paymentsTable.status, 'completed')
        )
      )
      .limit(1);


    // If payment exists, find the corresponding song and redirect to song-options
    if (payment.length > 0 && payment[0]) {
      const song = await db
        .select()
        .from(userSongsTable)
        .where(eq(userSongsTable.song_request_id, requestId))
        .limit(1);

      if (song.length > 0 && song[0]) {
        return {
          success: true,
          redirectTo: `/song-options/${song[0].id}`,
          songId: song[0].id
        };
      } else {
        // Payment exists but song not created yet - create the song now
        try {
          logger.info('Payment exists but song not found. Creating song', {
            draftId,
            requestId,
            apiName: 'approveLyricsAction'
          });

          const songResult = await generateSong(draftId, requestId);

          if (songResult.success && songResult.songId) {
            logger.info('Song created successfully after lyrics approval', {
              songId: songResult.songId,
              draftId,
              requestId,
              apiName: 'approveLyricsAction'
            });
            return {
              success: true,
              redirectTo: `/song-options/${songResult.songId}`,
              songId: songResult.songId
            };
          } else {
            // Song generation failed
            logger.error('Song generation failed after lyrics approval', {
              draftId,
              requestId,
              error: songResult.message || 'Unknown error',
              apiName: 'approveLyricsAction'
            });
            return {
              success: false,
              error: songResult.message || 'Failed to create song. Please try again.',
            };
          }
        } catch (error) {
          logger.error('Error creating song after lyrics approval', {
            error: error instanceof Error ? error : new Error(String(error)),
            draftId,
            requestId,
            apiName: 'approveLyricsAction'
          });
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create song. Please try again.',
          };
        }
      }
    }

    // No payment found, redirect to payment page
    return { success: true, redirectTo: `/payment?requestId=${requestId}` };
  } catch (error) {
    logger.error('Error approving lyrics', {
      error: error instanceof Error ? error : new Error(String(error)),
      draftId,
      requestId,
      apiName: 'approveLyricsAction'
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to approve lyrics',
    };
  }
}
