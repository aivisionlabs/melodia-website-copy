/**
 * API Logging Middleware
 *
 * Provides automatic logging for API routes with:
 * - Request/response logging
 * - Unique request ID tracking
 * - Performance timing
 * - Error context preservation
 * - Automatic sensitive data redaction
 *
 * Usage:
 * ```ts
 * import { withApiLogger } from '@/lib/logger/api-middleware';
 *
 * export const POST = withApiLogger('create-song-request', async (req, { logger }) => {
 *   logger.info('Processing request', { userId: 123 });
 *   // ... your logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createContextLogger, logger as baseLogger } from './index';

export interface ApiLoggerContext {
  logger: ReturnType<typeof createContextLogger>;
  requestId: string;
  startTime: number;
}

type ApiHandler = (
  req: NextRequest,
  context: any
) => Promise<Response> | Response;

/**
 * Wrap an API route handler with automatic logging
 *
 * @param routeName - Name of the API route (e.g., 'generate-lyrics')
 * @param handler - The actual route handler
 * @returns Wrapped handler with logging
 */
export function withApiLogger(routeName: string, handler: ApiHandler) {
  return async (req: NextRequest, ...args: any[]): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') || uuidv4();
    const startTime = Date.now();

    // Create logger with request context (fail-safe)
    let logger: ReturnType<typeof createContextLogger>;
    try {
      logger = createContextLogger({
        requestId,
        route: routeName,
        method: req.method,
        url: req.url,
      });
    } catch (error) {
      // Fallback to base logger if context logger fails
      console.error('⚠️ Failed to create context logger, using base logger:', error);
      logger = baseLogger as any;
    }

    // Log incoming request with body (fail-safe)
    try {
      const bodySnippet = await captureRequestBody(req);
      logger.info('API request started', {
        headers: sanitizeHeaders(req.headers),
        userAgent: req.headers.get('user-agent'),
        query: Object.fromEntries(new URL(req.url).searchParams.entries()),
        ...(bodySnippet !== undefined ? { body: bodySnippet } : {}),
      });
    } catch (error) {
      console.error('⚠️ Failed to log API request start:', error);
    }

    try {
      // Merge logger into the context argument (args[0] if exists)
      const context = {
        ...(args[0] || {}),
        logger,
        requestId,
        startTime,
      };

      // Execute the handler
      const response = await handler(req, context);

      // Log successful response (fail-safe)
      try {
        const duration = Date.now() - startTime;
        logger.info('API request completed', {
          status: response.status,
          duration_ms: duration,
        });
      } catch (error) {
        console.error('⚠️ Failed to log API request completion:', error);
      }

      // Add request ID to response headers
      try {
        response.headers.set('x-request-id', requestId);
      } catch (error) {
        console.error('⚠️ Failed to set request ID header:', error);
      }

      return response;
    } catch (error) {
      // Log error (fail-safe)
      try {
        const duration = Date.now() - startTime;
        logger.error('API request failed', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : String(error),
          duration_ms: duration,
        });
      } catch (logError) {
        console.error('⚠️ Failed to log API request error:', logError);
      }

      // Re-throw to let Next.js handle it
      throw error;
    }
  };
}

/**
 * Extract and sanitize headers for logging
 * Removes sensitive headers like authorization tokens
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Capture the request body without consuming the original stream.
 * Clones the request so the actual handler still gets a fresh readable body.
 * Returns undefined for GET/HEAD (no body), or for bodies > maxSize.
 */
async function captureRequestBody(
  req: NextRequest,
  maxSize: number = 10_000,
): Promise<unknown> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return undefined;

  try {
    const clone = req.clone();
    const text = await clone.text();

    if (!text) return undefined;

    if (text.length > maxSize) {
      return { _truncated: true, size: text.length, preview: text.substring(0, 500) };
    }

    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { return JSON.parse(text); } catch { /* fall through to raw */ }
    }
    return text;
  } catch {
    return undefined;
  }
}

/**
 * Log API request body (with size limit)
 * Use this for debugging request payloads
 */
export async function logRequestBody(
  req: NextRequest,
  logger: ReturnType<typeof createContextLogger>,
  maxSize: number = 10000 // 10KB default
) {
  try {
    const body = await req.text();
    if (body.length > maxSize) {
      logger.debug('Request body (truncated)', {
        size: body.length,
        preview: body.substring(0, 500) + '...',
      });
    } else {
      try {
        const parsed = JSON.parse(body);
        logger.debug('Request body', { body: parsed });
      } catch {
        logger.debug('Request body (raw)', { body });
      }
    }
  } catch (error) {
    logger.warn('Failed to log request body', { error });
  }
}

/**
 * Create timing markers for long-running operations
 */
export class ApiTimer {
  private markers: Map<string, number> = new Map();
  private logger: ReturnType<typeof createContextLogger>;
  private startTime: number;

  constructor(logger: ReturnType<typeof createContextLogger>, startTime: number) {
    this.logger = logger;
    this.startTime = startTime;
  }

  /**
   * Mark a point in time
   */
  mark(label: string) {
    const elapsed = Date.now() - this.startTime;
    this.markers.set(label, elapsed);
    this.logger.debug(`[TIMING] ${label}`, { elapsed_ms: elapsed });
  }

  /**
   * Get all timing markers
   */
  getMarkers(): Record<string, number> {
    return Object.fromEntries(this.markers);
  }

  /**
   * Log final timing summary
   */
  logSummary() {
    const total = Date.now() - this.startTime;
    this.logger.info('Timing summary', {
      total_ms: total,
      markers: this.getMarkers(),
    });
  }
}

/**
 * Helper to create API timer
 */
export function createApiTimer(context: ApiLoggerContext): ApiTimer {
  return new ApiTimer(context.logger, context.startTime);
}

/**
 * Middleware for database query logging
 * Use this to track database performance
 */
export function logDatabaseQuery(
  logger: ReturnType<typeof createContextLogger>,
  operation: string,
  table: string,
  startTime: number
) {
  const duration = Date.now() - startTime;
  logger.debug(`[DB] ${operation}`, {
    table,
    duration_ms: duration,
  });
}



