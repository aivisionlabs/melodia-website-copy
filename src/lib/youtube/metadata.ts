/**
 * YouTube video metadata extraction using the free YouTube oEmbed API.
 */

import { logger } from '@/lib/logger';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  durationSeconds: number;
  author: string;
  isAvailable: boolean;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
}

function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'youtu.be' || host.endsWith('.youtube.com') || host === 'youtube.com';
  } catch {
    return false;
  }
}

/** Extract the 11-char video id from any supported YouTube URL shape. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const byQuery = parsed.searchParams.get('v');
      if (byQuery) return byQuery;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) {
        return parts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** Canonical watch URL (strips playlist / radio query params that can confuse oEmbed). */
export function normalizeYouTubeUrl(url: string): string {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error(`Could not extract video ID from URL: ${url}`);
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Fetch metadata for a YouTube video using the free oEmbed endpoint.
 * Duration is not available via oEmbed and is set to 0.
 */
export async function getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  if (!isValidYouTubeUrl(url)) {
    throw new Error(`Invalid YouTube URL: ${url}`);
  }

  const canonicalUrl = normalizeYouTubeUrl(url);
  const videoId = extractYouTubeVideoId(canonicalUrl)!;

  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  try {
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    // 404 — video removed or private. 401/403 — embedding disabled or restricted for
    // oEmbed; the video can still play on youtube.com and may still be downloadable.
    if (response.status === 404) {
      logger.warn('YouTube oEmbed: video not found', { url: canonicalUrl, status: response.status });
      return {
        videoId,
        title: 'Unknown title',
        durationSeconds: 0,
        author: 'Unknown',
        isAvailable: false,
      };
    }

    if (response.status === 401 || response.status === 403) {
      logger.info('YouTube oEmbed: metadata restricted (embed disabled); accepting by video id', {
        url: canonicalUrl,
        status: response.status,
      });
      return {
        videoId,
        title: 'Unknown title',
        durationSeconds: 0,
        author: 'Unknown',
        isAvailable: true,
      };
    }

    if (!response.ok) {
      throw new Error(`YouTube oEmbed returned ${response.status}: ${response.statusText}`);
    }

    const data: OEmbedResponse = await response.json();

    logger.info('YouTube oEmbed: fetched metadata', { videoId, title: data.title, url: canonicalUrl });

    return {
      videoId,
      title: data.title ?? 'Unknown title',
      durationSeconds: 0,
      author: data.author_name ?? 'Unknown',
      isAvailable: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('YouTube oEmbed: metadata fetch failed', { url, error: msg });
    throw new Error(`Unable to fetch YouTube metadata for ${url}: ${msg}`);
  }
}

/**
 * Validate that a YouTube URL is valid and the video is publicly accessible.
 */
export async function validateYouTubeUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!isValidYouTubeUrl(url)) {
      return { valid: false, error: 'Invalid YouTube URL format' };
    }
    const info = await getYouTubeVideoInfo(url);
    if (!info.isAvailable) {
      return { valid: false, error: 'Video is private or unavailable' };
    }
    return { valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  }
}
