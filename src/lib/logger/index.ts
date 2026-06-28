/**
 * Melodia Logger
 *
 * Zero-cost, production-ready logging system with:
 * - Structured JSON logging
 * - Request tracking with unique IDs
 * - Automatic sensitive data redaction
 * - Debug mode toggle
 * - Performance timing
 * - Error context preservation
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User created', { userId: 123 });
 * logger.error('Payment failed', { error, orderId });
 * logger.debug('API request', { url, params });
 * ```
 */

import { getLoggerConfig, shouldLogLevel } from './config';

/** Config is read once at module load; env changes (e.g. DEBUG_MODE) require restart to take effect. */
const config = getLoggerConfig();

// Lazy import storage only on server-side to avoid importing DB in client components
let storeLogPromise: Promise<typeof import('./storage').storeLog> | null = null;
const getStoreLog = async () => {
  if (typeof window !== 'undefined') {
    // Client-side: return a no-op function
    return async () => {};
  }
  // Server-side: dynamically import storage
  if (!storeLogPromise) {
    storeLogPromise = import('./storage').then(m => m.storeLog);
  }
  return storeLogPromise;
};

/**
 * Fallback console logger - used when Pino fails
 * This ensures the app never crashes due to logging issues
 */
const createFallbackLogger = () => ({
  debug: (msg: string, context?: any) => {
    if (config.debugMode || config.level === 'debug') {
      console.log(`[DEBUG] ${msg}`, context || '');
    }
  },
  info: (msg: string, context?: any) => {
    if (shouldLogLevel('info', config.level)) console.log(`[INFO] ${msg}`, context || '');
  },
  warn: (msg: string, context?: any) => {
    if (shouldLogLevel('warn', config.level)) console.warn(`[WARN] ${msg}`, context || '');
  },
  error: (msg: string, context?: any) => {
    if (shouldLogLevel('error', config.level)) console.error(`[ERROR] ${msg}`, context || '');
  },
  fatal: (msg: string, context?: any) => {
    if (shouldLogLevel('fatal', config.level)) console.error(`[FATAL] ${msg}`, context || '');
  },
  child: () => createFallbackLogger(),
});

type FallbackLogger = ReturnType<typeof createFallbackLogger>;

/**
 * Create Pino logger with fail-safe configuration
 * Avoids worker threads that cause issues in Next.js
 */
function createPinoLogger(): any | FallbackLogger {
  // Production-ready structured logger with redaction
  // Uses JSON formatting to stdout (free on all platforms)

  const structuredLogger = {
    _log(level: string, msg: string, context?: any) {
      const timestamp = new Date().toISOString();
      const logData: any = {
        level,
        time: timestamp,
        env: process.env.NODE_ENV || 'development',
        app: 'melodia',
        msg,
      };

      // Add context, redacting sensitive keys
      if (context) {
        const sanitized = { ...context };
        config.redactKeys.forEach(key => {
          if (key in sanitized) {
            sanitized[key] = '[REDACTED]';
          }
        });
        Object.assign(logData, sanitized);
      }

      // Output to stdout (Vercel logs - 1 day retention, FREE)
      if (config.isProduction) {
        console.log(JSON.stringify(logData));
      } else {
        console.log(`[${level.toUpperCase()}] ${msg}`, context || '');
      }

      // Store in PostgreSQL (7-30 day retention, FREE)
      // Fire-and-forget async write - never blocks the app
      if (typeof window === 'undefined') { // Only on server-side
        getStoreLog().then(storeLogFn => {
          storeLogFn({
            level,
            message: msg,
            context: logData,
            userId: context?.userId,
            requestId: context?.requestId,
            apiName: context?.apiName,
          }).catch(() => { }); // Silently fail to prevent app crashes
        }).catch(() => { }); // Silently fail if import fails
      }
    },

    debug: (context: any, msg: string) => {
      if (config.level === 'debug' || config.debugMode) {
        structuredLogger._log('debug', msg, context);
      }
    },
    info: (context: any, msg: string) => {
      if (shouldLogLevel('info', config.level)) structuredLogger._log('info', msg, context);
    },
    warn: (context: any, msg: string) => {
      if (shouldLogLevel('warn', config.level)) structuredLogger._log('warn', msg, context);
    },
    error: (context: any, msg: string) => {
      if (shouldLogLevel('error', config.level)) structuredLogger._log('error', msg, context);
    },
    fatal: (context: any, msg: string) => {
      if (shouldLogLevel('fatal', config.level)) structuredLogger._log('fatal', msg, context);
    },
    child: (context: any) => structuredLogger, // Simple implementation
  };

  return structuredLogger;
}

