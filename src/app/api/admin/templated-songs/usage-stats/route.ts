/**
 * Admin: Templated song usage analytics
 * GET /api/admin/templated-songs/usage-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getTemplatedSongUsageStats } from '@/lib/db/queries/select/templated-song-usage';
import { withApiLogger } from '@/lib/logger/api-middleware';

async function handler(
  _req: NextRequest,
  {
    logger,
  }: {
    logger: {
      info: (msg: string, meta?: unknown) => void;
      error: (msg: string, err?: unknown) => void;
      warn: (msg: string, ...args: unknown[]) => void;
    };
  },
) {
  try {
    if (!(await requireAdmin(logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summary, templates } = await getTemplatedSongUsageStats();

    logger.info('Admin templated song usage stats', {
      total_instances: summary.total_instances,
      templates_with_usage: summary.templates_with_usage,
    });

    return NextResponse.json({ success: true, summary, templates });
  } catch (error) {
    logger.error('Admin templated song usage stats error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch usage stats' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('admin-templated-songs-usage-stats', handler);
