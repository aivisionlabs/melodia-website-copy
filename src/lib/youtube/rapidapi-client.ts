/**
 * RapidAPI YouTube MP3 2025 client.
 * Calls the youtube-mp3-2025 API to convert a YouTube URL to a downloadable MP3 link.
 */

import { logger } from '@/lib/logger';

const RAPIDAPI_HOST = 'youtube-mp3-2025.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_500;
const DOWNLOAD_PROGRESS_TIMEOUT_MS = 120_000;
const CDN_DOWNLOAD_TIMEOUT_MS = 120_000;
const CDN_DOWNLOAD_HEADERS = {
  Accept: '*/*',
  Referer: 'https://www.youtube.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Response shape from POST /v1/social/youtube/audio (youtube-mp3-2025).
 * Audio is fetched via `linkDownload` (direct file URL, often m4a per CDN query params).
 */
interface RapidApiYoutubeAudioJson {
  error?: boolean;
  linkDownload?: string;
  linkDownloadProgress?: string;
  linkStream?: string;
  message?: string;
  link?: string;
  url?: string;
  downloadUrl?: string;
  audio?: string;
  mp3?: string;
}

interface RapidApiAudioLinks {
  downloadUrl: string;
  progressUrl?: string;
}

interface SseProgressResult {
  downloadUrl?: string;
  errorMessage?: string;
}

function parseCdnJsonError(body: string): string | undefined {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) {
    return undefined;
  }

  try {
    const data = JSON.parse(trimmed) as {
      message?: unknown;
      error?: unknown;
      status?: unknown;
    };
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function parseSseProgressBody(body: string): SseProgressResult {
  let downloadUrl: string | undefined;
  let errorMessage: string | undefined;

  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith('data:')) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload.startsWith('{')) {
      continue;
    }

    try {
      const data = JSON.parse(payload) as {
        download_url?: unknown;
        message?: unknown;
        status?: unknown;
      };

      if (data.status === 'error' || data.status === 'failed') {
        errorMessage =
          typeof data.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'CDN conversion failed';
      }

      if (typeof data.download_url === 'string' && data.download_url.startsWith('http')) {
        downloadUrl = data.download_url;
      }
    } catch {
      // Ignore malformed SSE payloads and keep scanning.
    }
  }

  return { downloadUrl, errorMessage };
}

/**
 * Parse the RapidAPI audio response body.
 * Prefers `linkDownload`; falls back to other common field names.
 */
function parseRapidApiAudioLinks(body: string): RapidApiAudioLinks {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('RapidAPI returned an empty body');
  }

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed) as RapidApiYoutubeAudioJson;
      if (data.error === true) {
        const msg =
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'RapidAPI reported error: true';
        throw new Error(msg);
      }

      const downloadUrl =
        (typeof data.linkDownload === 'string' && data.linkDownload) ||
        (typeof data.linkStream === 'string' && data.linkStream) ||
        (typeof data.link === 'string' && data.link) ||
        (typeof data.url === 'string' && data.url) ||
        (typeof data.downloadUrl === 'string' && data.downloadUrl) ||
        (typeof data.audio === 'string' && data.audio) ||
        (typeof data.mp3 === 'string' && data.mp3);

      if (downloadUrl && downloadUrl.startsWith('http')) {
        const progressUrl =
          typeof data.linkDownloadProgress === 'string' && data.linkDownloadProgress.startsWith('http')
            ? data.linkDownloadProgress
            : undefined;
        return { downloadUrl, progressUrl };
      }

      throw new Error(
        `RapidAPI JSON missing linkDownload (or fallback URL): "${trimmed.slice(0, 200)}"`,
      );
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('RapidAPI')) throw e;
      // not JSON or parse error — fall through
    }
  }

  if (trimmed.startsWith('http')) {
    return { downloadUrl: trimmed };
  }

  throw new Error(`RapidAPI returned invalid download link: "${trimmed.slice(0, 200)}"`);
}

async function waitForRapidApiDownloadReady(
  progressUrl: string,
  videoId: string,
  fallbackDownloadUrl: string,
): Promise<string> {
  logger.info('RapidAPI YouTube MP3: waiting for CDN conversion', {
    videoId,
    progressUrl: progressUrl.slice(0, 120),
  });

  const response = await fetch(progressUrl, {
    headers: {
      ...CDN_DOWNLOAD_HEADERS,
      Accept: 'text/event-stream, application/json, */*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_PROGRESS_TIMEOUT_MS),
  });

  const body = await response.text();

  if (!response.ok) {
    const cdnError = parseCdnJsonError(body);
    throw new Error(
      cdnError ?? `CDN progress returned ${response.status}: ${response.statusText}`,
    );
  }

  const { downloadUrl, errorMessage } = parseSseProgressBody(body);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (downloadUrl) {
    logger.info('RapidAPI YouTube MP3: CDN conversion completed', {
      videoId,
      downloadUrl: downloadUrl.slice(0, 120),
    });
    return downloadUrl;
  }

  logger.warn('RapidAPI YouTube MP3: CDN progress missing completed event; using initial linkDownload', {
    videoId,
    fallbackDownloadUrl: fallbackDownloadUrl.slice(0, 120),
  });
  return fallbackDownloadUrl;
}

function getApiKey(): string {
  const key = process.env.RAPIDAPI_KEY?.trim();
  if (!key) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }
  return key;
}

