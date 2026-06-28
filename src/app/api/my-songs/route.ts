import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  userSongsTable,
  songRequestsTable,
  lyricsDraftsTable,
  userSongVariantReviewsTable,
  anonymousUsersTable,
  packagesTable,
  paymentsTable,
  templatedSongInstancesTable,
  templatedInstanceFeedbackEventsTable,
} from '@/lib/db/schema';
import { eq, and, inArray, sql, isNull, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie, setAnonymousCookie } from '@/lib/auth/cookies';
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const user = await getCurrentUser(req);
    let anonymousId = await getAnonymousCookie();

    // If no authenticated user and no anonymous cookie, create an anonymous user
    // This allows anonymous users to view their songs page even if they haven't created any requests yet
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
        logger.error('Failed to create anonymous user', error as any);
        return NextResponse.json(
          { error: 'Failed to create session. Please enable cookies.' },
          { status: 500 }
        );
      }
    }

    const userCondition = user?.id
      ? eq(songRequestsTable.user_id, parseInt(user.id))
      : and(isNull(songRequestsTable.user_id), eq(songRequestsTable.anonymous_user_id, anonymousId!));

    const templatedUserCondition = user?.id
      ? eq(templatedSongInstancesTable.user_id, parseInt(user.id))
      : and(
        isNull(templatedSongInstancesTable.user_id),
        eq(templatedSongInstancesTable.anonymous_user_id, anonymousId!)
      );

    // === Wave 1: All independent queries in parallel ===
    const [songsWithRequests, eligibleRequests, templatedRows, allRequests] = await Promise.all([
      // Q1: Songs with requests and lyrics
      db
        .select({
          song: userSongsTable,
          request: songRequestsTable,
          lyricsDraft: {
            song_title: lyricsDraftsTable.song_title,
          }
        })
        .from(userSongsTable)
        .innerJoin(
          songRequestsTable,
          eq(userSongsTable.song_request_id, songRequestsTable.id)
        )
        .leftJoin(
          lyricsDraftsTable,
          eq(userSongsTable.approved_lyrics_id, lyricsDraftsTable.id)
        )
        .where(userCondition)
        .orderBy(sql`${userSongsTable.created_at} DESC`),

      // Q2: Eligible requests (paid + approved lyrics)
      db
        .select({
          request: songRequestsTable,
          lyricsDraft: {
            id: lyricsDraftsTable.id,
            song_title: lyricsDraftsTable.song_title,
          },
          payment: {
            id: paymentsTable.id,
            status: paymentsTable.status,
          },
        })
        .from(songRequestsTable)
        .innerJoin(
          lyricsDraftsTable,
          and(
            eq(lyricsDraftsTable.song_request_id, songRequestsTable.id),
            eq(lyricsDraftsTable.status, 'approved')
          )
        )
        .innerJoin(
          paymentsTable,
          and(
            eq(paymentsTable.song_request_id, songRequestsTable.id),
            eq(paymentsTable.status, 'completed')
          )
        )
        .where(userCondition),

      // Q3: Templated song instances
      db
        .select()
        .from(templatedSongInstancesTable)
        .where(templatedUserCondition)
        .orderBy(sql`${templatedSongInstancesTable.created_at} DESC`),

      // Q4: All requests with packages
      db
        .select({
          request: songRequestsTable,
          package: packagesTable,
        })
        .from(songRequestsTable)
        .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
        .where(userCondition)
        .orderBy(sql`${songRequestsTable.created_at} DESC`),
    ]);

    // === Wave 2: Queries that depend on Wave 1 results ===
    const songIds = songsWithRequests.map(({ song }) => song.id);
    const eligibleRequestIds = eligibleRequests.map((r) => r.request.id);
    const templatedInstanceIds = templatedRows.map((inst) => inst.id);

    const requestIdsWithSongs = songsWithRequests.map(({ request }) => request.id);

    const [reviews, existingSongRows, templatedFeedbackEvents] = await Promise.all([
      // Reviews for songs
      songIds.length > 0
        ? db
          .select()
          .from(userSongVariantReviewsTable)
          .where(inArray(userSongVariantReviewsTable.song_id, songIds))
        : Promise.resolve([]),

      // Existing songs for eligible requests
      eligibleRequestIds.length > 0
        ? db
          .select({ song_request_id: userSongsTable.song_request_id })
          .from(userSongsTable)
          .where(inArray(userSongsTable.song_request_id, eligibleRequestIds))
        : Promise.resolve([]),

      // Feedback events for templated instances
      templatedInstanceIds.length > 0
        ? db
          .select({
            templated_song_instance_id:
              templatedInstanceFeedbackEventsTable.templated_song_instance_id,
            variant_index: templatedInstanceFeedbackEventsTable.variant_index,
            decision: templatedInstanceFeedbackEventsTable.decision,
            rating: templatedInstanceFeedbackEventsTable.rating,
            created_at: templatedInstanceFeedbackEventsTable.created_at,
            positive_aspects: templatedInstanceFeedbackEventsTable.positive_aspects,
            reason_codes: templatedInstanceFeedbackEventsTable.reason_codes,
          })
          .from(templatedInstanceFeedbackEventsTable)
          .where(
            inArray(
              templatedInstanceFeedbackEventsTable.templated_song_instance_id,
              templatedInstanceIds
            )
          )
        : Promise.resolve([]),
    ]);

    // Group reviews by song_id and variant_index
    const reviewsBySongAndVariant = new Map<string, any>();
    reviews.forEach(review => {
      const key = `${review.song_id}_${review.variant_index}`;
      // Keep the latest review for each variant
      if (!reviewsBySongAndVariant.has(key) ||
        reviewsBySongAndVariant.get(key).created_at < review.created_at) {
        reviewsBySongAndVariant.set(key, review);
      }
    });

    // Build response with variants and reviews for existing songs
    const songItems = songsWithRequests.map(({ song, request, lyricsDraft }) => {
      // Extract variants from JSONB field
      const rawVariants: any = song.song_variants || {};
      const variants: any[] = Array.isArray(rawVariants)
        ? rawVariants
        : Object.values(rawVariants).filter(Boolean);

      // Map variants with their reviews
      const variantsWithReviews = variants
        .map((variant: any, index: number) => {
          if (!variant) return null;
          const reviewKey = `${song.id}_${index}`;
          const review = reviewsBySongAndVariant.get(reviewKey);
          const latestDecision = review
            ? review.accepted
              ? 'liked'
              : 'disliked'
            : null;

          return {
            id: variant.id || `variant-${index}`,
            index,
            // Standardized priority: sourceAudioUrl (highest quality) > audioUrl > streamAudioUrl
            sourceAudioUrl: variant.sourceAudioUrl || null,
            streamAudioUrl: variant.streamAudioUrl || null,
            audioUrl:
              variant.sourceAudioUrl ||
              variant.audioUrl ||
              variant.streamAudioUrl ||
              null,
            imageUrl: variant.imageUrl || "/images/placeholder-album-art.png",
            title: variant.title || lyricsDraft?.song_title || "Your Song",
            duration: variant.duration || 0,
            modelName: variant.modelName || "",
            prompt: variant.prompt || "",
            tags: variant.tags || "",
            // Review/acceptance indicators
            accepted: review?.accepted || false,
            selected: false,
            rating: review?.rating || null,
            reviewedAt: review?.created_at
              ? review.created_at.toISOString()
              : null,
            latestDecision,
            positiveAspects: review?.positive_aspects || null,
            reasonCodes: review?.reason_codes || null,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      const reviewedVariantsCount = variantsWithReviews.filter((v) => !!v.reviewedAt).length;
      const bothVariantsReviewed =
        variantsWithReviews.length >= 2 && reviewedVariantsCount >= 2;

      // Determine title - prefer lyrics draft title, then first variant title, then metadata
      const title = lyricsDraft?.song_title ||
        variantsWithReviews[0]?.title ||
        (song.metadata as any)?.title ||
        'Your Song';

      return {
        id: song.id,
        slug: song.slug,
        status: song.status,
        created_at: song.created_at.toISOString(),
        title,
        request_id: request.id,
        variants: variantsWithReviews,
        // Summary indicators
        hasAcceptedVariant: variantsWithReviews.some(v => v.accepted),
        hasSelectedVariant: false,
        totalVariants: variantsWithReviews.length,
        reviewedVariantsCount,
        bothVariantsReviewed,
        type: 'song' as const,
      };
    });

    // Build pending song generation items from eligible requests
    const existingRequestIdSet = new Set<number>(
      existingSongRows
        .map((r) => r.song_request_id)
        .filter((id): id is number => typeof id === 'number')
    );

    const pendingSongGenerationRequests = eligibleRequests.map((req) => {
      // Only include if no song exists
      if (!existingRequestIdSet.has(req.request.id)) {
        return {
          id: null, // No song ID yet
          slug: null,
          status: 'pending_generation',
          created_at: req.request.created_at.toISOString(),
          title: req.lyricsDraft?.song_title || 'Your Song',
          request_id: req.request.id,
          variants: [],
          hasAcceptedVariant: false,
          hasSelectedVariant: false,
          totalVariants: 0,
          type: 'pending_song' as const,
          payment_id: req.payment?.id || null,
        };
      }
      return null;
    });

    // Filter out nulls
    const pendingItems = pendingSongGenerationRequests.filter(item => item !== null);

    const latestTemplatedEventByVariant = new Map<
      string,
      (typeof templatedFeedbackEvents)[number]
    >();
    templatedFeedbackEvents.forEach((event) => {
      const hasMeaningfulFeedback =
        event.decision !== null ||
        event.rating !== null ||
        (event.positive_aspects?.length ?? 0) > 0 ||
        (event.reason_codes?.length ?? 0) > 0;
      if (!hasMeaningfulFeedback) return;
      const key = `${event.templated_song_instance_id}_${event.variant_index}`;
      const existing = latestTemplatedEventByVariant.get(key);
      if (!existing || existing.created_at < event.created_at) {
        latestTemplatedEventByVariant.set(key, event);
      }
    });

    const templatedItems = templatedRows.map((inst) => {
      const rawVariants: any = inst.song_variants || {};
      const variants: any[] = Array.isArray(rawVariants)
        ? rawVariants
        : Object.values(rawVariants).filter(Boolean);

      const variantsWithReviews = variants
        .map((variant: any, index: number) => {
          if (!variant) return null;
          const latestEvent = latestTemplatedEventByVariant.get(
            `${inst.id}_${index}`
          );
          const decision = latestEvent?.decision ?? null;

          return {
            id: variant.id || `templated-${inst.id}-${index}`,
            index,
            sourceAudioUrl: variant.sourceAudioUrl || null,
            streamAudioUrl: variant.streamAudioUrl || null,
            audioUrl:
              variant.sourceAudioUrl ||
              variant.audioUrl ||
              variant.streamAudioUrl ||
              null,
            imageUrl: variant.imageUrl || "/images/placeholder-album-art.png",
            title: variant.title || inst.song_title || "Your Song",
            duration: variant.duration || 0,
            modelName: variant.modelName || "",
            prompt: variant.prompt || "",
            tags: variant.tags || "",
            accepted: decision === "liked",
            selected: false,
            rating: latestEvent?.rating ?? null,
            reviewedAt: latestEvent?.created_at
              ? latestEvent.created_at.toISOString()
              : null,
            latestDecision: decision,
            positiveAspects: latestEvent?.positive_aspects || null,
            reasonCodes: latestEvent?.reason_codes || null,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      const reviewedCount = variantsWithReviews.filter((v) => !!v.reviewedAt).length;
      const bothVariantsReviewed =
        variantsWithReviews.length >= 2 && reviewedCount >= 2;

      return {
        id: inst.id,
        slug: inst.slug,
        status: inst.status,
        created_at: inst.created_at.toISOString(),
        title: inst.song_title || inst.recipient_name || "Your Song",
        request_id: 0,
        variants: variantsWithReviews,
        hasAcceptedVariant: variantsWithReviews.some((v) => v.accepted),
        hasSelectedVariant: false,
        totalVariants: variantsWithReviews.length,
        type: 'templated_instance' as const,
        bothVariantsReviewed,
        reviewedVariantsCount: reviewedCount,
      };
    });

    const allItems = [...songItems, ...pendingItems, ...templatedItems].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Filter to get only requests without songs, excluding pending song requests
    const pendingRequestIds = pendingItems.map(item => item.request_id);
    const requestIdsWithSongsSet = new Set(requestIdsWithSongs);
    const pendingRequestIdsSet = new Set(pendingRequestIds);

    const inProgressRequestsData = allRequests.filter(
      ({ request }) =>
        !requestIdsWithSongsSet.has(request.id) &&
        !pendingRequestIdsSet.has(request.id) &&
        request.request_source !== 'namedrop_template'
    );

    // === Wave 3: Lyrics drafts and payments for in-progress requests (parallel) ===
    const inProgressRequestIds = inProgressRequestsData.map(({ request }) => request.id);

    const [allLyricsDrafts, completedPayments] = await Promise.all([
      inProgressRequestIds.length > 0
        ? db
          .select()
          .from(lyricsDraftsTable)
          .where(inArray(lyricsDraftsTable.song_request_id, inProgressRequestIds))
          .orderBy(desc(lyricsDraftsTable.version))
        : Promise.resolve([]),
      inProgressRequestIds.length > 0
        ? db
          .select({ song_request_id: paymentsTable.song_request_id })
          .from(paymentsTable)
          .where(
            and(
              inArray(paymentsTable.song_request_id, inProgressRequestIds),
              eq(paymentsTable.status, 'completed')
            )
          )
        : Promise.resolve([]),
    ]);

    // Group lyrics by request_id → keep only latest version
    const lyricsByRequest = new Map<number, any>();
    allLyricsDrafts.forEach(draft => {
      const existing = lyricsByRequest.get(draft.song_request_id);
      if (!existing || (draft.version && existing.version && draft.version > existing.version)) {
        lyricsByRequest.set(draft.song_request_id, draft);
      }
    });

    const paymentStatuses = new Map<number, boolean>();
    completedPayments.forEach(payment => {
      if (payment.song_request_id) {
        paymentStatuses.set(payment.song_request_id, true);
      }
    });

    // Build in-progress requests list
    const inProgressRequests = inProgressRequestsData.map(({ request, package: packageData }) => {
      const latestLyrics = lyricsByRequest.get(request.id);

      // Extract recipient name from recipient_details (format: "Name, relationship")
      let recipientName = 'Your Song';
      if (request.recipient_details) {
        const parts = request.recipient_details.split(',');
        if (parts.length > 0) {
          recipientName = parts[0].trim();
        }
      }

      // Determine title - prefer lyrics draft title, then recipient name
      const title = latestLyrics?.song_title || recipientName;

      return {
        id: request.id,
        request_id: request.id,
        title,
        status: request.status,
        created_at: request.created_at.toISOString(),
        recipient_details: request.recipient_details,
        occasion: request.occasion,
        has_lyrics: !!latestLyrics,
        lyrics_status: latestLyrics?.status || null,
        lyrics_version: latestLyrics?.version || null,
        package_id: packageData?.id || null,
        package_slug: packageData?.slug ?? null,
        expert_created: packageData?.expert_created ?? false,
        payment_completed: paymentStatuses.get(request.id) || false,
      };
    });

    return NextResponse.json({
      songs: allItems,
      inProgressRequests: inProgressRequests
    });
  } catch (error) {
    logger.error('Error fetching my songs', error as any);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}

export const GET = withApiLogger('my-songs-list', handler);


