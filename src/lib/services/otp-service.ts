/**
 * OTP Service
 * Generates and validates OTP codes
 */

import { randomInt } from 'crypto';
import { db } from '@/lib/db';
import { emailVerificationCodesTable } from '@/lib/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Create an OTP code for a user
 */
export async function createOTP(
  userId: number,
  expirationMinutes: number = 15
) {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  // Delete any existing codes for this user
  await db
    .delete(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.user_id, userId));

  // Create new code
  await db.insert(emailVerificationCodesTable).values({
    user_id: userId,
    code,
    expires_at: expiresAt,
  });

  return code;
}

/**
 * Verify an OTP code
 */
export async function verifyOTP(
  userId: number,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const codes = await db
    .select()
    .from(emailVerificationCodesTable)
    .where(
      and(
        eq(emailVerificationCodesTable.user_id, userId),
        eq(emailVerificationCodesTable.code, code),
        gt(emailVerificationCodesTable.expires_at, new Date())
      )
    )
    .limit(1);

  if (codes.length === 0) {
    // Check if code exists but expired
    const expiredCodes = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(
        and(
          eq(emailVerificationCodesTable.user_id, userId),
          eq(emailVerificationCodesTable.code, code)
        )
      )
      .limit(1);

    if (expiredCodes.length > 0) {
      return { valid: false, error: 'Code has expired' };
    }

    return { valid: false, error: 'Invalid code' };
  }

  const otpCode = codes[0];

  // Check attempts
  if ((otpCode.attempts ?? 0) >= 5) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' };
  }

  return { valid: true };
}

/**
 * Increment OTP attempts
 */
export async function incrementOTPAttempts(userId: number) {
  await db
    .update(emailVerificationCodesTable)
    .set({ attempts: sql`${emailVerificationCodesTable.attempts} + 1` })
    .where(eq(emailVerificationCodesTable.user_id, userId));
}

/**
 * Delete OTP code after successful verification
 */
export async function deleteOTP(userId: number) {
  await db
    .delete(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.user_id, userId));
}

/**
 * Check if user has a valid OTP
 */
export async function hasValidOTP(userId: number): Promise<boolean> {
  const codes = await db
    .select()
    .from(emailVerificationCodesTable)
    .where(
      and(
        eq(emailVerificationCodesTable.user_id, userId),
        gt(emailVerificationCodesTable.expires_at, new Date())
      )
    )
    .limit(1);

  return codes.length > 0;
}

