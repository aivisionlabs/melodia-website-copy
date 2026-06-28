/**
 * Razorpay Webhook API
 * POST /api/payments/webhook
 * Handles Razorpay webhook events for payment status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentsTable, paymentWebhooksTable } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { PaymentProviderFactory } from '@/lib/payments/factory';

// Force Node.js runtime for webhook processing
export const runtime = 'nodejs';

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic';

import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

// Event types and their corresponding payment status
const EVENT_STATUS_MAP: Record<string, string> = {
  'payment.captured': 'completed',
  'order.paid': 'completed',
  'payment.failed': 'failed',
  'refund.processed': 'refunded',
  // payment.authorized stays as 'pending' - don't update
};

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  let rawBody: string = '';
  let payload: any = null;

  try {

    // Read raw body as text (required for signature verification)
    rawBody = await req.text();

    if (!rawBody) {
      logger.error('Webhook: Empty request body');
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    // Get payment provider first to determine signature header name
    const provider = PaymentProviderFactory.getProvider();
    const providerName = provider.getName();

    // Get signature from header (provider-specific header names)
    const signatureHeaderName = providerName === 'razorpay'
      ? 'x-razorpay-signature'
      : 'x-webhook-signature'; // Cashfree uses x-webhook-signature
    const signature = req.headers.get(signatureHeaderName);

    // Get timestamp header (required for Cashfree signature verification)
    const timestampHeaderName = providerName === 'razorpay'
      ? null
      : 'x-webhook-timestamp';
    const timestamp = timestampHeaderName ? req.headers.get(timestampHeaderName) : undefined;

    // Get idempotency key (Cashfree provides this)
    const idempotencyKey = req.headers.get('x-idempotency-key');

    logger.debug('Webhook headers received', {
      signatureHeader: signatureHeaderName,
      signaturePresent: !!signature,
      timestampHeader: timestampHeaderName,
      timestampPresent: !!timestamp,
      idempotencyKeyPresent: !!idempotencyKey,
    });

    if (!signature) {
      logger.error(`Webhook: Missing ${signatureHeaderName} header`);
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Verify webhook signature (pass timestamp for Cashfree)
    const isValidSignature = await provider.verifyWebhookSignature(
      rawBody,
      signature,
      timestamp || undefined
    );

    logger.debug('Webhook signature verification result', { isValidSignature });

    if (!isValidSignature) {
      logger.error('Webhook: Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse JSON payload
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error('Webhook: Invalid JSON payload', parseError as any);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Process webhook event using provider
    const webhookEvent = await provider.processWebhookEvent(payload);
    const eventType = webhookEvent.eventType;

    // Use idempotency key if available (Cashfree provides this), otherwise use event ID from provider
    const eventId = idempotencyKey || webhookEvent.eventId;

    if (!eventType) {
      logger.error('Webhook: Missing event type in payload');
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 }
      );
    }

    logger.info(`Received webhook event: ${eventType}`, {
      eventId,
      idempotencyKeyUsed: !!idempotencyKey,
      hasOrderId: !!webhookEvent.orderId,
      hasPaymentId: !!webhookEvent.paymentId,
      paymentStatus: payload.data?.payment?.payment_status,
    });

    // Check idempotency - see if this event was already processed
    const existingWebhooks = await db
      .select()
      .from(paymentWebhooksTable)
      .where(eq(paymentWebhooksTable.provider_event_id, eventId))
      .limit(1);

    if (existingWebhooks.length > 0 && existingWebhooks[0].processed) {
      logger.info('Webhook event already processed, skipping', { eventId });
      return NextResponse.json({
        success: true,
        message: 'Event already processed'
      });
    }

    // Extract payment and order information from processed webhook event
    const orderId = webhookEvent.orderId;
    const paymentId = webhookEvent.paymentId;

    if (!orderId && !paymentId) {
      logger.warn('Webhook: No order_id or payment_id found in payload', { eventId, eventType });
      // Log webhook but don't fail - return 200
      await db.insert(paymentWebhooksTable).values({
        provider_event_id: eventId,
        event_type: eventType,
        webhook_data: payload,
        processed: false,
      });
      return NextResponse.json({
        success: true,
        message: 'Webhook logged but no payment/order ID found'
      });
    }

    // Find payment record
    let payment = null;
    if (orderId) {
      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.order_id, orderId))
        .limit(1);
      payment = payments[0] || null;
    }

    // Fallback to payment_id if order_id not found
    if (!payment && paymentId) {
      const payments = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.payment_id, paymentId))
        .limit(1);
      payment = payments[0] || null;
    }

    if (!payment) {
      logger.warn('Payment record not found for webhook session', { orderId, paymentId });
      // Log webhook but don't fail - return 200
      await db.insert(paymentWebhooksTable).values({
        provider_event_id: eventId,
        event_type: eventType,
        webhook_data: payload,
        processed: false,
      });
      return NextResponse.json({
        success: true,
        message: 'Webhook logged but payment record not found'
      });
    }

    logger.debug('Found payment for webhook', {
      paymentId: payment.id,
      currentStatus: payment.status,
    });

    // Use status from processed webhook event
    const newStatus = webhookEvent.status === 'completed' ? 'completed' :
      webhookEvent.status === 'failed' ? 'failed' :
        webhookEvent.status === 'refunded' ? 'refunded' :
          null;

    // Skip status update for events that shouldn't change status
    if (!newStatus) {
      logger.info('Webhook event does not require status update', { eventType, eventId });
      // Still log the webhook
      await db.insert(paymentWebhooksTable).values({
        provider_event_id: eventId,
        event_type: eventType,
        payment_id: payment.id,
        webhook_data: payload,
        processed: true,
        processed_at: new Date(),
      });
      return NextResponse.json({
        success: true,
        message: 'Webhook processed but no status update needed'
      });
    }

    // Update payment status if needed
    const updateData: any = {
      updated_at: new Date(),
    };

    const statusNeedsUpdate = newStatus && payment.status !== newStatus;

    if (statusNeedsUpdate) {
      updateData.status = newStatus;
      logger.info('Updating payment status from webhook', {
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus
      });
    }

    // Update payment_id if present and not already set
    if (paymentId && !payment.payment_id) {
      updateData.payment_id = paymentId;
    }

    // Perform database update with atomic status check
    // WHERE clause ensures only one update succeeds if both arrive simultaneously
    if (updateData.status) {
      await db
        .update(paymentsTable)
        .set(updateData)
        .where(
          and(
            eq(paymentsTable.id, payment.id),
            // Only update if current status is different (atomic check)
            ne(paymentsTable.status, updateData.status)
          )
        );

      // Re-read to verify if update succeeded
      const updatedPayment = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id))
        .limit(1);

      const finalStatus = updatedPayment[0]?.status;

      if (finalStatus === updateData.status) {
        logger.info('Payment status update successful', { paymentId: payment.id, finalStatus });
      } else {
        logger.info('Payment status update skipped (race condition or already updated)', {
          paymentId: payment.id,
          finalStatus
        });
      }
    } else {
      // No status update, just update other fields
      await db
        .update(paymentsTable)
        .set(updateData)
        .where(eq(paymentsTable.id, payment.id));
    }

    // Log webhook to database
    await db.insert(paymentWebhooksTable).values({
      provider_event_id: eventId,
      event_type: eventType,
      payment_id: payment.id,
      webhook_data: payload,
      processed: true,
      processed_at: new Date(),
    });

    logger.info('Webhook event successfully processed', { eventType, eventId, paymentId: payment.id });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error('Webhook processing error', error as any);

    // Return 500 for transient errors (allows Razorpay to retry)
    // But try to log the webhook even on error if we have the payload
    try {
      if (payload && rawBody) {
        const eId = payload.id || payload.event_id;
        const eType = payload.event || 'unknown';

        if (eId) {
          await db.insert(paymentWebhooksTable).values({
            provider_event_id: eId,
            event_type: eType,
            webhook_data: payload,
            processed: false,
          });
        }
      }
    } catch (logError) {
      logger.error('Failed to log webhook error state', logError as any);
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('payment-webhook', handler);
