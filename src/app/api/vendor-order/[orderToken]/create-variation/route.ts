/**
 * Song Variation API
 * POST /api/vendor-order/[orderToken]/create-variation
 *
 * Creates a new song generation from the same approved lyrics but with
 * a different music style and/or corrected recipient name transliteration.
 * Only available after the customer has rejected all variants (feedback gate)
 * and while the package still has remaining variations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  lyricsDraftsTable,
  packagesTable,
  userSongsTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
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
  { params }: { params: Promise<{ orderToken: string }> },
) {
  const { orderToken } = await params;

  const resolved = await resolveVendorOrder(orderToken);
  if (!resolved) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { order } = resolved;

  if (order.product_type !== 'customer_custom_song') {
    return NextResponse.json({ error: 'Variations are only available for custom songs.' }, { status: 400 });
  }

  if (order.status !== 'completed') {
    return NextResponse.json({ error: 'Song must be completed before creating a variation.' }, { status: 400 });
  }

  if (!order.song_request_id) {
    return NextResponse.json({ error: 'Order has no linked song request.' }, { status: 400 });
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

  // Fetch the parent song request
  const [parentRequest] = await db
    .select()
    .from(songRequestsTable)
    .where(eq(songRequestsTable.id, order.song_request_id))
    .limit(1);

  if (!parentRequest) {
    return NextResponse.json({ error: 'Song request not found.' }, { status: 404 });
  }

  // Verify the parent is not itself a variation (only one level of variation allowed)
  if ((parentRequest as any).parent_request_id) {
    return NextResponse.json({ error: 'Cannot create a variation of a variation.' }, { status: 400 });
  }

  // Check variation limit from package
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
      { error: 'No variations remaining for this order.', variationsRemaining: 0 },
      { status: 403 },
    );
  }

  // Fetch the approved lyrics draft
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
    // Fall back to latest approved draft
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

  // Create new song request (variation) by copying parent fields
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
      // Variation-specific fields
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

  // Copy the approved lyrics draft to the new request (same lyrics, skip review)
  const [newDraft] = await db
    .insert(lyricsDraftsTable)
    .values({
      song_request_id: newRequest.id,
      version: 1,
      customer_lyrics: updatedCustomerLyrics,
      model_ready_lyrics: null, // will be re-crafted with new name at generation time
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

  // Link the new draft as selected on the new request
  await db
    .update(songRequestsTable)
    .set({ selected_lyrics_draft_id: newDraft.id } as any)
    .where(eq(songRequestsTable.id, newRequest.id));

  // Increment variations_used on the parent
  await db
    .update(songRequestsTable)
    .set({ variations_used: variationsUsed + 1 } as any)
    .where(eq(songRequestsTable.id, parentRequest.id));

  logger.info('Song variation created, triggering generation', {
    parentRequestId: parentRequest.id,
    newRequestId: newRequest.id,
    newDraftId: newDraft.id,
    variationsUsed: variationsUsed + 1,
    allowedVariations,
  });

  // Trigger generation asynchronously — response returns immediately with the new request id
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
      logger.error('Song variation generation failed', { draftId, requestId, message: result.message });
    } else {
      logger.info('Song variation generation complete', {
        draftId,
        requestId,
        slug: result.slug,
        songId: result.songId,
      });
    }
  } catch (err) {
    logger.error('Song variation generation threw', {
      draftId,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const POST = withRateLimit('vendor.order.create_variation', handler);
