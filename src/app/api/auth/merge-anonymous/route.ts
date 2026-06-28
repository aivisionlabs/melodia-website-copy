import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { songRequestsTable, paymentsTable, anonymousUsersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAnonymousCookie, deleteAnonymousCookie } from '@/lib/auth/cookies';

// POST /api/auth/merge-anonymous
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const anonymousId = await getAnonymousCookie();

    // Validate anonymousId if present
    if (!anonymousId) {
      return NextResponse.json({ success: true, merged: false, message: 'No anonymousId cookie found' });
    }

    const uuidSchema = z.string().uuid();
    const parsed = uuidSchema.safeParse(anonymousId);
    if (!parsed.success) {
      // Clear invalid cookie to avoid repeated errors
      await deleteAnonymousCookie();
      return NextResponse.json({ success: false, error: 'Invalid anonymousId format' }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);

    // Merge song requests
    await db
      .update(songRequestsTable)
      .set({ user_id: userId, anonymous_user_id: null })
      .where(eq(songRequestsTable.anonymous_user_id, anonymousId));

    // Merge payments
    await db
      .update(paymentsTable)
      .set({ user_id: userId, anonymous_user_id: null })
      .where(eq(paymentsTable.anonymous_user_id, anonymousId));

    // Delete anonymous user record
    await db
      .delete(anonymousUsersTable)
      .where(eq(anonymousUsersTable.id, anonymousId));

    // Clear cookie
    await deleteAnonymousCookie();

    return NextResponse.json({ success: true, merged: true });
  } catch (error) {
    console.error('merge-anonymous error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

