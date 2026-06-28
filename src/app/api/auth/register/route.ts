/**
 * User Registration API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  usersTable,
  emailVerificationCodesTable,
  songRequestsTable,
  paymentsTable,
  anonymousUsersTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAnonymousCookie, deleteAnonymousCookie } from '@/lib/auth/cookies';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  dateOfBirth: z.string(), // YYYY-MM-DD format
  phoneNumber: z.string().optional(),
  anonymousId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const newUsers = await db
      .insert(usersTable)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password_hash: passwordHash,
        date_of_birth: validatedData.dateOfBirth, // Already in YYYY-MM-DD format
        phone_number: validatedData.phoneNumber || null,
        email_verified: false,
      })
      .returning();

    const newUser = newUsers[0];

    // Handle anonymous user data merge
    // Priority: 1) anonymousId from body (if provided), 2) anonymousId from cookie
    const anonymousId = validatedData.anonymousId || await getAnonymousCookie();
    if (anonymousId && newUser) {
      try {
        const userId = newUser.id;

        // Update song requests
        await db
          .update(songRequestsTable)
          .set({
            user_id: userId,
            anonymous_user_id: null,
          })
          .where(eq(songRequestsTable.anonymous_user_id, anonymousId));

        // Update payments
        await db
          .update(paymentsTable)
          .set({
            user_id: userId,
            anonymous_user_id: null,
          })
          .where(eq(paymentsTable.anonymous_user_id, anonymousId));

        // Delete anonymous user record
        await db
          .delete(anonymousUsersTable)
          .where(eq(anonymousUsersTable.id, anonymousId));

        // Clear anonymous cookie after successful merge
        await deleteAnonymousCookie();

        console.log(`Successfully merged data for anonymous user ${anonymousId} to user ${userId}`);
      } catch (mergeError) {
        console.error(`Failed to merge data for anonymous user ${validatedData.anonymousId}:`, mergeError);
        // Do not fail the registration if the merge fails. Log it for monitoring.
      }
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(emailVerificationCodesTable).values({
      user_id: newUser.id,
      code: verificationCode,
      expires_at: expiresAt,
    });

    // TODO: Send verification email (will be implemented in Phase 4)
    console.log(`Verification code for ${newUser.email}: ${verificationCode}`);

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      email: newUser.email,
      message: 'User registered successfully. Please check your email for verification code.',
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      // Format Zod errors into field-specific errors
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });

      return NextResponse.json(
        { error: 'Invalid input', fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

