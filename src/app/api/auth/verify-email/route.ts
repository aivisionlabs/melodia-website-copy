/**
 * Email Verification API
 * POST /api/auth/verify-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable, emailVerificationCodesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { verifyOTP, incrementOTPAttempts, deleteOTP } from '@/lib/services/otp-service';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = verifySchema.parse(body);

    // Find user
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      });
    }

    // Check attempt limit before verifying
    const otpRecord = await db
      .select({ attempts: emailVerificationCodesTable.attempts })
      .from(emailVerificationCodesTable)
      .where(eq(emailVerificationCodesTable.user_id, user.id))
      .limit(1);

    if (otpRecord.length > 0 && (otpRecord[0].attempts ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify the code
    const result = await verifyOTP(user.id, validatedData.code);

    if (!result.valid) {
      await incrementOTPAttempts(user.id);
      return NextResponse.json(
        { error: result.error || 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Verify email and clean up
    await db
      .update(usersTable)
      .set({ email_verified: true })
      .where(eq(usersTable.id, user.id));

    await deleteOTP(user.id);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

