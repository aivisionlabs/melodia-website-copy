import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { usersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/users/me
 * Get current user's profile information
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (user instanceof NextResponse) {
      return user; // Return error response
    }

    // Get full user details from database
    const fullUser = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone_number: usersTable.phone_number,
        date_of_birth: usersTable.date_of_birth,
        profile_picture: usersTable.profile_picture,
        email_verified: usersTable.email_verified,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at,
      })
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(user.id)))
      .limit(1);

    if (!fullUser || fullUser.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = fullUser[0];
    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        created_at: userData.created_at.toISOString(),
        updated_at: userData.updated_at.toISOString(),
        date_of_birth: userData.date_of_birth
          ? userData.date_of_birth.toString()
          : null,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 * Update current user's profile information
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (user instanceof NextResponse) {
      return user; // Return error response
    }

    // Get full user details from database
    const fullUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(user.id)))
      .limit(1);

    if (!fullUser || fullUser.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, phone_number, date_of_birth, profile_picture } = body;

    // Validate name if provided
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json(
        { success: false, error: 'Invalid name' },
        { status: 400 }
      );
    }

    // Validate phone number if provided
    if (phone_number && typeof phone_number !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Validate date of birth if provided
    if (date_of_birth && typeof date_of_birth !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid date of birth' },
        { status: 400 }
      );
    }

    // Validate profile picture if provided
    if (profile_picture && typeof profile_picture !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid profile picture' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (name) {
      updateData.name = name.trim();
    }

    if (phone_number !== undefined) {
      updateData.phone_number = phone_number.trim() || null;
    }

    if (date_of_birth !== undefined) {
      updateData.date_of_birth = date_of_birth || null;
    }

    if (profile_picture !== undefined) {
      updateData.profile_picture = profile_picture || null;
    }

    // Update updated_at timestamp
    updateData.updated_at = new Date();

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, parseInt(user.id)))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone_number: usersTable.phone_number,
        date_of_birth: usersTable.date_of_birth,
        profile_picture: usersTable.profile_picture,
        email_verified: usersTable.email_verified,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at,
      });

    return NextResponse.json({
      success: true,
      user: {
        ...updated,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
        date_of_birth: updated.date_of_birth
          ? updated.date_of_birth.toString()
          : null,
      },
    });
  } catch (error) {
    console.error('Update profile failed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


