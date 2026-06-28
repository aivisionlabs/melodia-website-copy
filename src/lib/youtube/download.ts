/**
 * YouTube audio download using RapidAPI YouTube MP3 service.
 * Fetches the MP3 download link via RapidAPI and downloads the binary.
 */

import { logger } from '@/lib/logger';
import type { YouTubeVideoInfo } from './metadata';
import { fetchMp3DownloadLink, downloadMp3FromLink } from './rapidapi-client';

const MAX_DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_RETRY_DELAY_MS = 2_000;

export interface YouTubeDownloadResult {
  audioBuffer: Buffer;
  format: string;
  videoInfo: YouTubeVideoInfo;
  startSeconds?: number;
  endSeconds?: number;
}

function extractYouTubeVideoId(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid YouTube URL: ${url}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    if (id) return id;
  } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const byQuery = parsed.searchParams.get('v');
    if (byQuery) return byQuery;

    // Support URLs like /shorts/{id} and /embed/{id}
    const parts = parsed.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) {
      return parts[1];
    }
  }

  throw new Error(`Could not extract YouTube video ID from URL: ${url}`);
}

/**
 * Download audio from a YouTube URL as MP3.
 * Uses RapidAPI youtube-mp3-2025: POST with video id, then downloads from `linkDownload`.
 * The caller can use audio-processing/convert.ts if trimming is needed.
 */
export async function downloadYouTubeAudio(
  url: string,
  startSeconds?: number,
  endSeconds?: number,
): Promise<YouTubeDownloadResult> {
  const videoId = extractYouTubeVideoId(url);
  const videoInfo: YouTubeVideoInfo = {
    videoId,
    title: 'Unknown title',
    durationSeconds: 0,
    author: 'Unknown',
    isAvailable: true,
  };

  logger.info('YouTube download: fetching MP3 link via RapidAPI', {
    url,
    videoId,
  });

  let audioBuffer: Buffer | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      logger.warn('YouTube download: retrying RapidAPI conversion and MP3 fetch', {
        url,
        videoId,
        attempt,
        previousError: lastError?.message,
      });
      await sleep(DOWNLOAD_RETRY_DELAY_MS * attempt);
    }

    try {
      const mp3Link = await fetchMp3DownloadLink(videoId);
      audioBuffer = await downloadMp3FromLink(mp3Link);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_DOWNLOAD_ATTEMPTS - 1) {
        throw lastError;
      }
    }
  }

  if (!audioBuffer) {
    throw lastError ?? new Error(`RapidAPI returned an empty MP3 file for URL: ${url}`);
  }

  if (audioBuffer.length === 0) {
    throw new Error(`RapidAPI returned an empty MP3 file for URL: ${url}`);
  }

  logger.info('YouTube download: complete', {
    url,
    videoId,
    sizeBytes: audioBuffer.length,
  });

  return {
    audioBuffer,
    format: 'mp3',
    videoInfo,
    startSeconds,
    endSeconds,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