// Initialize logger with fallback
const baseLogger = createPinoLogger();

/**
 * Safe wrapper for logger methods - ensures logging never crashes the app
 */
function safeLog(
  fn: () => void,
  fallbackFn: () => void,
  errorMessage: string
) {
  try {
    fn();
  } catch (error) {
    try {
      fallbackFn();
    } catch (fallbackError) {
      // Last resort: silent fail with console.error
      console.error(errorMessage, error);
    }
  }
}

/**
 * Enhanced logger with convenience methods
 * ALL methods are wrapped in try-catch to prevent crashes
 */
export const logger = {
  /**
   * Debug logs - only visible when DEBUG_MODE=true or LOG_LEVEL=debug
   * Use for development debugging and troubleshooting
   */
  debug: (message: string, context?: Record<string, any>) => {
    if (config.debugMode || config.level === 'debug') {
      safeLog(
        () => (baseLogger as any).debug(context || {}, message),
        () => console.log(`[DEBUG] ${message}`, context || ''),
        '⚠️ Logger.debug failed'
      );
    }
  },

  /**
   * Info logs - general operational information
   * Use for normal application flow tracking
   */
  info: (message: string, context?: Record<string, any>) => {
    if (!shouldLogLevel('info', config.level)) return;
    safeLog(
      () => (baseLogger as any).info(context || {}, message),
      () => console.log(`[INFO] ${message}`, context || ''),
      '⚠️ Logger.info failed'
    );
  },

  /**
   * Warning logs - potential issues that don't prevent operation
   * Use for deprecated features, recoverable errors, etc.
   */
  warn: (message: string, context?: Record<string, any>) => {
    if (!shouldLogLevel('warn', config.level)) return;
    safeLog(
      () => (baseLogger as any).warn(context || {}, message),
      () => console.warn(`[WARN] ${message}`, context || ''),
      '⚠️ Logger.warn failed'
    );
  },

  /**
   * Error logs - errors that need attention
   * Automatically captures error stack traces
   */
  error: (message: string, contextOrError?: Record<string, any> | Error) => {
    if (!shouldLogLevel('error', config.level)) return;
    safeLog(
      () => {
        if (contextOrError instanceof Error) {
          (baseLogger as any).error(
            {
              error: {
                message: contextOrError.message,
                stack: contextOrError.stack,
                name: contextOrError.name,
              },
            },
            message
          );
        } else {
          (baseLogger as any).error(contextOrError || {}, message);
        }
      },
      () => console.error(`[ERROR] ${message}`, contextOrError || ''),
      '⚠️ Logger.error failed'
    );
  },

  /**
   * Fatal logs - critical errors that may cause system failure
   * Use sparingly for catastrophic failures
   */
  fatal: (message: string, contextOrError?: Record<string, any> | Error) => {
    if (!shouldLogLevel('fatal', config.level)) return;
    safeLog(
      () => {
        if (contextOrError instanceof Error) {
          (baseLogger as any).fatal(
            {
              error: {
                message: contextOrError.message,
                stack: contextOrError.stack,
                name: contextOrError.name,
              },
            },
            message
          );
        } else {
          (baseLogger as any).fatal(contextOrError || {}, message);
        }
      },
      () => console.error(`[FATAL] ${message}`, contextOrError || ''),
      '⚠️ Logger.fatal failed'
    );
  },

  /**
   * Create a child logger with additional context
   * Useful for adding request IDs, user IDs, etc.
   */
  child: (context: Record<string, any>) => {
    try {
      return baseLogger.child(context);
    } catch (error) {
      console.error('⚠️ Logger.child failed, using base logger:', error);
      return baseLogger;
    }
  },

  /**
   * Get the underlying Pino logger instance
   */
  getPinoLogger: () => baseLogger,
};

