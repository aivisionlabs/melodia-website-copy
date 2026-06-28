/**
 * Authentication Middleware
 * Validates user sessions and protects routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * Get current user from request
 */
export async function getCurrentUser(req: NextRequest) {
  try {
    const token = await getToken({ req, secret });

    if (!token || !token.email) {
      return null;
    }

    return {
      id: token.id as string,
      email: token.email,
      name: token.name || '',
      emailVerified: (token as any).emailVerified || false,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication for a route
 */
export async function requireAuth(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Require email verification
 */
export async function requireEmailVerification(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Email verification required' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const user = await getCurrentUser(req);
  return user !== null;
}

/**
 * Get user ID from request
 */
export async function getUserId(req: NextRequest): Promise<string | null> {
  const user = await getCurrentUser(req);
  return user?.id || null;
}

/**
 * Middleware for protected API routes
 */
export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await requireAuth(req);

    if (user instanceof NextResponse) {
      return user; // Return error response
    }

    return handler(req, user);
  };
}

/**
 * Middleware for routes requiring email verification
 */
export function withEmailVerification(
  handler: (req: NextRequest, user: any) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const user = await requireEmailVerification(req);

    if (user instanceof NextResponse) {
      return user; // Return error response
    }

    return handler(req, user);
  };
}

