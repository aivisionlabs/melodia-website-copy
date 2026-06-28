/**
 * Vendor Order Submit API
 * POST /api/vendor-order/[orderToken]/submit
 *
 * Customer submits their song details via the co-branded page.
 * Creates a song_request linked to the partner order, then triggers
 * lyrics generation asynchronously. No payment required.
 *
 * Core routes (/api/create-song-request, /api/generate-lyrics) are NOT called —
 * this endpoint contains its own vendor-specific orchestration that calls
 * the same underlying services directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  anonymousUsersTable,
  packagesTable,
  partnerApiOrdersTable,
  lyricsDraftsTable,
  lyricsDraftReviewsTable,
  templatedSongsTable,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
import { checkSubmitFormAllowed } from '@/lib/vendor-order/submit-guards';
import { generateLyrics } from '@/lib/services/llm/llm-lyrics-operation';
import { buildSongFormData } from '@/lib/services/llm/song-form-data-builder';
import { logger } from '@/lib/logger';
import { resolveOccasionLabel } from '@/lib/occasion-suggestions';

export const runtime = 'nodejs';

const LYRICS_REVIEW_ENABLED = process.env.LYRICS_REVIEW_ENABLED === 'true';

const STORY_CHAR_LIMIT = parseInt(process.env.NEXT_PUBLIC_STORY_CHARACTER_LIMIT || '700', 10);
const MANUAL_LYRICS_CHAR_LIMIT = 2100;

const submitSchema = z.object({
  recipientDetails: z.string().min(2, 'Please provide details about the recipient').max(500, 'Recipient details must be under 500 characters'),
  occasion: z.string().max(100).optional(),
  languages: z.string().min(1, 'Please select at least one language').max(200),
  mood: z.array(z.string().max(50)).max(10).optional(),
  story: z.string().max(STORY_CHAR_LIMIT, `Story must be under ${STORY_CHAR_LIMIT} characters`).optional(),
  requesterName: z.string().max(100).optional(),
  mobileNumber: z.string().max(15).optional(),
  email: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.string().email('Invalid email').max(254).optional(),
  ),
  languagePreferences: z.string().max(500).optional(),
  advancedMusicChips: z.array(z.string().max(50)).max(10).optional(),
  musicStyleNotes: z.string().max(500, 'Music style notes must be under 500 characters').optional(),
  sourceSongId: z.number().int().positive().optional().nullable(),
  nameDropTemplateId: z.number().int().positive().optional().nullable(),
  lyricsInputMode: z.enum(['story', 'lyrics']).optional().default('story'),
  inputLyrics: z.string().max(MANUAL_LYRICS_CHAR_LIMIT, `Lyrics must be under ${MANUAL_LYRICS_CHAR_LIMIT} characters`).optional(),
});

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ orderToken: string }> },
) {
  const { orderToken } = await params;

  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order, vendor } = resolved;

  const submitGuard = checkSubmitFormAllowed({
    product_type: order.product_type,
    status: order.status,
    song_request_id: order.song_request_id,
  });
  if (!submitGuard.ok) {
    return NextResponse.json(
      { error: submitGuard.error },
      { status: submitGuard.httpStatus },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Resolve package from the order's package_slug
  let packageId: number | null = null;
  if (order.package_slug) {
    const packages = await db
      .select({ id: packagesTable.id })
      .from(packagesTable)
      .where(eq(packagesTable.slug, order.package_slug))
      .limit(1);
    packageId = packages[0]?.id ?? null;
  }

  // Create an anonymous user session to own this song request
  const [anonUser] = await db
    .insert(anonymousUsersTable)
    .values({ id: sql`gen_random_uuid()` })
    .returning();

  // Look up persona from the selected templated song (for style + reference lyrics matching).
  let personaId: number | null = null;
  if (data.nameDropTemplateId) {
    const templateRows = await db
      .select({ persona_id: templatedSongsTable.persona_id })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, data.nameDropTemplateId))
      .limit(1);
    personaId = templateRows[0]?.persona_id ?? null;
  }

  // Create song request linked to this partner order
  const [songRequest] = await db
    .insert(songRequestsTable)
    .values({
      anonymous_user_id: anonUser.id,
      requester_name: data.requesterName ?? null,
      recipient_details: data.recipientDetails,
      occasion: data.occasion ? resolveOccasionLabel(data.occasion) : null,
      languages: data.languages,
      mood: data.mood ?? [],
      song_story: data.lyricsInputMode === 'lyrics' ? null : (data.story ?? null),
      input_lyrics: data.lyricsInputMode === 'lyrics' ? (data.inputLyrics ?? null) : null,
      lyrics_input_mode: data.lyricsInputMode ?? 'story',
      mobile_number: data.mobileNumber ?? null,
      email: data.email ?? null,
      package_id: packageId,
      language_preferences: data.languagePreferences ?? null,
      music_style_chips: data.advancedMusicChips ?? [],
      music_style_notes: data.musicStyleNotes ?? null,
      source_song_id: data.sourceSongId ?? null,
      namedrop_template_id: data.nameDropTemplateId ?? null,
      persona_id: personaId,
      request_source: 'vendor_partner',
      partner_api_order_id: order.id,
      status: 'pending',
      assignee: 'Saurabh',
    })
    .returning();

  // Update order: link song_request and advance status
  await db
    .update(partnerApiOrdersTable)
    .set({
      song_request_id: songRequest.id,
      status: 'form_submitted',
      updated_at: new Date(),
    })
    .where(eq(partnerApiOrdersTable.id, order.id));

  logger.info('Vendor order: form submitted, triggering lyrics generation', {
    orderId: order.id,
    songRequestId: songRequest.id,
    vendorId: vendor.id,
  });

  // Trigger lyrics generation asynchronously (fire-and-forget)
  logger.info('Vendor order: firing triggerLyricsGeneration (async)', {
    orderId: order.id,
    songRequestId: songRequest.id,
    vendorId: vendor.id,
  });
  void triggerLyricsGeneration(order.id, songRequest.id, vendor.id).catch((err) => {
    logger.error('Vendor order: lyrics generation top-level catch', {
      orderId: order.id,
      songRequestId: songRequest.id,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return NextResponse.json({ success: true, song_request_id: songRequest.id });
}

async function triggerLyricsGeneration(
  orderId: number,
  songRequestId: number,
  vendorId: number,
) {
  logger.info('Vendor order: triggerLyricsGeneration started', { orderId, songRequestId, vendorId });

  // Update order status to show lyrics are being generated
  await db
    .update(partnerApiOrdersTable)
    .set({ status: 'lyrics_generation_inprogress', updated_at: new Date() })
    .where(eq(partnerApiOrdersTable.id, orderId));

  logger.info('Vendor order: status set to lyrics_generation_inprogress', { orderId });

  try {
    // Fetch the full song request for the form builder
    const [request] = await db
      .select()
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, songRequestId))
      .limit(1);

    if (!request) {
      throw new Error(`Song request ${songRequestId} not found`);
    }

    logger.info('Vendor order: building form data and calling generateLyrics', {
      orderId,
      songRequestId,
      lyricsInputMode: request.lyrics_input_mode,
      languages: request.languages,
    });

    const formData = buildSongFormData(request as any);
    const result = await generateLyrics(formData);

    logger.info('Vendor order: generateLyrics returned', {
      orderId,
      songRequestId,
      hasLyrics: !!result.lyrics,
      hasTitle: !!result.title,
      hasMusicStyle: !!result.musicStyle,
    });

    // Pre-process lyrics: replace literal '\\n' with actual newlines
    const customerLyrics = (result.lyrics || '').replace(/\\n/g, '\n');

    // If lyrics review is enabled, use the existing infrastructure. For now we skip it
    // in the vendor flow to keep the implementation lean (same as default).
    if (LYRICS_REVIEW_ENABLED) {
      // Lyrics review not supported yet in vendor flow — proceed without it.
      logger.info('Vendor order: LYRICS_REVIEW_ENABLED is true but review is skipped in vendor flow', {
        orderId,
        songRequestId,
      });
    }

    // Get next version number
    const existingDrafts = await db
      .select({ id: lyricsDraftsTable.id })
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, songRequestId));
    const nextVersion = existingDrafts.length + 1;

    await db.transaction(async (tx) => {
      await tx.insert(lyricsDraftsTable).values({
        song_request_id: songRequestId,
        version: nextVersion,
        customer_lyrics: customerLyrics,
        model_ready_lyrics: null,
        song_title: result.title || 'Untitled Song',
        music_style: result.musicStyle ?? null,
        description: result.description ?? null,
        language: result.language || 'English',
        llm_model_name: process.env.GOOGLE_VERTEX_MODEL || 'gemini-3.1-pro',
        song_requirements: result.songRequirements
          ? JSON.parse(JSON.stringify(result.songRequirements))
          : null,
        status: 'draft',
        custom_lyrics: request.lyrics_input_mode === 'lyrics',
      });

      await tx
        .update(songRequestsTable)
        .set({ status: 'processing' })
        .where(eq(songRequestsTable.id, songRequestId));
    });

    // Advance order status to lyrics_ready_for_review
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'lyrics_ready_for_review', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId));

    logger.info('Vendor order: lyrics ready for review', {
      orderId,
      songRequestId,
      vendorId,
    });
  } catch (err) {
    logger.error('Vendor order: lyrics generation failed, marking order as failed', {
      orderId,
      songRequestId,
      vendorId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Mark the order as failed so the client stops polling and shows an error
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'failed', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId))
      .catch((dbErr) => {
        logger.error('Vendor order: failed to update order status to failed', {
          orderId,
          error: String(dbErr),
        });
      });

    throw err;
  }
}

export const POST = withRateLimit('vendor.order.submit', handler);
