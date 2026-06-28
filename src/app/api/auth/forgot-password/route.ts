/**
 * Forgot Password API
 * POST /api/auth/forgot-password
 * Sends password reset OTP code to user's email
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createOTP } from '@/lib/services/otp-service';
import { EmailFactory } from '@/lib/services/email/email-factory';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = forgotPasswordSchema.parse(body);

    // Find user by email
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    // Always return success message to prevent email enumeration
    // Even if user doesn't exist, we return the same message
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset code has been sent',
      });
    }

    const user = users[0];

    // Generate new password reset OTP code
    const resetCode = await createOTP(user.id, 15);

    // Send password reset email
    try {
      const emailProvider = EmailFactory.getProvider();
      await emailProvider.sendPasswordResetEmail(user.email, resetCode, user.name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails, but log it
      // The code is still generated and stored
    }

    // Always return generic success message
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a password reset code has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid email address' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: 'Failed to process request. Please try again.' } },
      { status: 500 }
    );
  }
}

