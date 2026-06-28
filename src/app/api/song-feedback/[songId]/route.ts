import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSongVariantReviewsTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { withApiLogger, ApiLoggerContext } from "@/lib/logger/api-middleware";
import { logStructuredError } from "@/lib/logger/utils";

/**
 * GET /api/song-feedback/[songId]
 * Returns feedback data for all variants of a song
 */
async function handler(
  req: NextRequest,
  {
    params,
    requestId,
    logger,
  }: ApiLoggerContext & { params: Promise<{ songId: string }> },
) {
  try {
    const { songId: songIdParam } = await params;
    const songId = parseInt(songIdParam);

    if (isNaN(songId)) {
      return NextResponse.json(
        { success: false, error: "Invalid song ID" },
        { status: 400 },
      );
    }

    // Fetch all feedback for this song
    const feedback = await db
      .select()
      .from(userSongVariantReviewsTable)
      .where(eq(userSongVariantReviewsTable.song_id, songId))
      .orderBy(
        userSongVariantReviewsTable.variant_index,
        desc(userSongVariantReviewsTable.created_at),
      );

    // Group feedback by variant index
    const feedbackByVariant: Record<number, any[]> = {};
    feedback.forEach((review) => {
      const variantIndex = review.variant_index;
      if (!feedbackByVariant[variantIndex]) {
        feedbackByVariant[variantIndex] = [];
      }
      feedbackByVariant[variantIndex].push(review);
    });

    const latestByVariant = Object.fromEntries(
      Object.entries(feedbackByVariant).map(([variantIndex, rows]) => [
        variantIndex,
        rows[0] ?? null,
      ]),
    );

    logger.info("Song feedback fetched", {
      songId,
      variants: Object.keys(feedbackByVariant).length,
      totalRows: feedback.length,
    });

    return NextResponse.json({
      success: true,
      feedbackByVariant,
      latestByVariant,
      hasFeedback: feedback.length > 0,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: "song-feedback-get",
      requestId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger("song-feedback-get", handler);
