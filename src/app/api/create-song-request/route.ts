/**
 * Create Song Request API
 * POST /api/create-song-request
 * Creates a new song generation request
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  anonymousUsersTable,
  packagesTable,
  partnerVisitsTable,
  personaAssociationsTable,
  personasTable,
  templatedSongsTable,
} from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie, setAnonymousCookie } from '@/lib/auth/cookies';
import { sendSongRequestConfirmation } from '@/lib/services/email-service';
import { EmailFactory } from '@/lib/services/email/email-factory';
import { getSongRequestNotificationTemplate } from '@/lib/services/email/templates';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';
import { sql, eq, desc } from 'drizzle-orm';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { resolveOccasionLabel } from '@/lib/occasion-suggestions';

const LYRICS_INPUT_MODE = {
  STORY: 'story',
  LYRICS: 'lyrics',
} as const;

const STORY_CHAR_LIMIT = parseInt(process.env.NEXT_PUBLIC_STORY_CHARACTER_LIMIT || '700', 10);
const MANUAL_LYRICS_CHAR_LIMIT = 2100;

const createRequestSchema = z.object({
  requesterName: z.string().max(100).optional(),
  recipientDetails: z.string().min(2, 'Please provide details about the recipient').max(500, 'Recipient details must be under 500 characters'),
  recipientNameInScript: z.string().max(200).optional(),
  recipientNameScriptLang: z.string().max(100).optional(),
  occasion: z.string().max(100).optional(),
  languages: z.string().min(1, 'Please select at least one language').max(200),
  mood: z.array(z.string().max(50)).max(10).optional(),
  languagePreferences: z.string().max(500).optional(),
  advancedMusicChips: z.array(z.string().max(50)).max(10).optional(),
  musicStyleNotes: z.string().max(500, 'Music style notes must be under 500 characters').optional(),
  story: z.string().max(STORY_CHAR_LIMIT, `Story must be under ${STORY_CHAR_LIMIT} characters`).optional(),
  lyricsInputMode: z.enum([LYRICS_INPUT_MODE.STORY, LYRICS_INPUT_MODE.LYRICS]).default(LYRICS_INPUT_MODE.STORY),
  inputLyrics: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.string().max(MANUAL_LYRICS_CHAR_LIMIT, `Lyrics must be under ${MANUAL_LYRICS_CHAR_LIMIT} characters`).optional()
  ),
  mobileNumber: z.string().max(15).optional(),
  email: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.string().email('Invalid email').max(254).optional()
  ),
  selectedPackage: z.string().max(50).optional(),
  sourceSongId: z.number().int().positive().optional(),
  requestSource: z.string().max(50).optional(),
  nameDropTemplateId: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.lyricsInputMode === LYRICS_INPUT_MODE.LYRICS) {
    if (!data.inputLyrics || data.inputLyrics.trim().length < 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inputLyrics'],
        message: 'Please provide at least 50 characters of lyrics',
      });
    }
  }
});

async function handler(req: NextRequest, { logger }: any) {
  try {
    const body = await req.json();
    const validatedData = createRequestSchema.parse(body);
    logger.info('Validated create song request', {
      lyricsInputMode: validatedData.lyricsInputMode,
      hasInputLyrics: !!validatedData.inputLyrics,
      inputLyricsLength: validatedData.inputLyrics?.length || 0,
      hasStory: !!validatedData.story,
      storyLength: validatedData.story?.length || 0,
      hasSourceSongId: !!validatedData.sourceSongId,
      hasNameDropTemplateId: !!validatedData.nameDropTemplateId,
      requestSource: validatedData.requestSource || null,
      selectedPackage: validatedData.selectedPackage || null,
      hasLanguagePreferences: !!validatedData.languagePreferences,
      advancedMusicChipsCount: validatedData.advancedMusicChips?.length || 0,
      hasMusicStyleNotes: !!validatedData.musicStyleNotes,
    });

    // Get user ID (authenticated or anonymous)
    const user = await getCurrentUser(req);
    let anonymousId = await getAnonymousCookie();

    // Ensure anonymous user row exists for FK constraint
    if (!user && anonymousId) {
      try {
        await db
          .insert(anonymousUsersTable)
          .values({ id: anonymousId })
          .onConflictDoNothing();
      } catch (error) {
        logger.error('Failed to upsert anonymous user', { error });
      }
    }

    // If no authenticated user and no anonymous cookie, create an anonymous user
    if (!user && !anonymousId) {
      try {
        // Create new anonymous user
        const newUsers = await db
          .insert(anonymousUsersTable)
          .values({
            id: sql`gen_random_uuid()`,
          })
          .returning();

        const newUser = newUsers[0];
        anonymousId = newUser.id;

        // Set cookie
        await setAnonymousCookie(newUser.id);
      } catch (error) {
        logger.error('Failed to create anonymous user', { error });
        return NextResponse.json(
          { error: 'Failed to create session. Please enable cookies.' },
          { status: 500 }
        );
      }
    }

    const isDemoMode = isDemoModeEnabled();

    // Look up package_id from selectedPackage slug if provided
    let packageId: number | null = null;
    if (validatedData.selectedPackage) {
      const packages = await db
        .select()
        .from(packagesTable)
        .where(eq(packagesTable.slug, validatedData.selectedPackage))
        .limit(1);

      if (packages[0]) {
        packageId = packages[0].id;
      }
    }

    // Resolve persona from library song (similar-style flow)
    let sourceSongId: number | null = null;
    let personaId: number | null = null;
    let requestSource: string | null = validatedData.requestSource || null;

    if (validatedData.sourceSongId) {
      sourceSongId = validatedData.sourceSongId;
      requestSource = 'similar_style';

      const associations = await db
        .select({
          persona_id: personaAssociationsTable.persona_id,
        })
        .from(personaAssociationsTable)
        .where(eq(personaAssociationsTable.song_id, sourceSongId))
        .limit(1);

      if (!associations[0]?.persona_id) {
        return NextResponse.json(
          { error: 'This song does not support similar-style generation yet.' },
          { status: 400 }
        );
      }

      // Validate persona exists (defensive)
      const personas = await db
        .select({ id: personasTable.id })
        .from(personasTable)
        .where(eq(personasTable.id, associations[0].persona_id))
        .limit(1);

      if (!personas[0]) {
        return NextResponse.json(
          { error: 'Persona not found for this song.' },
          { status: 400 }
        );
      }

      personaId = personas[0].id;
    }

    // For non-namedrop-payment template flows (Fully Custom wizard + create page music style),
    // look up the persona directly from the templated song.
    if (
      validatedData.nameDropTemplateId &&
      validatedData.requestSource !== 'namedrop_template' &&
      !personaId
    ) {
      const templateRows = await db
        .select({ persona_id: templatedSongsTable.persona_id })
        .from(templatedSongsTable)
        .where(eq(templatedSongsTable.id, validatedData.nameDropTemplateId))
        .limit(1);

      if (templateRows[0]?.persona_id) {
        personaId = templateRows[0].persona_id;
        logger.info('Persona resolved from templated song', {
          nameDropTemplateId: validatedData.nameDropTemplateId,
          personaId,
          requestSource: validatedData.requestSource,
        });
      }
    }

    // Check for partner visit and link to song request
    let partnerVisitId: number | null = null;
    let partnerId: number | null = null;

    if (anonymousId || user?.id) {
      try {
        // Get the most recent partner visit for this user
        const visits = await db
          .select()
          .from(partnerVisitsTable)
          .where(
            anonymousId
              ? eq(partnerVisitsTable.anonymous_user_id, anonymousId)
              : user?.id
                ? eq(partnerVisitsTable.user_id, parseInt(user.id))
                : undefined
          )
          .orderBy(desc(partnerVisitsTable.first_visit_at))
          .limit(1);

        if (visits.length > 0) {
          partnerVisitId = visits[0].id;
          partnerId = visits[0].partner_id;

          // Mark visit as converted
          await db
            .update(partnerVisitsTable)
            .set({
              converted: true,
              user_id: user?.id ? parseInt(user.id) : visits[0].user_id,
            })
            .where(eq(partnerVisitsTable.id, partnerVisitId));
        }
      } catch (error) {
        // Log error but don't fail the request
        logger.error('Error linking partner visit', { error });
      }
    }

    const normalizedInputLyrics =
      validatedData.lyricsInputMode === LYRICS_INPUT_MODE.LYRICS
        ? validatedData.inputLyrics?.trim() || null
        : null;

    const storedOccasion = validatedData.occasion
      ? resolveOccasionLabel(validatedData.occasion)
      : undefined;

    // Create song request
    const newRequests = await db
      .insert(songRequestsTable)
      .values({
        user_id: user?.id ? parseInt(user.id) : null,
        anonymous_user_id: anonymousId || null,
        requester_name: validatedData.requesterName || null,
        recipient_details: validatedData.recipientDetails,
        recipient_name_in_script: validatedData.recipientNameInScript?.trim() || null,
        recipient_name_script_lang: validatedData.recipientNameScriptLang?.trim() || null,
        occasion: storedOccasion,
        languages: validatedData.languages,
        mood: validatedData.mood || [],
        song_story: validatedData.story,
        lyrics_input_mode: validatedData.lyricsInputMode,
        input_lyrics: normalizedInputLyrics,
        mobile_number: validatedData.mobileNumber,
        email: validatedData.email,
        package_id: packageId,
        source_song_id: sourceSongId,
        persona_id: personaId,
        namedrop_template_id: validatedData.nameDropTemplateId || null,
        namedrop_singalong_lyrics_enabled: false,
        request_source: requestSource,
        partner_id: partnerId,
        partner_visit_id: partnerVisitId,
        language_preferences: validatedData.languagePreferences || null,
        music_style_chips: validatedData.advancedMusicChips || [],
        music_style_notes: validatedData.musicStyleNotes || null,
        status: 'pending',
        assignee: 'Saurabh', // Default assignee
      })
      .returning();

    const newRequest = newRequests[0];

    // Update partner visit with song_request_id if we have one
    if (partnerVisitId && newRequest.id) {
      try {
        await db
          .update(partnerVisitsTable)
          .set({ song_request_id: newRequest.id })
          .where(eq(partnerVisitsTable.id, partnerVisitId));
      } catch (error) {
        logger.error('Error updating partner visit with song_request_id', { error });
      }
    }

    // Send confirmation email if email provided
    if (validatedData.email && !isDemoMode && process.env.EMAIL_DEMO !== 'true') {
      const recipientName = validatedData.recipientDetails.split(',')[0] || 'your loved one';
      await sendSongRequestConfirmation(
        validatedData.email,
        validatedData.requesterName || 'Customer',
        recipientName,
        newRequest.id
      );
    }

    // Send notification email to info@melodia-songs.com
    if (!isDemoMode && process.env.EMAIL_DEMO !== 'true') {
      try {
        const emailProvider = EmailFactory.getProvider();
        const html = getSongRequestNotificationTemplate({
          requesterName: validatedData.requesterName,
          recipientDetails: validatedData.recipientDetails,
          occasion: validatedData.occasion,
          languages: validatedData.languages,
          story: validatedData.story,
          mood: validatedData.mood,
          mobileNumber: validatedData.mobileNumber,
          email: validatedData.email,
          requestId: String(newRequest.id),
          selectedPackage: validatedData.selectedPackage,
        });

        await emailProvider.sendInternalNotification(
          'info@melodia-songs.com',
          `🎵 New Song Request - ${validatedData.recipientDetails}`,
          html
        );
      } catch (emailError) {
        logger.error('Error sending song request email', { error: emailError });
        // Don't fail the request if email fails - just log it
      }
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      lyricsInputMode: validatedData.lyricsInputMode,
      message: 'Song request created successfully!',
    });
  } catch (error) {
    logger.error('Create song request error', { error });

    if (error instanceof z.ZodError) {
      logger.warn('Validation error in create song request', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create song request. Please try again.' },
      { status: 500 }
    );
  }
}

// Apply logging middleware first, then rate limiting
const handlerWithLogging = withApiLogger('create-song-request', handler);
export const POST = withRateLimit('song.create_request', handlerWithLogging);
