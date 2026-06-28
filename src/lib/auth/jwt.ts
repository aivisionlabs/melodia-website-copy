/**
 * JWT Token Utilities
 * Handles JWT signing and verification
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production';

if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️  NEXTAUTH_SECRET not set, using default secret (NOT SECURE FOR PRODUCTION)');
}

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  emailVerified: boolean;
}

/**
 * Sign a JWT token
 */
export function signToken(payload: JWTPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode a JWT token without verification (for inspection only)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a password reset token
 */
export function generateResetToken(email: string): string {
  return signToken(
    {
      userId: 0, // Not needed for reset token
      email,
      name: '',
      emailVerified: false
    },
    '1h' // 1 hour expiration
  );
}

/**
 * Verify a password reset token
 */
export function verifyResetToken(token: string): string {
  const payload = verifyToken(token);
  return payload.email;
}

/**
 * Generate a unique request ID for tracking API requests
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

