/**
 * Generate Lyrics API
 * POST /api/generate-lyrics
 * Generates song lyrics using AI
 */

import { db } from '@/lib/db';
import { lyricsDraftReviewsTable, lyricsDraftsTable, songRequestsTable, songsTable } from '@/lib/db/schema';
import { createApiTimer, withApiLogger } from '@/lib/logger/api-middleware';
import {
  getReferenceLyricsForLibrarySongId,
  getReferenceLyricsForTemplatedSongId,
} from '@/lib/persona-reference-lyrics';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { generateLyrics } from '@/lib/services/llm/llm-lyrics-operation';
import { reviewAndFixLyrics } from '@/lib/services/llm/llm-lyrics-review';
import { buildSongFormData } from '@/lib/services/llm/song-form-data-builder';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// Feature flag: keep OFF by default
const LYRICS_REVIEW_ENABLED = process.env.LYRICS_REVIEW_ENABLED === 'true';

const generateLyricsSchema = z.object({
  songRequestId: z.number(),
  language: z.string().optional(),
  refineText: z.string().optional(),
});

async function handler(req: NextRequest, { logger, startTime }: any) {
  const timer = createApiTimer({ logger, requestId: '', startTime });

  try {
    const body = await req.json();
    const validatedData = generateLyricsSchema.parse(body);

    logger.info('Validated generate lyrics request', {
      songRequestId: validatedData.songRequestId,
      hasRefineText: !!validatedData.refineText,
      language: validatedData.language,
      lyricsReviewEnabled: LYRICS_REVIEW_ENABLED,
    });

    // Get song request
    timer.mark('fetch_song_request_start');
    const requests = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, validatedData.songRequestId))
      .limit(1);
    timer.mark('fetch_song_request_end');

    logger.debug('Song request query completed', {
      found: requests.length > 0,
      songRequestId: validatedData.songRequestId
    });

    if (requests.length === 0) {
      logger.warn('Song request not found', { songRequestId: validatedData.songRequestId });
      return NextResponse.json(
        { error: 'Song request not found' },
        { status: 404 }
      );
    }

    const request = requests[0];
    logger.info('Found song request', {
      songRequestId: request.id,
      languages: request.languages,
      hasOccasion: !!request.occasion,
      hasSourceSongId: !!(request as any).source_song_id
    });

    // Fetch reference lyrics for style matching (library song or catalog template).
    let sourceSongLyrics: string | undefined;
    let sourceSongMood: string[] | undefined;
    const sourceSongId = (request as any).source_song_id as number | null | undefined;
    const namedropTemplateId = (request as any).namedrop_template_id as
      | number
      | null
      | undefined;
    const isNameDropPaymentFlow =
      request.request_source === 'namedrop_template' && !!namedropTemplateId;

    if (sourceSongId) {
      timer.mark('fetch_source_song_start');
      logger.info('Fetching source song for style matching', {
        sourceSongId,
      });

      try {
        const resolvedLyrics = await getReferenceLyricsForLibrarySongId(sourceSongId);
        if (resolvedLyrics) {
          sourceSongLyrics = resolvedLyrics;
          logger.info('Source song fetched successfully', {
            sourceSongId,
            lyricsLength: sourceSongLyrics.length,
          });
        } else {
          logger.warn('Source song not found or has no lyrics', {
            sourceSongId,
          });
        }

        const sourceSongs = await db
          .select({ song_request_id: songsTable.song_request_id })
          .from(songsTable)
          .where(eq(songsTable.id, sourceSongId))
          .limit(1);
        const sourceSong = sourceSongs[0];

        // If the source song is linked to a song_request, reuse its mood for persona-based generation
        if (sourceSong?.song_request_id) {
          const sourceReq = await db
            .select({ mood: songRequestsTable.mood })
            .from(songRequestsTable)
            .where(eq(songRequestsTable.id, sourceSong.song_request_id))
            .limit(1);
          const mood = sourceReq[0]?.mood || undefined;
          if (mood && Array.isArray(mood) && mood.length > 0) {
            sourceSongMood = mood;
          }
        }
      } catch (error) {
        logger.error('Error fetching source song', {
          error: error instanceof Error ? error.message : String(error),
          sourceSongId,
        });
        // Continue without source song lyrics if fetch fails
      }
      timer.mark('fetch_source_song_end');
    } else if (namedropTemplateId && !isNameDropPaymentFlow) {
      timer.mark('fetch_template_reference_start');
      logger.info('Fetching templated song for style matching', {
        namedropTemplateId,
        requestSource: request.request_source,
      });

      try {
        const templateLyrics =
          await getReferenceLyricsForTemplatedSongId(namedropTemplateId);
        if (templateLyrics) {
          sourceSongLyrics = templateLyrics;
          logger.info('Templated song reference lyrics loaded', {
            namedropTemplateId,
            lyricsLength: sourceSongLyrics.length,
          });
        } else {
          logger.warn('Templated song not found or has no lyrics', {
            namedropTemplateId,
          });
        }
      } catch (error) {
        logger.error('Error fetching templated song reference lyrics', {
          error: error instanceof Error ? error.message : String(error),
          namedropTemplateId,
        });
      }
      timer.mark('fetch_template_reference_end');
    }

    // Generate lyrics using melodia-app flow/service
    timer.mark('generate_lyrics_start');
    logger.info('Starting LLM lyrics generation', {
      model: process.env.GOOGLE_VERTEX_MODEL || 'gemini-3.1-pro',
      languages: request.languages,
      hasSourceSongLyrics: !!sourceSongLyrics
    });

    const isPersonaBased = !!(request as any).persona_id;
    const moodForGeneration =
      isPersonaBased && sourceSongMood && sourceSongMood.length > 0
        ? sourceSongMood
        : (request.mood || []);

    const formData = buildSongFormData(request as any, {
      mood: moodForGeneration,
      isPersonaBased,
      ...(sourceSongLyrics ? { sourceSongLyrics } : {}),
    });

    const result = await generateLyrics(formData);
    timer.mark('generate_lyrics_end');

    logger.info('LLM lyrics generation completed', {
      title: result.title,
      musicStyle: result.musicStyle,
      lyricsLength: result.lyrics?.length || 0
    });

    // Get current version number
    timer.mark('check_existing_drafts');
    const existingDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, validatedData.songRequestId));

    const nextVersion = existingDrafts.length + 1;
    logger.debug('Calculated next version', {
      existingVersions: existingDrafts.length,
      nextVersion
    });

    // Pre-process lyrics to replace literal '\\n' with actual newlines for db readability
    const processedLyrics = (result.lyrics || '').replace(/\\n/g, '\n');

    // Review + auto-fix layer (feature-flagged)
    let fixedLyrics: string = processedLyrics;
    let reviewReport: any = null;
    let reviewModelName: string | null = null;

    if (LYRICS_REVIEW_ENABLED) {
      timer.mark('review_start');
      logger.info('Starting lyrics review + auto-fix', {
        songRequestId: validatedData.songRequestId,
        lyricsLength: processedLyrics.length,
      });

      try {
        const reviewResult = await reviewAndFixLyrics({
          lyrics: processedLyrics,
          context: {
            languages: request.languages,
            recipientDetails: request.recipient_details,
            occasion: request.occasion || '',
            mood: moodForGeneration,
          },
        });
        fixedLyrics = reviewResult.fixedLyrics;
        reviewReport = reviewResult.reviewReport;
        reviewModelName = reviewResult.reviewModelName;
      } catch (error) {
        logger.error('Lyrics review failed - refusing to create draft', {
          songRequestId: validatedData.songRequestId,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          {
            error:
              'Lyrics review is currently unavailable. Please retry in a moment.',
          },
          { status: 503 }
        );
      } finally {
        timer.mark('review_end');
      }
    } else {
      logger.info('Lyrics review disabled; skipping review layer', {
        songRequestId: validatedData.songRequestId,
      });
    }

    // In the two-phase lyrics architecture, the LLM directly outputs Romanized display lyrics.
    // No separate transliteration step is needed here.
    // model_ready_lyrics (native-script, audio-model-ready) is crafted only at approval time.
    const customerLyrics = fixedLyrics;

    logger.info('Display lyrics ready (Romanized output from LLM)', {
      lyricsLength: customerLyrics.length,
    });

    const shouldOmitMusicStyle = isPersonaBased;

    // Save lyrics draft + review report + update song request status atomically
    timer.mark('save_draft_start');
    logger.info('Saving lyrics draft + review report to database');

    const { newDraft } = await db.transaction(async (tx) => {
      const insertedDrafts = await tx
        .insert(lyricsDraftsTable)
        .values({
          song_request_id: validatedData.songRequestId,
          version: nextVersion,
          customer_lyrics: customerLyrics,
          model_ready_lyrics: null,
          song_title: result.title || 'Untitled Song',
          // Music style is now generated by a separate LLM call.
          // For persona-based flows, musicStyle is not generated and can be null.
          music_style: shouldOmitMusicStyle ? null : (result.musicStyle || null),
          description: result.description || null,
          language: result.language || 'English',
          llm_model_name: process.env.GOOGLE_VERTEX_MODEL || 'gemini-3.1-pro',
          lyrics_edit_prompt: null,
          // Cache SongRequirements so regenerate-music-style doesn't need to re-run context analysis
          song_requirements: result.songRequirements ? JSON.parse(JSON.stringify(result.songRequirements)) : null,
          status: 'draft',
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

      await tx
        .update(songRequestsTable)
        .set({ status: 'processing' })
        .where(eq(songRequestsTable.id, validatedData.songRequestId));

      return { newDraft: inserted };
    });

    timer.mark('save_draft_end');

    logger.info('Lyrics draft saved successfully (post-review)', {
      draftId: newDraft.id,
      version: newDraft.version,
      reviewModelName,
    });

    // Log timing summary
    timer.logSummary();

    return NextResponse.json({
      success: true,
      draft: {
        id: newDraft.id,
        lyrics: (newDraft as any).customer_lyrics,
        title: newDraft.song_title,
        description: newDraft.description,
        language: newDraft.language,
        version: newDraft.version,
        musicStyle: newDraft.music_style || null,
      },
    });
  } catch (error) {
    logger.error('Generate lyrics error', error);

    if (error instanceof z.ZodError) {
      logger.warn('Validation error', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Check for authentication/configuration errors
    if (error instanceof Error) {
      if (
        error.message.includes('Unable to authenticate') ||
        error.message.includes('Could not load the default credentials') ||
        error.message.includes('GOOGLE_CLOUD_PROJECT_ID') ||
        error.message.includes('GCS_CREDENTIALS_JSON') ||
        error.message.includes('credentials are missing or invalid')
      ) {
        logger.error('Google Cloud credentials configuration error', {
          errorMessage: error.message
        });
        return NextResponse.json(
          {
            error: 'Lyrics generation service is not properly configured.',
            details: 'The service requires Google Cloud credentials. Please contact support if this issue persists.'
          },
          { status: 503 }
        );
      }

      // Check for validation errors
      if (
        error.message.includes('Invalid input') ||
        error.message.includes('Invalid input detected')
      ) {
        logger.warn('Invalid input detected from LLM validation', {
          errorMessage: error.message
        });
        return NextResponse.json(
          {
            error: 'Invalid input detected. Please rephrase your request.'
          },
          { status: 400 }
        );
      }
    }

    logger.error('Unexpected error in generate lyrics', error);
    return NextResponse.json(
      { error: 'Failed to generate lyrics. Please try again.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting and logging middleware
const handlerWithLogging = withApiLogger('generate-lyrics', handler);
export const POST = withRateLimit('song.generate_lyrics', handlerWithLogging);

