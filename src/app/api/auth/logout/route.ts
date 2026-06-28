/**
 * Logout API
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAllAuthCookies } from '@/lib/auth/cookies';

export async function POST(req: NextRequest) {
  try {
    // Clear all authentication cookies
    await clearAllAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

