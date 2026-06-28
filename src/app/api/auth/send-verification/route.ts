/**
 * Send Verification Email API
 * POST /api/auth/send-verification
 * Works without authentication - accepts email as parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable, emailVerificationCodesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createOTP } from '@/lib/services/otp-service';
import { sendVerificationEmail } from '@/lib/services/email-service';

const sendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = sendVerificationSchema.parse(body);

    // Find user by email
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    const user = users[0];

    // Check if email is already verified
    if (user.email_verified) {
      return NextResponse.json(
        { success: false, error: { message: 'Email is already verified', code: 'ALREADY_VERIFIED' } },
        { status: 400 }
      );
    }

    // Generate new verification code
    const verificationCode = await createOTP(user.id, 15);

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationCode, user.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the request if email fails, but log it
      // The code is still generated and stored
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Send verification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: 'Failed to send verification code' } },
      { status: 500 }
    );
  }
}


