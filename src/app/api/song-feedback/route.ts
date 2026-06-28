import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  songFeedbackReasonsTable,
  userSongsTable,
  userSongVariantReviewsTable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAnonymousCookie } from "@/lib/auth/cookies";
import { withApiLogger, ApiLoggerContext } from "@/lib/logger/api-middleware";
import { logStructuredError } from "@/lib/logger/utils";

const feedbackPayloadSchema = z.object({
  songId: z.number().int().positive(),
  variantIndex: z.number().int().min(0).max(1),
  accepted: z.boolean(),
  reasons: z.array(z.string()).optional(),
  otherText: z.string().max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  positive_aspects: z.array(z.string().min(1).max(120)).max(10).optional(),
  positive_other_text: z.string().max(1000).optional(),
});

// Reasons are dynamic now; we'll resolve labels to codes from DB at runtime.

async function handler(req: NextRequest, { logger, requestId }: ApiLoggerContext) {
  try {
    const parsed = feedbackPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      logger.warn("Song feedback validation failed", {
        errors: parsed.error.errors,
      });
      return NextResponse.json(
        { success: false, error: "Invalid payload", details: parsed.error.errors },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // Ensure song exists
    const [song] = await db
      .select({ id: userSongsTable.id })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, body.songId))
      .limit(1);
    if (!song) {
      logger.warn("Song feedback song not found", { songId: body.songId });
      return NextResponse.json(
        { success: false, error: "Song not found" },
        { status: 404 },
      );
    }

    const anonymousId = await getAnonymousCookie().catch(() => null);

    // Resolve input labels to canonical codes from DB (fallback to provided value)
    let reasonCodes: string[] = [];
    if (Array.isArray(body.reasons) && body.reasons.length > 0) {
      const rows = await db.select().from(songFeedbackReasonsTable);
      const labelToCode = new Map(rows.map((r) => [r.label, r.code]));
      reasonCodes = body.reasons
        .map((r) => labelToCode.get(r) || r)
        .filter(Boolean) as string[];
    }

    const rating =
      typeof body.rating === "number"
        ? Math.max(1, Math.min(5, Math.round(body.rating)))
        : null;
    const positiveAspects = body.positive_aspects
      ?.map((aspect) => aspect.trim())
      .filter(Boolean);

    // Insert review row (append-only)
    await db.insert(userSongVariantReviewsTable).values({
      song_id: body.songId,
      variant_index: body.variantIndex,
      accepted: body.accepted,
      reason_codes: reasonCodes.length ? reasonCodes : null,
      other_text:
        body.otherText && body.otherText.trim().length
          ? body.otherText.trim()
          : null,
      positive_aspects: positiveAspects?.length ? positiveAspects : null,
      positive_other_text:
        body.positive_other_text && body.positive_other_text.trim().length
          ? body.positive_other_text.trim()
          : null,
      rating: rating ?? null,
      anonymous_user_id: anonymousId || null,
    });

    logger.info("Song feedback saved", {
      songId: body.songId,
      variantIndex: body.variantIndex,
      accepted: body.accepted,
      positiveAspectsCount: positiveAspects?.length ?? 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logStructuredError(error, {
      operation: "song-feedback-post",
      requestId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to save feedback" },
      { status: 500 },
    );
  }
}

export const POST = withApiLogger("song-feedback-post", handler);
