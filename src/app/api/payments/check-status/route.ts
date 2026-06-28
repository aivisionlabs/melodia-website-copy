/**
 * Payment Status Check API
 * GET /api/payments/check-status?requestId=123
 * Returns comprehensive payment, song, lyrics, and package status for a requestId
 */

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
import { eq, and, desc, sql } from 'drizzle-orm';
import { PaymentProviderFactory } from '@/lib/payments/factory';

import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requestIdNum = parseInt(requestId);
    if (isNaN(requestIdNum)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Get all payments for this request, ordered by created_at DESC
    const allPayments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.song_request_id, requestIdNum))
      .orderBy(desc(paymentsTable.created_at));

    // Priority: Get completed payment first, if none found, get latest payment
    let payment = allPayments.find(p => p.status === 'completed') || allPayments[0] || null;

    // If payment exists, is Cashfree, has order_id, and is pending - check Cashfree API for latest status
    if (payment &&
      payment.payment_provider === 'cashfree' &&
      payment.order_id &&
      payment.status === 'pending') {

      try {
        const provider = PaymentProviderFactory.getProvider();
        if (provider.getName() === 'cashfree') {
          logger.info('Checking Cashfree order status', { orderId: payment.order_id });

          // Fetch order status from Cashfree
          const order = await provider.getOrder(payment.order_id);

          // Map Cashfree order_status to our payment status
          // Cashfree order_status: 'PAID', 'ACTIVE', 'EXPIRED', 'CANCELLED'
          const statusMap: Record<string, 'completed' | 'failed' | 'pending'> = {
            'PAID': 'completed',
            'ACTIVE': 'pending',
            'EXPIRED': 'failed',
            'CANCELLED': 'failed',
          };

          const cashfreeStatus = (order as any).order_status;
          const newStatus = statusMap[cashfreeStatus] || payment.status;

          logger.info('Cashfree order status mapped', { cashfreeStatus, newStatus });

          // Update payment status if it changed
          if (newStatus !== payment.status) {
            logger.info('Updating payment status from check-status', {
              paymentId: payment.id,
              oldStatus: payment.status,
              newStatus
            });

            await db
              .update(paymentsTable)
              .set({
                status: newStatus,
                updated_at: new Date()
              })
              .where(eq(paymentsTable.id, payment.id));

            // Update local payment object
            payment = { ...payment, status: newStatus };
          } else {
            logger.debug('Payment status unchanged', { status: payment.status });
          }
        }
      } catch (error) {
        // Log error but don't fail - use DB status as fallback
        logger.error('Error checking Cashfree order status', error as any);
        // Continue with DB status
      }
    }

    // Get song if exists
    const songs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.song_request_id, requestIdNum))
      .limit(1);

    const song = songs.length > 0 ? songs[0] : null;

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

    // Get song request with package info to check if Prime customer
    const songRequests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, requestIdNum))
      .limit(1);

    const songRequest = songRequests.length > 0 ? songRequests[0].songRequest : null;
    const packageData = songRequests.length > 0 ? songRequests[0].package : null;
    const isPrimeCustomer = packageData?.expert_created === true;
    const isNameDropRequest =
      songRequest?.request_source === 'namedrop_template' &&
      !!songRequest?.namedrop_template_id;

    let templatedInstance: { slug: string; status: string | null } | null = null;
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
      templatedInstance = instances[0] ?? null;
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: payment ? {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
        } : null,
        song: song ? {
          id: song.id,
          status: song.status,
          slug: song.slug,
        } : null,
        hasApprovedLyrics,
        isPrimeCustomer,
        isNameDropRequest,
        templatedInstance,
        songRequestStatus: songRequest?.status || null,
      },
    });
  } catch (error) {
    logger.error('Error checking status', error as any);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

const wrappedGET = withApiLogger('check-status', handler);
export { wrappedGET as GET };



