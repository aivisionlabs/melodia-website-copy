import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllSongRequestsPaginated } from '@/lib/db/services';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface RequestFilters {
  package?: string;
  payment?: string;
  fulfillment?: string;
  dateRange?: string;
  assignee?: string;
}

export const GET = withApiLogger('admin-dashboard-requests', async (req: NextRequest, ctx) => {
  const timer = createApiTimer(ctx);

  try {
    timer.mark('start');

    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    timer.mark('auth_checked');

    if (!isAuthenticated) {
      ctx.logger.warn('Unauthorized admin dashboard requests access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Extract filter parameters
    const filters: RequestFilters = {
      package: searchParams.get('package') || undefined,
      payment: searchParams.get('payment') || undefined,
      fulfillment: searchParams.get('fulfillment') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
      assignee: searchParams.get('assignee') || undefined,
    };

    timer.mark('params_parsed');
    const dbStart = Date.now();
    const { requests, total } = await getAllSongRequestsPaginated(limit, offset, search, filters);
    timer.mark('db_done');

    ctx.logger.info('Admin dashboard requests fetched', {
      page,
      limit,
      offset,
      search_len: search?.length ?? 0,
      filters,
      result_count: requests?.length ?? 0,
      total,
      db_duration_ms: Date.now() - dbStart,
    });

    timer.logSummary();

    return NextResponse.json({
      success: true,
      requests,
      total,
      page,
      limit,
    });
  } catch (error) {
    ctx.logger.error('Error fetching admin song requests', error as any);
    timer.logSummary();
    return NextResponse.json({ error: 'Failed to fetch song requests' }, { status: 500 });
  }
});


