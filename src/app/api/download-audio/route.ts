export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger, type ApiLoggerContext } from '@/lib/logger/api-middleware';

function sanitizeDownloadFilename(filename: string): string {
  const sanitized = filename
    .replace(/[\r\n]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim()
    .slice(0, 180);

  return sanitized || 'song.mp3';
}

function toAsciiFilename(filename: string): string {
  return filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
}

function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildContentDisposition(filename: string): string {
  const safeFilename = sanitizeDownloadFilename(filename);
  return `attachment; filename="${toAsciiFilename(safeFilename)}"; filename*=UTF-8''${encodeRFC5987Value(safeFilename)}`;
}

/**
 * Proxies an audio file download so the browser receives proper
 * Content-Disposition: attachment headers, forcing a save dialog
 * instead of opening in a new tab / media player.
 *
 * GET /api/download-audio?url=<encoded-audio-url>&filename=<optional-name>
 */
async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'song.mp3';

  if (!url) {
    logger.warn('Download audio request missing url');
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow http(s) URLs to prevent SSRF with file:// etc.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    logger.warn('Download audio request has invalid url');
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    logger.warn('Download audio request blocked invalid protocol', {
      protocol: parsed.protocol,
    });
    return NextResponse.json({ error: 'Invalid url protocol' }, { status: 400 });
  }

  try {
    const range = req.headers.get('range');
    const startedAt = Date.now();
    const upstream = await fetch(url, {
      headers: {
        Accept: 'audio/*,application/octet-stream,*/*',
        ...(range ? { Range: range } : {}),
      },
    });
    const upstreamDurationMs = Date.now() - startedAt;

    if (!upstream.ok) {
      logger.warn('Download audio upstream fetch failed', {
        host: parsed.host,
        status: upstream.status,
        duration_ms: upstreamDurationMs,
      });
      return NextResponse.json(
        { error: 'Failed to fetch audio file' },
        { status: upstream.status },
      );
    }

    if (!upstream.body) {
      logger.warn('Download audio upstream returned empty body', {
        host: parsed.host,
        status: upstream.status,
        duration_ms: upstreamDurationMs,
      });
      return NextResponse.json(
        { error: 'Audio file unavailable' },
        { status: 502 },
      );
    }

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges');
    const originalContentType =
      upstream.headers.get('content-type') || 'audio/mpeg';

    logger.info('Download audio streaming response started', {
      host: parsed.host,
      status: upstream.status,
      has_range_request: Boolean(range),
      content_length: contentLength,
      content_type: originalContentType,
      duration_ms: upstreamDurationMs,
    });

    // Stream the response body through to the client
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        // octet-stream + attachment gives iOS/Android browsers the strongest
        // signal that this is a download, not an audio preview navigation.
        'Content-Type': 'application/octet-stream',
        'X-Original-Content-Type': originalContentType,
        'Content-Disposition': buildContentDisposition(filename),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Transfer-Encoding': 'binary',
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        ...(contentRange ? { 'Content-Range': contentRange } : {}),
        ...(acceptRanges ? { 'Accept-Ranges': acceptRanges } : {}),
      },
    });
  } catch (error) {
    logger.error('Download audio proxy failed', {
      host: parsed.host,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to download audio' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('download-audio', handler);
