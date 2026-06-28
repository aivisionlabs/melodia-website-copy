/**
 * Logs Query API
 * GET /api/logs/query
 *
 * Query application logs from PostgreSQL with filters
 * - Filter by level, date range, user, request, API
 * - Full-text search on message
 * - Pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applicationLogsTable } from '@/lib/db/schema';
import { desc, and, gte, lte, eq, or, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      level,
      startDate,
      endDate,
      userId,
      requestId,
      apiName,
      search,
      limit = 100,
      offset = 0,
    } = body;

    // Build query conditions
    const conditions: any[] = [];

    if (level) {
      conditions.push(eq(applicationLogsTable.level, level));
    }

    if (userId) {
      conditions.push(eq(applicationLogsTable.user_id, parseInt(userId)));
    }

    if (requestId) {
      conditions.push(eq(applicationLogsTable.request_id, requestId));
    }

    if (apiName) {
      conditions.push(eq(applicationLogsTable.api_name, apiName));
    }

    if (startDate) {
      conditions.push(gte(applicationLogsTable.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(applicationLogsTable.timestamp, new Date(endDate)));
    }

    // Full-text search on message
    if (search) {
      conditions.push(
        sql`to_tsvector('english', ${applicationLogsTable.message}) @@ plainto_tsquery('english', ${search})`
      );
    }

    // Query logs
    const logs = await db
      .select()
      .from(applicationLogsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(applicationLogsTable.timestamp))
      .limit(Math.min(limit, 500)) // Max 500 for safety
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applicationLogsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      logs,
      total: count,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + logs.length < count,
    });
  } catch (error: any) {
    console.error('Logs query error:', error);
    return NextResponse.json(
      { error: 'Failed to query logs', details: error.message },
      { status: 500 }
    );
  }
}

// GET method for simple queries via query params
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const filters = {
    level: searchParams.get('level') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    userId: searchParams.get('userId') || undefined,
    requestId: searchParams.get('requestId') || undefined,
    apiName: searchParams.get('apiName') || undefined,
    search: searchParams.get('search') || undefined,
    limit: parseInt(searchParams.get('limit') || '100'),
    offset: parseInt(searchParams.get('offset') || '0'),
  };

  // Reuse POST logic
  return POST(new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  }) as any);
}



