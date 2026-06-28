/**
 * Logging Configuration
 *
 * Environment Variables:
 * - LOG_LEVEL: Set minimum log level (error, warn, info, debug) - default: info
 * - DEBUG_MODE: Enable debug logging (true/false) - default: false
 * - LOG_PRETTY: Enable pretty printing for development - default: true in dev
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Order for minimum-level filtering: debug (0) = most verbose, fatal (4) = least */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/** True if messageLevel should be logged when minLevel is the configured minimum. */
export function shouldLogLevel(messageLevel: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[messageLevel] >= LOG_LEVEL_ORDER[minLevel];
}

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint: boolean;
  redactKeys: string[];
  isDevelopment: boolean;
  isProduction: boolean;
  debugMode: boolean;
}

/**
 * Get logging configuration from environment
 */
export function getLoggerConfig(): LoggerConfig {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';

  // Debug mode: explicitly enable debug logging
  const debugMode = process.env.DEBUG_MODE === 'true' || process.env.DEBUG_MODE === '1';

  // Log level: error < warn < info < debug
  // In production: default to 'info' unless DEBUG_MODE is enabled
  // In development: default to 'debug'
  let level: LogLevel = 'info';

  if (process.env.LOG_LEVEL) {
    const raw = process.env.LOG_LEVEL.trim().toLowerCase();
    if (['debug', 'info', 'warn', 'error', 'fatal'].includes(raw)) {
      level = raw as LogLevel;
    }
  } else if (debugMode) {
    level = 'debug';
  } else if (isDevelopment) {
    level = 'debug';
  }

  // Pretty print in development or when LOG_PRETTY is explicitly enabled
  const prettyPrint = process.env.LOG_PRETTY === 'true' || (isDevelopment && process.env.LOG_PRETTY !== 'false');

  // Keys to redact from logs (security)
  const redactKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'privateKey',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCS_CREDENTIALS_JSON',
    'SUNO_API_KEY',
    'RAZORPAY_KEY_SECRET',
    'CASHFREE_SECRET_KEY',
    'NEXTAUTH_SECRET',
    'LANGSMITH_API_KEY',
  ];

  return {
    level,
    prettyPrint,
    redactKeys,
    isDevelopment,
    isProduction,
    debugMode,
  };
}
