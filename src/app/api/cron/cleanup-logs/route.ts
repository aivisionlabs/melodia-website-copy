/**
 * Log Cleanup Cron Job
 * GET /api/cron/cleanup-logs
 *
 * Automatically deletes logs older than retention period (default: 30 days)
 * Runs daily via Vercel Cron
 *
 * Security: Requires CRON_SECRET in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { rejectUnauthorizedCronRequest } from '@/lib/auth/cron';
import { db } from '@/lib/db';
import { applicationLogsTable } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const unauthorized = rejectUnauthorizedCronRequest(req, '/api/cron/cleanup-logs');
    if (unauthorized) {
      return unauthorized;
    }

    // Get retention period from env (default: 30 days)
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30');

    // Delete old logs using COUNT to track deletions
    const [result] = await db.execute<{ count: number }>(sql`
      WITH deleted AS (
        DELETE FROM application_logs
        WHERE created_at < NOW() - INTERVAL '${sql.raw(retentionDays.toString())} days'
        RETURNING id
      )
      SELECT COUNT(*)::int as count FROM deleted
    `);

    const deleted = result?.count || 0;

    // Log the cleanup
    console.log(`[Cleanup] Deleted ${deleted} logs older than ${retentionDays} days`);

    return NextResponse.json({
      success: true,
      deleted,
      retentionDays,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cleanup] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}




