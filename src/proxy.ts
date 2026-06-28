import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Headers we never log even in sanitised form
const REDACT_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-razorpay-signature',
  'x-cashfree-signature',
]);

/**
 * Proxy to handle canonical domain redirects + global request capture.
 *
 * Runs on every matched request (Edge Runtime):
 * 1. Assigns / propagates a unique requestId via x-request-id header
 * 2. Emits a structured JSON log to stdout (captured by Vercel Log Drains)
 * 3. Enforces canonical domain redirects
 */
export function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // --- Global request capture ---
  const entry = {
    event: 'request_received',
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined,
    referer: request.headers.get('referer') || undefined,
    contentType: request.headers.get('content-type') || undefined,
    contentLength: request.headers.get('content-length') || undefined,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    app: 'melodia',
  };
  console.log(JSON.stringify(entry));

  // Propagate requestId into upstream request headers
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.set('x-request-id', requestId);

  // --- Canonical domain redirects ---
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Skip redirects for localhost and development environments
  if (
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('vercel.app') ||
    hostname.includes('.local')
  ) {
    const response = NextResponse.next({ request: { headers: upstreamHeaders } });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  const canonicalHost = 'www.melodia-songs.com';
  const apiHost = 'api.melodia-songs.com';

  // API subdomain: only allow /api/* paths — redirect everything else to www
  if (hostname === apiHost) {
    if (!url.pathname.startsWith('/api/')) {
      return NextResponse.redirect(
        new URL(url.pathname + url.search, `https://${canonicalHost}`),
        301,
      );
    }
    const response = NextResponse.next({ request: { headers: upstreamHeaders } });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // Redirect non-canonical melodia-songs.com domains (e.g. without www)
  if (hostname !== canonicalHost && hostname.includes('melodia-songs.com')) {
    return NextResponse.redirect(
      new URL(url.pathname + url.search, `https://${canonicalHost}`),
      301,
    );
  }

  const response = NextResponse.next({ request: { headers: upstreamHeaders } });
  response.headers.set('x-request-id', requestId);
  return response;
}

// Configure which paths the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|json|txt|xml)$).*)',
  ],
};
