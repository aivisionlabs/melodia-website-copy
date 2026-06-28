/**
 * Reset Password API
 * POST /api/auth/reset-password
 * Resets user password using JWT reset token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifyResetToken } from '@/lib/auth/jwt';

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Verify reset token and extract email
    let userEmail: string;
    try {
      userEmail = verifyResetToken(validatedData.resetToken);
    } catch (tokenError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired reset token. Please request a new password reset.',
          },
        },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, userEmail))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid or expired reset token. Please request a new password reset.',
          },
        },
        { status: 400 }
      );
    }

    const user = users[0];

    // Hash new password (same method as registration: bcrypt with salt rounds 12)
    const passwordHash = await bcrypt.hash(validatedData.newPassword, 12);

    // Update user password
    await db
      .update(usersTable)
      .set({ password_hash: passwordHash })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });

      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: fieldErrors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: 'Failed to reset password. Please try again.' } },
      { status: 500 }
    );
  }
}

