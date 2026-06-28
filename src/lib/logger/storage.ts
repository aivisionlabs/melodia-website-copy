/**
 * Log Storage Module
 *
 * Handles async storage of logs to PostgreSQL for 7-30 day retention.
 * Never blocks the main application - all writes are fire-and-forget.
 */

import { db } from '@/lib/db';
import { applicationLogsTable } from '@/lib/db/schema';

export interface LogData {
  level: string;
  message: string;
  context?: Record<string, any>;
  userId?: number;
  requestId?: string;
  apiName?: string;
}

/**
 * Store a log entry in PostgreSQL
 * This is fire-and-forget - errors are silently caught to prevent app crashes
 */
export async function storeLog(logData: LogData): Promise<void> {
  try {
    // Only store logs in production/staging (configurable via env)
    if (process.env.DISABLE_LOG_STORAGE === 'true') {
      return;
    }

    // Only store info level and above (skip debug in production)
    const levelPriority: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };

    const minLevel = process.env.LOG_STORAGE_MIN_LEVEL || 'info';
    const logLevel = logData.level.toLowerCase();

    if (levelPriority[logLevel] < levelPriority[minLevel]) {
      return; // Skip storing low-priority logs
    }

    await db.insert(applicationLogsTable).values({
      timestamp: new Date(),
      level: logData.level,
      message: logData.message,
      context: logData.context || {},
      user_id: logData.userId,
      request_id: logData.requestId,
      api_name: logData.apiName,
      environment: process.env.NODE_ENV || 'development',
      app_name: 'melodia',
    });
  } catch (error) {
    // Never let logging crash the app
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Logger] Failed to store log:', error);
    }
  }
}

/**
 * Batch store multiple logs
 * More efficient for high-volume scenarios
 */
export async function storeLogs(logs: LogData[]): Promise<void> {
  try {
    if (process.env.DISABLE_LOG_STORAGE === 'true' || logs.length === 0) {
      return;
    }

    const values = logs.map(logData => ({
      timestamp: new Date(),
      level: logData.level,
      message: logData.message,
      context: logData.context || {},
      user_id: logData.userId,
      request_id: logData.requestId,
      api_name: logData.apiName,
      environment: process.env.NODE_ENV || 'development',
      app_name: 'melodia',
    }));

    await db.insert(applicationLogsTable).values(values);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Logger] Failed to batch store logs:', error);
    }
  }
}