/**
 * Fetch the audio download link for a YouTube video via RapidAPI.
 * Uses the video id in the request body (`{ id }`) as required by youtube-mp3-2025.
 * Returns `linkDownload` from the JSON response (direct CDN URL to the audio file).
 */
export async function fetchMp3DownloadLink(videoId: string): Promise<string> {
  const apiKey = getApiKey();
  const endpoint = `${BASE_URL}/v1/social/youtube/audio`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      logger.warn('RapidAPI YouTube MP3: retrying', {
        attempt,
        videoId,
        previousError: lastError?.message,
      });
      await sleep(RETRY_DELAY_MS * attempt);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: videoId }),
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 429) {
        lastError = new Error(`RapidAPI rate limited (429). Retry after cooldown.`);
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `RapidAPI returned ${response.status}: ${body || response.statusText}`,
        );
      }

      const rawBody = await response.text();
      const { downloadUrl, progressUrl } = parseRapidApiAudioLinks(rawBody);
      const mp3Link = progressUrl
        ? await waitForRapidApiDownloadReady(progressUrl, videoId, downloadUrl)
        : downloadUrl;

      logger.info('RapidAPI YouTube MP3: got download link', {
        videoId,
        attempt,
        waitedForProgress: Boolean(progressUrl),
      });

      return mp3Link;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'TimeoutError' || lastError.name === 'AbortError') {
        logger.warn('RapidAPI YouTube MP3: request timed out', {
          videoId,
          attempt,
        });
        continue;
      }

      if (attempt === MAX_RETRIES) break;

      const isTransient =
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('socket hang up');

      if (!isTransient) break;
    }
  }

  logger.error('RapidAPI YouTube MP3: all attempts failed', {
    videoId,
    error: lastError?.message,
  });

  throw new Error(
    `Failed to get MP3 download link from RapidAPI for video ${videoId}: ${lastError?.message ?? 'unknown error'}`,
  );
}

/**
 * Download the MP3 binary from a direct link returned by RapidAPI.
 * Retries up to MAX_RETRIES times on transient network errors, timeouts, and 5xx responses.
 */
export async function downloadMp3FromLink(mp3Link: string): Promise<Buffer> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      logger.warn('RapidAPI YouTube MP3: retrying MP3 download', {
        attempt,
        mp3Link: mp3Link.slice(0, 120),
        previousError: lastError?.message,
      });
      await sleep(RETRY_DELAY_MS * attempt);
    }

    try {
      const response = await fetch(mp3Link, {
        headers: CDN_DOWNLOAD_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(CDN_DOWNLOAD_TIMEOUT_MS),
      });

      if (response.status >= 500) {
        const body = await response.text().catch(() => '');
        const cdnError = parseCdnJsonError(body);
        lastError = new Error(
          cdnError
            ? `MP3 download server error (${response.status}): ${cdnError}`
            : `MP3 download server error (${response.status}): ${response.statusText}`,
        );
        break;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const cdnError = parseCdnJsonError(body);
        throw new Error(
          cdnError
            ? `Failed to download MP3 file (${response.status}): ${cdnError}`
            : `Failed to download MP3 file (${response.status}): ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        lastError = new Error(`Downloaded MP3 file is empty from: ${mp3Link}`);
        continue;
      }

      logger.info('RapidAPI YouTube MP3: downloaded MP3 file', {
        mp3Link: mp3Link.slice(0, 120),
        sizeBytes: buffer.length,
        attempt,
      });

      return buffer;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'TimeoutError' || lastError.name === 'AbortError') {
        logger.warn('RapidAPI YouTube MP3: MP3 download timed out', {
          mp3Link: mp3Link.slice(0, 120),
          attempt,
        });
        continue;
      }

      if (attempt === MAX_RETRIES) break;

      const isTransient =
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('socket hang up');

      if (!isTransient) break;
    }
  }

  logger.error('RapidAPI YouTube MP3: all MP3 download attempts failed', {
    mp3Link: mp3Link.slice(0, 120),
    error: lastError?.message,
  });

  throw new Error(
    `Failed to download MP3 file after ${MAX_RETRIES + 1} attempts: ${lastError?.message ?? 'unknown error'}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
