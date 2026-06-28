/**
 * Utility functions for URL handling
 */

import { headers } from 'next/headers';

/**
 * Get the base URL of the current application
 * Uses request headers to determine the domain dynamically
 * Falls back to environment variables or localhost for development
 *
 * @returns The base URL (e.g., "https://melodia-songs.com" or "http://localhost:3000")
 */
export async function getBaseUrl(): Promise<string> {
  try {
    // Try to get the host from request headers (works in API routes, server actions, etc.)
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') ||
      (process.env.NODE_ENV === 'production' ? 'https' : 'http');

    if (host) {
      // Use host as-is (it already includes port if non-default)
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // If headers() is not available (e.g., in some contexts), fall through to env vars
    console.warn('Could not get base URL from headers, falling back to environment variables:', error);
  }

  // Fallback to environment variables
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Fallback to NEXTAUTH_URL if it exists (for backward compatibility during migration)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Final fallback: localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback (should not reach here in production, but just in case)
  return 'https://melodia-songs.com';
}

const SUNO_CDN1 = 'https://cdn1.suno.ai/';
const SUNO_CDN2 = 'https://cdn2.suno.ai/';

/**
 * Rewrites a Suno CDN URL to the configured MEDIA_BASE_URL domain for vendor-facing responses.
 * DB values are never changed — only apply this at the API response layer.
 * Falls back to the original URL if MEDIA_BASE_URL is not set (safe for dev).
 *
 * cdn1.suno.ai/FILE.mp3        → media.melodia-songs.com/FILE.mp3
 * cdn2.suno.ai/image_FILE.jpeg → media.melodia-songs.com/image_FILE.jpeg
 */
export function toMediaUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  const mediaBase = process.env.MEDIA_BASE_URL;
  if (!mediaBase) return url;
  if (url.startsWith(SUNO_CDN1)) return `${mediaBase}/${url.slice(SUNO_CDN1.length)}`;
  if (url.startsWith(SUNO_CDN2)) return `${mediaBase}/${url.slice(SUNO_CDN2.length)}`;
  return url;
}

/**
 * Synchronous version that tries to get base URL without async headers
 * Use this when you're in a context where headers() might not be available
 * or when you need a synchronous function
 *
 * @returns The base URL
 */
export function getBaseUrlSync(): string {
  // Try environment variables first
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Fallback to NEXTAUTH_URL if it exists (for backward compatibility during migration)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback
  return 'https://melodia-songs.com';
}

const MELODIA_LOGO_PATH = '/images/optimized/logo-medium.png';

function isTempfileImageHost(url: string): boolean {
  try {
    if (!/^https?:\/\//i.test(url)) return false;
    return new URL(url).hostname.toLowerCase().startsWith('tempfile');
  } catch {
    return false;
  }
}

/**
 * Absolute URL for the public Melodia logo (used in API responses when cover art
 * is a temporary host that should not be exposed to clients).
 */
export function melodiaLogoUrlForApi(): string {
  const base = getBaseUrlSync().replace(/\/$/, '');
  return `${base}${MELODIA_LOGO_PATH}`;
}

/**
 * If the image URL is served from a host whose name starts with `tempfile` (temp storage),
 * return the Melodia logo URL; otherwise return the input unchanged.
 */
export function preferMelodiaLogoOverTempfileSourceImage(
  url: string | null | undefined,
): string | null {
  if (url == null || url === '') return url ?? null;
  if (isTempfileImageHost(url)) return melodiaLogoUrlForApi();
  return url;
}

function mapOneVariantForResponse<T extends Record<string, unknown>>(v: T): T {
  const primary = (v?.sourceImageUrl ?? v?.imageUrl) as string | undefined;
  if (!primary || !isTempfileImageHost(primary)) return v;
  const logo = melodiaLogoUrlForApi();
  return { ...v, sourceImageUrl: logo, imageUrl: logo } as T;
}

/**
 * Response-only: replace tempfile cover URLs on song variants. Does not mutate input.
 */
export function mapSongVariantsSourceImagesForResponse<T extends Record<string, unknown>>(
  variants: T[] | null | undefined,
): T[] | null | undefined {
  if (variants == null) return variants;
  return variants.map((item) => mapOneVariantForResponse(item));
}

/**
 * Response-only: same as mapSongVariantsSourceImagesForResponse but supports object-shaped variant maps.
 */
export function mapSongVariantsRecordForResponse(
  variants: unknown,
): unknown {
  if (variants == null) return variants;
  if (Array.isArray(variants)) {
    return (variants as Record<string, unknown>[]).map((v) =>
      v && typeof v === 'object' ? mapOneVariantForResponse(v as Record<string, unknown>) : v,
    );
  }
  if (typeof variants === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(variants as Record<string, unknown>)) {
      out[k] =
        v && typeof v === 'object' && !Array.isArray(v)
          ? mapOneVariantForResponse(v as Record<string, unknown>)
          : v;
    }
    return out;
  }
  return variants;
}

