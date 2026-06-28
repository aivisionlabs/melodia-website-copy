/**
 * Consumer Song Variation API
 * POST /api/songs/[songId]/create-variation
 *
 * Consumer-facing version of the vendor create-variation endpoint.
 * Creates a new song generation from the same approved lyrics with a different
 * music style. Gated by package.allowed_variations and variations_used.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  userSongsTable,
  songRequestsTable,
  lyricsDraftsTable,
  packagesTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { generateSong } from '@/lib/services/song-generation-service';
import { logger } from '@/lib/logger';
import { resolveAllowedVariations } from '@/lib/packages/allowed-variations';

export const runtime = 'nodejs';

const createVariationSchema = z.object({
  musicStyleChips: z.array(z.string().max(100)).max(10).optional(),
  musicStyleNotes: z.string().max(500).optional(),
  recipientNameInScript: z.string().max(200).optional(),
  recipientNameScriptLang: z.string().max(100).optional(),
  /** New recipient name in Latin script — triggers name replacement in customer_lyrics */
  newRecipientName: z.string().max(100).optional(),
  /** Old recipient name (Latin) to find-and-replace in customer_lyrics */
  oldRecipientName: z.string().max(100).optional(),
});

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId: songIdParam } = await params;
  const songId = parseInt(songIdParam);

  if (isNaN(songId)) {
    return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
  }

  const [song] = await db
    .select()
    .from(userSongsTable)
    .where(eq(userSongsTable.id, songId))
    .limit(1);

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  if (!song.song_request_id) {
    return NextResponse.json({ error: 'Song has no linked request.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = createVariationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
      { status: 400 },
    );
  }

  const { musicStyleChips, musicStyleNotes, recipientNameInScript, recipientNameScriptLang, newRecipientName, oldRecipientName } = parsed.data;

  const [parentRequest] = await db
    .select()
    .from(songRequestsTable)
    .where(eq(songRequestsTable.id, song.song_request_id))
    .limit(1);

  if (!parentRequest) {
    return NextResponse.json({ error: 'Song request not found.' }, { status: 404 });
  }

  if ((parentRequest as any).parent_request_id) {
    return NextResponse.json({ error: 'Cannot create a variation of a variation.' }, { status: 400 });
  }

  let allowedVariations = 0;
  if (parentRequest.package_id) {
    const [pkg] = await db
      .select({
        allowed_variations: packagesTable.allowed_variations,
        slug: packagesTable.slug,
      })
      .from(packagesTable)
      .where(eq(packagesTable.id, parentRequest.package_id))
      .limit(1);
    allowedVariations = resolveAllowedVariations(pkg);
  }

  const variationsUsed = (parentRequest as any).variations_used ?? 0;
  if (variationsUsed >= allowedVariations) {
    return NextResponse.json(
      { error: 'No variations remaining for this song.', variationsRemaining: 0 },
      { status: 403 },
    );
  }

  // Fetch approved lyrics draft
  const draftId = (parentRequest as any).selected_lyrics_draft_id;
  let approvedDraft = null;

  if (draftId) {
    const [draft] = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.id, draftId))
      .limit(1);
    approvedDraft = draft ?? null;
  }

  if (!approvedDraft) {
    const [draft] = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, parentRequest.id))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);
    approvedDraft = draft ?? null;
  }

  if (!approvedDraft) {
    return NextResponse.json({ error: 'No approved lyrics found for this song.' }, { status: 400 });
  }

  const oldName = oldRecipientName?.trim();
  const newName = newRecipientName?.trim();
  const nameChanged = !!(oldName && newName && oldName.toLowerCase() !== newName.toLowerCase());

  // Create the variation song request
  const [newRequest] = await db
    .insert(songRequestsTable)
    .values({
      user_id: parentRequest.user_id,
      anonymous_user_id: parentRequest.anonymous_user_id,
      requester_name: nameChanged ? newName : parentRequest.requester_name,
      recipient_details: parentRequest.recipient_details,
      occasion: parentRequest.occasion,
      languages: parentRequest.languages,
      mood: parentRequest.mood,
      song_story: parentRequest.song_story,
      lyrics_input_mode: parentRequest.lyrics_input_mode,
      input_lyrics: parentRequest.input_lyrics,
      mobile_number: parentRequest.mobile_number,
      email: parentRequest.email,
      package_id: parentRequest.package_id,
      source_song_id: parentRequest.source_song_id,
      persona_id: parentRequest.persona_id,
      language_preferences: parentRequest.language_preferences,
      music_style_chips: musicStyleChips ?? parentRequest.music_style_chips,
      music_style_notes: musicStyleNotes ?? parentRequest.music_style_notes,
      partner_id: parentRequest.partner_id,
      partner_visit_id: parentRequest.partner_visit_id,
      partner_api_order_id: parentRequest.partner_api_order_id,
      priority: parentRequest.priority,
      parent_request_id: parentRequest.id,
      variations_used: 0,
      recipient_name_in_script: recipientNameInScript ?? (parentRequest as any).recipient_name_in_script,
      recipient_name_script_lang: recipientNameScriptLang ?? (parentRequest as any).recipient_name_script_lang,
      status: 'pending',
    } as any)
    .returning();

  if (!newRequest) {
    return NextResponse.json({ error: 'Failed to create variation request.' }, { status: 500 });
  }

  // Replace old recipient name in display lyrics so the user sees the updated name
  let updatedCustomerLyrics = (approvedDraft as any).customer_lyrics as string | null;
  if (nameChanged && updatedCustomerLyrics) {
    updatedCustomerLyrics = updatedCustomerLyrics.replace(
      new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      newName,
    );
  }

  const [newDraft] = await db
    .insert(lyricsDraftsTable)
    .values({
      song_request_id: newRequest.id,
      version: 1,
      customer_lyrics: updatedCustomerLyrics,
      model_ready_lyrics: null,
      song_title: approvedDraft.song_title,
      music_style: approvedDraft.music_style,
      description: approvedDraft.description,
      language: approvedDraft.language,
      song_requirements: approvedDraft.song_requirements,
      status: 'approved',
      custom_lyrics: approvedDraft.custom_lyrics,
    } as any)
    .returning();

  if (!newDraft) {
    return NextResponse.json({ error: 'Failed to create lyrics draft for variation.' }, { status: 500 });
  }

  await db
    .update(songRequestsTable)
    .set({ selected_lyrics_draft_id: newDraft.id } as any)
    .where(eq(songRequestsTable.id, newRequest.id));

  await db
    .update(songRequestsTable)
    .set({ variations_used: variationsUsed + 1 } as any)
    .where(eq(songRequestsTable.id, parentRequest.id));

  logger.info('Consumer song variation created, triggering generation', {
    parentRequestId: parentRequest.id,
    newRequestId: newRequest.id,
    newDraftId: newDraft.id,
    variationsUsed: variationsUsed + 1,
    allowedVariations,
  });

  void runVariationGeneration(newDraft.id, newRequest.id);

  return NextResponse.json({
    success: true,
    variationRequestId: newRequest.id,
    variationsRemaining: allowedVariations - (variationsUsed + 1),
  });
}

async function runVariationGeneration(draftId: number, requestId: number) {
  try {
    const result = await generateSong(draftId, requestId);
    if (!result.success) {
      logger.error('Consumer song variation generation failed', { draftId, requestId, message: result.message });
    } else {
      logger.info('Consumer song variation generation complete', {
        draftId,
        requestId,
        slug: result.slug,
        songId: result.songId,
      });
    }
  } catch (err) {
    logger.error('Consumer song variation generation threw', {
      draftId,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const POST = withRateLimit('vendor.order.create_variation', handler);
