import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUserSongsForAdminPaginated } from '@/lib/db/services';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';

export const GET = withApiLogger('admin-dashboard-user-songs', async (req: NextRequest, ctx) => {
  const timer = createApiTimer(ctx);

  try {
    timer.mark('start');

    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    timer.mark('auth_checked');

    if (!isAuthenticated) {
      ctx.logger.warn('Unauthorized admin dashboard user-songs access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    timer.mark('params_parsed');

    const dbStart = Date.now();
    const { userSongs, total } = await getAllUserSongsForAdminPaginated(limit, offset, search);
    timer.mark('db_done');

    ctx.logger.info('Admin dashboard user songs fetched', {
      page,
      limit,
      offset,
      search_len: search?.length ?? 0,
      result_count: userSongs?.length ?? 0,
      total,
      db_duration_ms: Date.now() - dbStart,
    });
    timer.logSummary();

    return NextResponse.json({
      success: true,
      userSongs: userSongs || [],
      total,
      page,
      limit,
    });
  } catch (error) {
    ctx.logger.error('Error fetching admin user songs', error as any);
    timer.logSummary();
    return NextResponse.json({ error: 'Failed to fetch user songs' }, { status: 500 });
  }
});


