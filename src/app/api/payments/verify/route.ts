/**
 * Verify Payment API
 * POST /api/payments/verify
 * Verifies Razorpay payment signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentsTable, userSongsTable, songRequestsTable, usersTable, partnerVisitsTable } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { PaymentProviderFactory } from '@/lib/payments/factory';
import { EmailFactory } from '@/lib/services/email/email-factory';
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';
import { z } from 'zod';

const verifyPaymentSchema = z.object({
  payment_id: z.string(),
  order_id: z.string(),
  signature: z.string(),
});

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const body = await req.json();
    const validatedData = verifyPaymentSchema.parse(body);

    // Find payment record first to determine provider
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.order_id, validatedData.order_id))
      .limit(1);

    if (payments.length === 0) {
      logger.warn('Payment record not found during verification', { orderId: validatedData.order_id });
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // Get payment provider (use stored provider or default to current configured provider)
    const provider = PaymentProviderFactory.getProvider();

    // Verify signature using the provider
    const isValid = provider.verifyPaymentSignature({
      orderId: validatedData.order_id,
      paymentId: validatedData.payment_id,
      signature: validatedData.signature,
    });

    if (!isValid) {
      logger.error('Invalid payment signature', {
        orderId: validatedData.order_id,
        paymentId: validatedData.payment_id
      });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Store original status for email check
    const wasAlreadyCompleted = payment.status === 'completed';
    const wasAlreadyVerified = wasAlreadyCompleted && payment.payment_id === validatedData.payment_id;

    // Idempotency check: Skip if already verified with same payment_id
    if (wasAlreadyVerified) {
      logger.info('Payment already verified, skipping update', { paymentId: payment.id });
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        paymentId: payment.id,
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date(),
    };

    // Only update status if not already completed
    if (!wasAlreadyCompleted) {
      updateData.status = 'completed';
      logger.info('Updating payment status to completed', {
        paymentId: payment.id,
        oldStatus: payment.status
      });
    }

    // Update payment_id if not already set
    if (!payment.payment_id) {
      updateData.payment_id = validatedData.payment_id;
    }

    // Update payment record with atomic status check
    // WHERE clause ensures only one update succeeds if both arrive simultaneously
    await db
      .update(paymentsTable)
      .set(updateData)
      .where(
        and(
          eq(paymentsTable.id, payment.id),
          // Only update if status is not already 'completed' (atomic check)
          ne(paymentsTable.status, 'completed')
        )
      );

    // Check if update actually happened (0 rows = already completed)
    if (updateData.status === 'completed') {
      // Re-read to check if update succeeded
      const updatedPayment = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id))
        .limit(1);

      if (updatedPayment[0]?.status !== 'completed') {
        // Update didn't happen (likely already completed by another request)
        logger.info('Payment was already completed by another request', { paymentId: payment.id });
        return NextResponse.json({
          success: true,
          message: 'Payment already verified',
          paymentId: payment.id,
        });
      }
    }

    // Link payment to song if exists
    if (payment.song_request_id) {
      const userSongs = await db
        .select()
        .from(userSongsTable)
        .where(eq(userSongsTable.song_request_id, payment.song_request_id))
        .limit(1);

      if (userSongs.length > 0) {
        await db
          .update(userSongsTable)
          .set({ payment_id: payment.id })
          .where(eq(userSongsTable.id, userSongs[0].id));
      }

      // Update partner visit with payment_id if song request has partner tracking
      try {
        const songRequests = await db
          .select()
          .from(songRequestsTable)
          .where(eq(songRequestsTable.id, payment.song_request_id))
          .limit(1);

        if (songRequests.length > 0 && songRequests[0].partner_visit_id) {
          await db
            .update(partnerVisitsTable)
            .set({ payment_id: payment.id })
            .where(eq(partnerVisitsTable.id, songRequests[0].partner_visit_id));
        }
      } catch (error) {
        // Log error but don't fail payment verification
        logger.error('Error updating partner visit with payment_id', error as any);
      }
    }

    // Send payment confirmation email
    try {
      let recipientEmail: string | null = null;
      let recipientName: string = 'Customer';

      // Try to get email from song request first
      if (payment.song_request_id) {
        const songRequests = await db
          .select()
          .from(songRequestsTable)
          .where(eq(songRequestsTable.id, payment.song_request_id))
          .limit(1);

        if (songRequests.length > 0) {
          const songRequest = songRequests[0];
          recipientEmail = songRequest.email || null;
          recipientName = songRequest.requester_name || 'Customer';

          // If no email in song request, try to get from user account
          if (!recipientEmail && songRequest.user_id) {
            const users = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.id, songRequest.user_id))
              .limit(1);

            if (users.length > 0) {
              recipientEmail = users[0].email || null;
              recipientName = users[0].name || recipientName;
            }
          }
        }
      }

      // If still no email, try to get from payment user_id
      if (!recipientEmail && payment.user_id) {
        const users = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, payment.user_id))
          .limit(1);

        if (users.length > 0) {
          recipientEmail = users[0].email || null;
          recipientName = users[0].name || recipientName;
        }
      }

      // Send email only if payment was just verified (not already completed)
      // This prevents duplicate emails when verify is called multiple times
      if (recipientEmail && !wasAlreadyCompleted) {
        const emailProvider = EmailFactory.getProvider();
        const amount = parseFloat(payment.amount.toString());
        const currency = payment.currency || 'INR';
        const pId = validatedData.payment_id || payment.payment_id || String(payment.id);

        await emailProvider.sendPaymentConfirmation(
          recipientEmail,
          recipientName,
          amount,
          currency,
          pId
        );
        logger.info('Payment confirmation email sent', { recipientEmail });
      } else if (wasAlreadyCompleted) {
        logger.info('Payment already completed, skipping email');
      } else {
        logger.warn('No email found for payment confirmation', { paymentId: payment.id });
      }
    } catch (emailError) {
      logger.error('Error sending payment confirmation email', emailError as any);
      // Don't fail the payment verification if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: payment.id,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('verify-payment', handler);
