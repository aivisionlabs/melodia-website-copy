/**
 * Logging Utilities
 *
 * Helper functions for debugging, log viewing, and troubleshooting
 */

import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger, getLogConfig } from './index';

/**
 * Log system information and configuration
 * Useful for debugging deployment issues
 */
export function logSystemInfo() {
  const config = getLogConfig();

  logger.info('System configuration', {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV,
    log_level: config.level,
    debug_mode: config.debugMode,
    pretty_print: config.prettyPrint,
  });
}

/**
 * Log environment variables (without exposing secrets)
 * Useful for debugging configuration issues
 */
export function logEnvironmentInfo() {
  const safeEnvVars = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEBUG_MODE: process.env.DEBUG_MODE,
    LOG_PRETTY: process.env.LOG_PRETTY,
    DEMO_MODE: isDemoModeEnabled(),
    // Add other non-sensitive env vars as needed
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID ? '✓ Set' : '✗ Not set',
    SUNO_API_KEY: process.env.SUNO_API_KEY ? '✓ Set' : '✗ Not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Not set',
  };

  logger.info('Environment configuration', safeEnvVars);
}

/**
 * Create a structured error log with full context
 * Use this for catching and logging errors with maximum detail
 */
export function logStructuredError(
  error: Error | unknown,
  context: {
    operation: string;
    userId?: string;
    requestId?: string;
    additionalData?: Record<string, any>;
  }
) {
  const errorDetails = error instanceof Error
    ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
    : {
      message: String(error),
    };

  logger.error('Structured error log', {
    ...context,
    error: errorDetails,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Performance monitoring helper
 * Wraps a function and logs its execution time
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const operationId = Math.random().toString(36).substring(7);

    logger.debug(`[PERF] ${operationName} started`, {
      operationId,
      args: args.map((arg) => typeof arg === 'object' ? '(object)' : arg),
    });

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      logger.info(`[PERF] ${operationName} completed`, {
        operationId,
        duration_ms: duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`[PERF] ${operationName} failed`, {
        operationId,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }) as T;
}

/**
 * Debug helper: Log function call with arguments
 * Use this to trace function executions in debug mode
 */
export function logFunctionCall(
  functionName: string,
  args: Record<string, any> = {},
  result?: any
) {
  logger.debug(`[TRACE] ${functionName}`, {
    args,
    hasResult: result !== undefined,
    resultType: result ? typeof result : undefined,
  });
}

/**
 * Log memory usage
 * Useful for detecting memory leaks
 */
export function logMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();

    logger.debug('Memory usage', {
      rss_mb: Math.round(usage.rss / 1024 / 1024),
      heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
      heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
      external_mb: Math.round(usage.external / 1024 / 1024),
    });
  }
}

/**
 * Create a request context logger for API routes
 * Automatically adds request metadata to all logs
 */
export function createRequestLogger(req: {
  method?: string;
  url?: string;
  headers?: Headers | Record<string, string>;
}) {
  const requestId = Math.random().toString(36).substring(7);

  return {
    requestId,
    info: (message: string, context?: Record<string, any>) => {
      logger.info(message, {
        requestId,
        method: req.method,
        url: req.url,
        ...context,
      });
    },
    debug: (message: string, context?: Record<string, any>) => {
      logger.debug(message, {
        requestId,
        method: req.method,
        url: req.url,
        ...context,
      });
    },
    warn: (message: string, context?: Record<string, any>) => {
      logger.warn(message, {
        requestId,
        method: req.method,
        url: req.url,
        ...context,
      });
    },
    error: (message: string, errorOrContext?: Error | Record<string, any>) => {
      logger.error(message, {
        requestId,
        method: req.method,
        url: req.url,
        ...(errorOrContext instanceof Error
          ? { error: errorOrContext }
          : errorOrContext),
      });
    },
  };
}

/**
 * Batch log multiple events
 * Useful for logging multiple related events at once
 */
export function logBatch(events: Array<{
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}>) {
  events.forEach((event) => {
    logger[event.level](event.message, event.context);
  });
}

/**
 * Log API response details
 * Use this to log outgoing API responses
 */
export function logApiResponse(
  statusCode: number,
  duration: number,
  context?: Record<string, any>
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level]('API response', {
    statusCode,
    duration_ms: duration,
    statusCategory:
      statusCode >= 500 ? 'server_error' :
        statusCode >= 400 ? 'client_error' :
          statusCode >= 300 ? 'redirect' :
            statusCode >= 200 ? 'success' :
              'informational',
    ...context,
  });
}

/**
 * Enable debug mode programmatically (sets process.env.DEBUG_MODE).
 * Note: Logger config is read at module load in @/lib/logger. For this change
 * to take effect you may need to restart the process or ensure the logger
 * module is re-evaluated.
 */
export function enableDebugMode() {
  process.env.DEBUG_MODE = 'true';
  logger.info('Debug mode enabled programmatically');
}

/**
 * Disable debug mode programmatically (sets process.env.DEBUG_MODE).
 * Note: Logger config is read at module load; a process restart may be needed
 * for the change to take effect.
 */
export function disableDebugMode() {
  process.env.DEBUG_MODE = 'false';
  logger.info('Debug mode disabled programmatically');
}

/**
 * Check if debug mode is enabled (from config read at logger module load).
 */
export function isDebugMode(): boolean {
  return getLogConfig().debugMode;
}




