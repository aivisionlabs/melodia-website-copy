/**
 * Create Payment Order API
 * POST /api/payments/create-order
 * Creates a payment order (supports multiple providers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentsTable, songRequestsTable, usersTable, packagesTable } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie } from '@/lib/auth/cookies';
import { PaymentProviderFactory } from '@/lib/payments/factory';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const createOrderSchema = z.object({
  songRequestId: z.number(),
  /** @deprecated Ignored — amount is resolved from the song request's linked package */
  amount: z.number().positive('Amount must be positive').optional(),
});

function parsePackagePrice(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const body = await req.json();
    const validatedData = createOrderSchema.parse(body);

    // Get user ID (authenticated or anonymous)
    const user = await getCurrentUser(req);
    const anonymousId = await getAnonymousCookie();

    if (!user && !anonymousId) {
      return NextResponse.json(
        { error: 'Session required' },
        { status: 401 }
      );
    }

    // Get song request with linked package (authoritative price source)
    const songRequests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, validatedData.songRequestId))
      .limit(1);

    if (!songRequests[0]?.songRequest) {
      return NextResponse.json(
        { error: 'Song request not found' },
        { status: 404 }
      );
    }

    const { songRequest, package: packageData } = songRequests[0];
    const amount = parsePackagePrice(packageData?.price);

    if (!packageData || amount == null) {
      logger.warn('Package missing or invalid for create-order', {
        songRequestId: validatedData.songRequestId,
        packageId: songRequest.package_id,
      });
      return NextResponse.json(
        { error: 'Package not found or invalid for this song request' },
        { status: 400 }
      );
    }

    if (
      validatedData.amount != null &&
      Math.abs(validatedData.amount - amount) > 0.01
    ) {
      logger.info('Client amount ignored; using package price from DB', {
        songRequestId: validatedData.songRequestId,
        clientAmount: validatedData.amount,
        packageAmount: amount,
        packageSlug: packageData.slug,
      });
    }

    // Get customer details for Cashfree (requires email and phone)
    let customerEmail = songRequest.email || null;
    let customerPhone = songRequest.mobile_number || null;
    let customerName = songRequest.requester_name || 'Customer';

    // If no email/phone in song request, try to get from user account
    if ((!customerEmail || !customerPhone) && songRequest.user_id) {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, songRequest.user_id))
        .limit(1);

      if (users.length > 0) {
        const user = users[0];
        customerEmail = customerEmail || user.email || null;
        customerPhone = customerPhone || user.phone_number || null;
        customerName = customerName || user.name || 'Customer';
      }
    }

    // If still no email/phone, try to get from authenticated user
    if ((!customerEmail || !customerPhone) && user?.id) {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, parseInt(user.id)))
        .limit(1);

      if (users.length > 0) {
        const userData = users[0];
        customerEmail = customerEmail || userData.email || null;
        customerPhone = customerPhone || userData.phone_number || null;
        customerName = customerName || userData.name || 'Customer';
      }
    }

    // Cashfree requires customer_phone (and email is recommended)
    // If still missing, use placeholder values (Cashfree will reject if phone is empty)
    if (!customerPhone) {
      // Use a placeholder phone number - Cashfree requires this field
      // In production, you might want to require phone number from user
      customerPhone = '9999999999'; // Placeholder - should be collected from user
    }

    if (!customerEmail) {
      // Use placeholder email if not available
      customerEmail = `customer_${songRequest.id}@melodia.com`; // Placeholder
    }

    // Get payment provider
    const provider = PaymentProviderFactory.getProvider();
    const providerName = provider.getName();

    const isAutoProcessWizardFlow =
      songRequest.request_source === 'create_song_wizard' ||
      songRequest.request_source === 'fathers_day_wizard';
    // /create and other flows keep the standard payment return URL.
    const returnUrl = isAutoProcessWizardFlow
      ? `${req.nextUrl.origin}/create-song?step=processing&requestId=${validatedData.songRequestId}`
      : `${req.nextUrl.origin}/payment?requestId=${validatedData.songRequestId}`;

    if (isAutoProcessWizardFlow) {
      logger.info('Using create-song wizard return URL for payment order', {
        songRequestId: validatedData.songRequestId,
        returnUrl,
      });
    }

    // Create payment order using provider
    let order;
    try {
      order = await provider.createOrder({
        amount,
        currency: 'INR',
        receipt: `song_req_${validatedData.songRequestId}`,
        notes: {
          songRequestId: validatedData.songRequestId.toString(),
        },
        returnUrl,
        customerDetails: {
          customerId: user?.id ? String(user.id) : String(anonymousId || `anon_${songRequest.id}`),
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
        },
      });
      logger.info('Order created successfully', { orderId: order.orderId, provider: providerName });
    } catch (orderError) {
      logger.error('Error creating order with provider', orderError as any);
      throw orderError;
    }

    // Create payment record with package_id from song_request
    let payment;
    try {
      const newPayments = await db
        .insert(paymentsTable)
        .values({
          song_request_id: validatedData.songRequestId,
          package_id: songRequest.package_id || null, // Link to package from song request
          user_id: user?.id ? parseInt(user.id) : null,
          anonymous_user_id: anonymousId || null,
          order_id: order.orderId, // Store provider-agnostic order ID
          payment_provider: providerName,
          amount: amount.toString(),
          currency: order.currency,
          status: 'pending',
        })
        .returning();

      payment = newPayments[0];
      logger.info('Payment record created', { paymentId: payment.id, orderId: order.orderId });
    } catch (dbError) {
      logger.error('Error creating payment record', dbError as any);
      // Order was created but payment record failed - this is a critical error
      throw new Error(`Order created but failed to save payment record: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    logger.info('Payment order created from package price', {
      songRequestId: validatedData.songRequestId,
      packageId: packageData.id,
      packageSlug: packageData.slug,
      amount,
    });

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      provider: providerName,
      providerData: order.providerData,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Provide more detailed error message
    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to create payment order';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false
      },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('create-order', withRateLimit('payment.create_order', handler));

