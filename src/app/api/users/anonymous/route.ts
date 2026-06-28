/**
 * Anonymous User API
 * GET /api/users/anonymous
 * Creates or retrieves an anonymous user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anonymousUsersTable } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { setAnonymousCookie, getAnonymousCookie } from '@/lib/auth/cookies';

export async function GET(req: NextRequest) {
  try {
    // Check if anonymous ID exists in cookie
    const existingId = await getAnonymousCookie();

    if (existingId) {
      // Verify the ID exists in database
      const users = await db
        .select()
        .from(anonymousUsersTable)
        .where(eq(anonymousUsersTable.id, existingId))
        .limit(1);

      if (users.length > 0) {
        return NextResponse.json({
          anonymousUserId: existingId,
          isNew: false,
        });
      }
    }

    // Create new anonymous user
    // Use sql to explicitly call gen_random_uuid() for UUID generation
    const newUsers = await db
      .insert(anonymousUsersTable)
      .values({
        id: sql`gen_random_uuid()`,
      })
      .returning();

    const newUser = newUsers[0];

    // Set cookie
    await setAnonymousCookie(newUser.id);

    return NextResponse.json({
      anonymousUserId: newUser.id,
      isNew: true,
    });
  } catch (error) {
    console.error('Anonymous user creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create anonymous session' },
      { status: 500 }
    );
  }
}

