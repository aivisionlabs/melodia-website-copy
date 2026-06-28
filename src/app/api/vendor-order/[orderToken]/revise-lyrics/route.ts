/**
 * Vendor Order Revise Lyrics API
 * POST /api/vendor-order/[orderToken]/revise-lyrics
 *
 * Customer requests an AI revision of their lyrics.
 * Checks revision limits from the package, generates new lyrics draft,
 * and advances the order status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  partnerApiOrdersTable,
  lyricsDraftsTable,
  packagesTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { resolveVendorOrder } from '@/lib/vendor-order/resolve';
import {
  checkReviseLyricsAllowed,
  checkRevisionLimit,
  DEFAULT_ALLOWED_LYRICS_EDITS,
} from '@/lib/vendor-order/revise-lyrics-guards';
import { refineLyrics } from '@/lib/services/llm/llm-lyrics-operation';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const reviseSchema = z.object({
  refineText: z.string().min(1, 'Please describe how you would like the lyrics changed').max(1000),
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

  const reviseGuard = checkReviseLyricsAllowed(order);
  if (!reviseGuard.ok) {
    return NextResponse.json({ error: reviseGuard.error }, { status: reviseGuard.httpStatus });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = reviseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
      { status: 400 },
    );
  }

  const { refineText } = parsed.data;

  // Fetch song request and package to check revision limits
  if (!order.song_request_id) {
    return NextResponse.json({ error: 'Order has no linked song request.' }, { status: 400 });
  }

  const [request] = await db
    .select()
    .from(songRequestsTable)
    .where(eq(songRequestsTable.id, order.song_request_id))
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: 'Song request not found.' }, { status: 404 });
  }

  // Check revision limit from package
  let allowedEdits = DEFAULT_ALLOWED_LYRICS_EDITS;
  if (request.package_id) {
    const [pkg] = await db
      .select({ allowed_lyrics_edits: packagesTable.allowed_lyrics_edits })
      .from(packagesTable)
      .where(eq(packagesTable.id, request.package_id))
      .limit(1);
    allowedEdits = pkg?.allowed_lyrics_edits ?? DEFAULT_ALLOWED_LYRICS_EDITS;
  }

  const limitGuard = checkRevisionLimit(request.lyrics_edits_used, allowedEdits);
  if (!limitGuard.ok) {
    return NextResponse.json({ error: limitGuard.error }, { status: limitGuard.httpStatus });
  }

  // Advance order status — use lyrics_revision_requested so the client shows the correct loading UI
  await db
    .update(partnerApiOrdersTable)
    .set({ status: 'lyrics_revision_requested', updated_at: new Date() })
    .where(eq(partnerApiOrdersTable.id, order.id));

  // Increment lyrics_edits_used on song request
  await db
    .update(songRequestsTable)
    .set({ lyrics_edits_used: (request.lyrics_edits_used ?? 0) + 1 })
    .where(eq(songRequestsTable.id, request.id));

  logger.info('Vendor order: revise lyrics triggered', {
    orderId: order.id,
    songRequestId: request.id,
    vendorId: vendor.id,
    editsUsed: (request.lyrics_edits_used ?? 0) + 1,
  });

  // Run revision asynchronously
  void runLyricsRevision(order.id, request as any, refineText, vendor.id);

  return NextResponse.json({ success: true });
}

async function runLyricsRevision(
  orderId: number,
  request: typeof songRequestsTable.$inferSelect,
  refineText: string,
  vendorId: number,
) {
  try {
    // Get the latest draft to refine
    const [latestDraft] = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, request.id))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);

    if (!latestDraft) {
      throw new Error('No lyrics draft found to revise');
    }

    const existingLyrics = (latestDraft as any).customer_lyrics as string;
    const songRequirements = latestDraft.song_requirements as any;

    const revisedLyrics = await refineLyrics({
      currentLyrics: existingLyrics,
      refineText,
      songRequest: request as any,
      songRequirements,
    });

    const processedLyrics = ((revisedLyrics as string | null) || existingLyrics).replace(/\\n/g, '\n');

    const nextVersion = (latestDraft.version ?? 1) + 1;

    await db.transaction(async (tx) => {
      await tx.insert(lyricsDraftsTable).values({
        song_request_id: request.id,
        version: nextVersion,
        customer_lyrics: processedLyrics,
        model_ready_lyrics: null,
        song_title: latestDraft.song_title,
        music_style: latestDraft.music_style,
        description: latestDraft.description,
        language: latestDraft.language,
        llm_model_name: process.env.GOOGLE_VERTEX_MODEL || 'gemini-3.1-pro',
        lyrics_edit_prompt: refineText,
        song_requirements: latestDraft.song_requirements,
        status: 'draft',
      });
    });

    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'lyrics_ready_for_review', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId));

    logger.info('Vendor order: lyrics revision complete, ready for review', {
      orderId,
      songRequestId: request.id,
      vendorId,
      version: nextVersion,
    });
  } catch (err) {
    logger.error('Vendor order: lyrics revision failed, reverting to lyrics_ready_for_review', {
      orderId,
      songRequestId: request.id,
      vendorId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Revert order status back to lyrics_ready_for_review so the user can retry
    await db
      .update(partnerApiOrdersTable)
      .set({ status: 'lyrics_ready_for_review', updated_at: new Date() })
      .where(eq(partnerApiOrdersTable.id, orderId))
      .catch((dbErr) => {
        logger.error('Vendor order: failed to revert order status after revision failure', {
          orderId,
          error: String(dbErr),
        });
      });
  }
}

export const POST = withRateLimit('vendor.order.revise_lyrics', handler);
