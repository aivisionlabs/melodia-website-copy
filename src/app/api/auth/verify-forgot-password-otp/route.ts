/**
 * Verify Forgot Password OTP API
 * POST /api/auth/verify-forgot-password-otp
 * Verifies OTP code and generates password reset token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable, emailVerificationCodesTable } from '@/lib/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { verifyOTP, incrementOTPAttempts, deleteOTP } from '@/lib/services/otp-service';
import { generateResetToken } from '@/lib/auth/jwt';

const verifyForgotPasswordOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = verifyForgotPasswordOTPSchema.parse(body);

    // Find user by email
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired verification code' } },
        { status: 400 }
      );
    }

    const user = users[0];

    // Verify OTP code
    const otpResult = await verifyOTP(user.id, validatedData.code);

    if (!otpResult.valid) {
      // Increment attempts for invalid code
      await incrementOTPAttempts(user.id);

      // Get current attempts count to return in error details
      const codes = await db
        .select()
        .from(emailVerificationCodesTable)
        .where(
          and(
            eq(emailVerificationCodesTable.user_id, user.id),
            gt(emailVerificationCodesTable.expires_at, new Date())
          )
        )
        .limit(1);

      const attemptsRemaining = codes.length > 0 && codes[0].attempts !== null
        ? Math.max(0, 5 - (codes[0].attempts || 0))
        : 5;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: otpResult.error || 'Invalid or expired verification code',
            details: { attemptsRemaining },
          },
        },
        { status: 400 }
      );
    }

    // Generate password reset token
    const resetToken = generateResetToken(user.email);

    // Delete used OTP code
    await deleteOTP(user.id);

    return NextResponse.json({
      success: true,
      data: { resetToken },
    });
  } catch (error) {
    console.error('Verify forgot password OTP error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: 'Verification failed. Please try again.' } },
      { status: 500 }
    );
  }
}

