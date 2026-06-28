/**
 * List templated song instances for the current consumer (public)
 * GET /api/templated-songs/my-instances
 * Returns instances owned by the current user (user_id or anonymous_user_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  templatedSongInstancesTable,
  templatedSongsTable,
} from '@/lib/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie } from '@/lib/auth/cookies';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';

async function handler(req: NextRequest, context: { logger: any; requestId?: string }) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const logger = context.logger;

  try {
    const user = await getCurrentUser(req);
    const anonymousId = await getAnonymousCookie();

    const identityCondition = user?.id
      ? eq(templatedSongInstancesTable.user_id, parseInt(String(user.id), 10))
      : anonymousId
        ? and(
          isNull(templatedSongInstancesTable.user_id),
          eq(templatedSongInstancesTable.anonymous_user_id, anonymousId)
        )
        : null;

    if (!identityCondition) {
      logger.info('My templated instances: no user or anonymous session', {});
      return NextResponse.json({
        success: true,
        instances: [],
      });
    }

    // Only show instances in ready (completed) state
    const condition = and(
      identityCondition,
      eq(templatedSongInstancesTable.status, 'completed')
    );

    const rows = await db
      .select({
        id: templatedSongInstancesTable.id,
        slug: templatedSongInstancesTable.slug,
        status: templatedSongInstancesTable.status,
        song_title: templatedSongInstancesTable.song_title,
        recipient_name: templatedSongInstancesTable.recipient_name,
        created_at: templatedSongInstancesTable.created_at,
        template_title: templatedSongsTable.title,
      })
      .from(templatedSongInstancesTable)
      .leftJoin(
        templatedSongsTable,
        eq(templatedSongInstancesTable.template_id, templatedSongsTable.id)
      )
      .where(condition)
      .orderBy(desc(templatedSongInstancesTable.created_at));

    logger.info('My templated instances list', { count: rows.length });

    return NextResponse.json({
      success: true,
      instances: rows,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-my-instances',
      requestId: context.requestId,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to list instances',
      },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('templated-songs-my-instances', handler);
