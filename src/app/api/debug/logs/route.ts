/**
 * Debug Logs API
 * GET /api/debug/logs
 *
 * Returns current logging configuration and recent log statistics
 *
 * ⚠️ WARNING: Only enable this in development or behind authentication!
 * This endpoint exposes system information that should not be public.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLogConfig } from '@/lib/logger';

export async function GET(req: NextRequest) {
  // Security: Only allow in development or with admin auth
  // TODO: Add proper authentication check
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }

  const config = getLogConfig();

  return NextResponse.json({
    config: {
      level: config.level,
      debugMode: config.debugMode,
      prettyPrint: config.prettyPrint,
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction,
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      LOG_LEVEL: process.env.LOG_LEVEL,
      DEBUG_MODE: process.env.DEBUG_MODE,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    instructions: {
      enableDebug: 'Set DEBUG_MODE=true in .env.local',
      changeLevel: 'Set LOG_LEVEL=debug|info|warn|error in .env.local',
      viewLogs: 'Check server console output or Vercel logs',
    },
  });
}

