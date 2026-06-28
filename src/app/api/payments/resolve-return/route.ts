import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  paymentsTable,
  userSongsTable,
  lyricsDraftsTable,
  songRequestsTable,
  packagesTable,
  templatedSongInstancesTable,
} from '@/lib/db/schema';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie } from '@/lib/auth/cookies';

/**
 * Resolve Payment Return API
 *
 * Used when a user returns from a payment provider (e.g. Cashfree)
 * without the original requestId query param.
 *
 * Infers the correct next page based on the latest payment/song
 * for the current authenticated or anonymous user.
 *
 * GET /api/payments/resolve-return
 */
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    // Identify current user / anonymous session
    const user = await getCurrentUser(req);
    const anonymousId = await getAnonymousCookie();

    if (!user && !anonymousId) {
      logger.warn('Session not found during resolve-return');
      return NextResponse.json(
        {
          success: false,
          message: 'Session not found',
        },
        { status: 401 }
      );
    }

    // Build where clause for payments linked to this session
    const conditions = [];
    if (user?.id) {
      conditions.push(eq(paymentsTable.user_id, parseInt(user.id)));
    }
    if (anonymousId) {
      conditions.push(eq(paymentsTable.anonymous_user_id, anonymousId));
    }

    if (conditions.length === 0) {
      logger.warn('No session identifier found during resolve-return');
      return NextResponse.json(
        {
          success: false,
          message: 'No session identifier found',
        },
        { status: 400 }
      );
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : or(...conditions);

    // Get latest payments for this session (most recent first)
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(whereClause)
      .orderBy(desc(paymentsTable.created_at))
      .limit(5);

    if (payments.length === 0) {
      logger.info('No payments found for session during resolve-return');
      return NextResponse.json(
        {
          success: false,
          message: 'No payments found for this session',
        },
        { status: 404 }
      );
    }

    // Prefer a completed payment; otherwise use latest payment
    const payment =
      payments.find((p) => p.status === 'completed') ?? payments[0];

    if (!payment.song_request_id) {
      logger.error('Payment not linked to any song request during resolve-return', { paymentId: payment.id });
      return NextResponse.json(
        {
          success: false,
          message: 'Payment not linked to any song request',
        },
        { status: 400 }
      );
    }

    const requestIdNum = payment.song_request_id;

    // Fetch song linked to this request (if any)
    const songs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.song_request_id, requestIdNum))
      .limit(1);

    const song = songs[0] ?? null;

    // Get approved lyrics for this request
    const approvedLyrics = await db
      .select()
      .from(lyricsDraftsTable)
      .where(
        and(
          eq(lyricsDraftsTable.song_request_id, requestIdNum),
          eq(lyricsDraftsTable.status, 'approved')
        )
      )
      .limit(1);

    const hasApprovedLyrics = approvedLyrics.length > 0;

    // Get song request + package to check Prime
    const songRequests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(
        packagesTable,
        eq(packagesTable.id, songRequestsTable.package_id)
      )
      .where(eq(songRequestsTable.id, requestIdNum))
      .limit(1);

    const packageData = songRequests[0]?.package ?? null;
    const songRequest = songRequests[0]?.songRequest ?? null;
    const isPrimeCustomer = packageData?.expert_created === true;
    const isNameDropRequest =
      songRequest?.request_source === 'namedrop_template' &&
      !!songRequest?.namedrop_template_id;

    if (isNameDropRequest) {
      const instances = await db
        .select({
          slug: templatedSongInstancesTable.slug,
          status: templatedSongInstancesTable.status,
        })
        .from(templatedSongInstancesTable)
        .where(
          sql`${templatedSongInstancesTable.metadata} ->> 'songRequestId' = ${String(requestIdNum)}`
        )
        .orderBy(desc(templatedSongInstancesTable.created_at))
        .limit(1);

      const templatedInstance = instances[0] ?? null;

      if (
        templatedInstance &&
        (templatedInstance.status === 'completed' ||
          templatedInstance.status === 'processing' ||
          templatedInstance.status === 'queued')
      ) {
        logger.info('Redirecting to templated song page (NameDrop instance)', {
          slug: templatedInstance.slug,
          status: templatedInstance.status,
        });
        return NextResponse.json({
          success: true,
          nextUrl: `/song-template/song/${templatedInstance.slug}`,
          requestId: requestIdNum,
          hasApprovedLyrics,
          isPrimeCustomer,
        });
      }
    }

    // Decide next URL using the same scenarios as payment page
    // 1) If we have a completed song, go directly to song options
    if (song && song.status === 'completed') {
      logger.info('Redirecting to song-options (completed song)', { songId: song.id });
      return NextResponse.json({
        success: true,
        nextUrl: `/song-options/${song.id}`,
        requestId: requestIdNum,
        hasApprovedLyrics,
        isPrimeCustomer,
      });
    }

    // 2) If song is processing, send user to payment page with requestId so existing UI can show progress
    if (song && song.status === 'processing') {
      logger.info('Redirecting to payment page (processing song)', { songId: song.id });
      return NextResponse.json({
        success: true,
        nextUrl: `/payment?requestId=${requestIdNum}`,
        requestId: requestIdNum,
        hasApprovedLyrics,
        isPrimeCustomer,
      });
    }

    // 3) If payment is completed but no song and no approved lyrics – send back to lyrics page
    // (skip for concierge / expert_created: they never use in-app lyrics review)
    if (
      payment.status === 'completed' &&
      !song &&
      !hasApprovedLyrics &&
      !isNameDropRequest &&
      !isPrimeCustomer
    ) {
      logger.info('Redirecting to generate-lyrics (completed payment, no song/lyrics)', { requestId: requestIdNum });
      return NextResponse.json({
        success: true,
        nextUrl: `/generate-lyrics/${requestIdNum}`,
        requestId: requestIdNum,
        hasApprovedLyrics,
        isPrimeCustomer,
      });
    }

    // 4) Default: send to payment page with requestId so normal check-status logic can run
    logger.info('Redirecting to default payment page', { requestId: requestIdNum });
    return NextResponse.json({
      success: true,
      nextUrl: `/payment?requestId=${requestIdNum}`,
      requestId: requestIdNum,
      hasApprovedLyrics,
      isPrimeCustomer,
    });
  } catch (error) {
    logger.error('Error resolving payment return', error as any);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to resolve payment return',
      },
      { status: 500 }
    );
  }
}

const wrappedGET = withApiLogger('resolve-payment-return', handler);
export { wrappedGET as GET };