/**
 * Create a logger with persistent context
 * Useful for adding request-specific context that persists across multiple log calls
 * ALL methods are wrapped in try-catch to prevent crashes
 */
export function createContextLogger(context: Record<string, any>) {
  let childLogger: any;

  try {
    childLogger = baseLogger.child(context);
  } catch (error) {
    console.error('⚠️ Failed to create child logger, using base logger:', error);
    childLogger = baseLogger;
  }

  return {
    debug: (message: string, additionalContext?: Record<string, any>) => {
      if (config.debugMode || config.level === 'debug') {
        safeLog(
          () => (childLogger as any).debug({ ...context, ...(additionalContext || {}) }, message),
          () => console.log(`[DEBUG] ${message}`, { ...context, ...additionalContext }),
          '⚠️ ContextLogger.debug failed'
        );
      }
    },
    info: (message: string, additionalContext?: Record<string, any>) => {
      if (!shouldLogLevel('info', config.level)) return;
      safeLog(
        () => (childLogger as any).info({ ...context, ...(additionalContext || {}) }, message),
        () => console.log(`[INFO] ${message}`, { ...context, ...additionalContext }),
        '⚠️ ContextLogger.info failed'
      );
    },
    warn: (message: string, additionalContext?: Record<string, any>) => {
      if (!shouldLogLevel('warn', config.level)) return;
      safeLog(
        () => (childLogger as any).warn({ ...context, ...(additionalContext || {}) }, message),
        () => console.warn(`[WARN] ${message}`, { ...context, ...additionalContext }),
        '⚠️ ContextLogger.warn failed'
      );
    },
    error: (message: string, contextOrError?: Record<string, any> | Error) => {
      if (!shouldLogLevel('error', config.level)) return;
      safeLog(
        () => {
          if (contextOrError instanceof Error) {
            (childLogger as any).error(
              {
                ...context,
                error: {
                  message: contextOrError.message,
                  stack: contextOrError.stack,
                  name: contextOrError.name,
                },
              },
              message
            );
          } else {
            (childLogger as any).error({ ...context, ...(contextOrError || {}) }, message);
          }
        },
        () =>
          console.error(
            `[ERROR] ${message}`,
            contextOrError instanceof Error
              ? { ...context, error: contextOrError }
              : { ...context, ...contextOrError }
          ),
        '⚠️ ContextLogger.error failed'
      );
    },
    fatal: (message: string, contextOrError?: Record<string, any> | Error) => {
      if (!shouldLogLevel('fatal', config.level)) return;
      safeLog(
        () => {
          if (contextOrError instanceof Error) {
            (childLogger as any).fatal(
              {
                ...context,
                error: {
                  message: contextOrError.message,
                  stack: contextOrError.stack,
                  name: contextOrError.name,
                },
              },
              message
            );
          } else {
            (childLogger as any).fatal({ ...context, ...(contextOrError || {}) }, message);
          }
        },
        () =>
          console.error(
            `[FATAL] ${message}`,
            contextOrError instanceof Error
              ? { ...context, error: contextOrError }
              : { ...context, ...contextOrError }
          ),
        '⚠️ ContextLogger.fatal failed'
      );
    },
  };
}

/**
 * Performance timing utility
 * Automatically logs execution time of async functions
 * Never crashes even if logging fails
 */
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const start = Date.now();

  try {
    logger.debug(`[TIMING] ${operation} started`, context);
  } catch (error) {
    // Silent fail on log errors
    console.error('⚠️ withTiming start log failed:', error);
  }

  return fn()
    .then((result) => {
      try {
        const duration = Date.now() - start;
        logger.debug(`[TIMING] ${operation} completed`, { ...context, duration_ms: duration });
      } catch (error) {
        console.error('⚠️ withTiming completion log failed:', error);
      }
      return result;
    })
    .catch((error) => {
      try {
        const duration = Date.now() - start;
        logger.error(`[TIMING] ${operation} failed`, {
          ...context,
          duration_ms: duration,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (logError) {
        console.error('⚠️ withTiming error log failed:', logError);
      }
      throw error;
    });
}

/**
 * Get current logger configuration
 */
export function getLogConfig() {
  return config;
}

// Export types
export type { LogLevel, LoggerConfig } from './config';
