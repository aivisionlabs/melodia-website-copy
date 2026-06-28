import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllSongsForAdminPaginated } from '@/lib/db/services';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';

export const GET = withApiLogger('admin-dashboard-songs', async (req: NextRequest, ctx) => {
  const timer = createApiTimer(ctx);

  try {
    timer.mark('start');

    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    timer.mark('auth_checked');

    if (!isAuthenticated) {
      ctx.logger.warn('Unauthorized admin dashboard songs access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const offset = (page - 1) * limit;
    timer.mark('params_parsed');

    const dbStart = Date.now();
    const { songs, total } = await getAllSongsForAdminPaginated(
      limit,
      offset,
      search,
      category,
      sortBy
    );
    timer.mark('db_done');

    ctx.logger.info('Admin dashboard songs fetched', {
      page,
      limit,
      offset,
      search_len: search?.length ?? 0,
      category,
      sortBy,
      result_count: songs?.length ?? 0,
      total,
      db_duration_ms: Date.now() - dbStart,
    });
    timer.logSummary();

    return NextResponse.json({
      success: true,
      songs,
      total,
      page,
      limit,
    });
  } catch (error) {
    ctx.logger.error('Error fetching admin songs', error as any);
    timer.logSummary();
    return NextResponse.json({ success: false, error: 'Failed to fetch songs' }, { status: 500 });
  }
});
