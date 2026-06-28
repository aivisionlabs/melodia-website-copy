/**
 * Cookie Management Utilities
 * Handles setting and getting authentication cookies
 */

import { cookies } from 'next/headers';

const COOKIE_PREFIX = 'melodia';
const AUTH_COOKIE = `${COOKIE_PREFIX}.auth-token`;
const ANONYMOUS_COOKIE = `${COOKIE_PREFIX}.anonymous-id`;

/**
 * Cookie options for security
 */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Set authentication token cookie
 */
export async function setAuthCookie(token: string, maxAge: number = 7 * 24 * 60 * 60) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    ...cookieOptions,
    maxAge,
  });
}

/**
 * Get authentication token from cookie
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value;
}

/**
 * Delete authentication token cookie
 */
export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

/**
 * Set anonymous user ID cookie
 */
export async function setAnonymousCookie(anonymousId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ANONYMOUS_COOKIE, anonymousId, {
    ...cookieOptions,
    maxAge: 90 * 24 * 60 * 60, // 90 days for anonymous users
  });
}

/**
 * Get anonymous user ID from cookie
 */
export async function getAnonymousCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_COOKIE)?.value;
}

/**
 * Delete anonymous user ID cookie
 */
export async function deleteAnonymousCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ANONYMOUS_COOKIE);
}

/**
 * Get all auth-related cookies
 */
export async function getAuthCookies() {
  return {
    authToken: await getAuthCookie(),
    anonymousId: await getAnonymousCookie(),
  };
}

/**
 * Clear all auth-related cookies
 */
export async function clearAllAuthCookies() {
  await deleteAuthCookie();
  await deleteAnonymousCookie();
}

