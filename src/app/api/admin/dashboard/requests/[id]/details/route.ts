import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  changeRequestsTable,
  songRequestSongsTable,
  songsTable,
  paymentsTable,
  songRequestsTable,
} from '@/lib/db/schema';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';

/**
 * On-demand API to fetch detailed data for a specific song request
 * This is called only when the user expands a request card
 *
 * Returns:
 * - Change requests
 * - Linked songs
 * - Source song details
 * - Full payment details
 */
export const GET = withApiLogger('admin-request-details', async (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => {
  const timer = createApiTimer(ctx as any);

  try {
    timer.mark('start');

    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    timer.mark('auth_checked');

    if (!isAuthenticated) {
      (ctx as any).logger.warn('Unauthorized admin request details access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await ctx.params;
    const requestId = parseInt(params.id, 10);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    timer.mark('params_parsed');

    // Fetch all detailed data in parallel
    const [changeRequests, linkedSongsRaw, sourceSong, payments] = await Promise.all([
      // Change requests
      db.select()
        .from(changeRequestsTable)
        .where(eq(changeRequestsTable.song_request_id, requestId))
        .orderBy(desc(changeRequestsTable.created_at)),

      // Linked songs
      db.select({
        song_request_id: songRequestSongsTable.song_request_id,
        song: {
          id: songsTable.id,
          title: songsTable.title,
          slug: songsTable.slug,
        },
      })
        .from(songRequestSongsTable)
        .innerJoin(songsTable, eq(songRequestSongsTable.song_id, songsTable.id))
        .where(eq(songRequestSongsTable.song_request_id, requestId)),

      // Source song (only if exists - will be a single query or null)
      (async () => {
        // First check if request has a source_song_id
        const requestData = await db.select({
          source_song_id: songRequestsTable.source_song_id,
        })
          .from(songRequestsTable)
          .where(eq(songRequestsTable.id, requestId))
          .limit(1);

        if (!requestData[0]?.source_song_id) return null;

        // Fetch source song details
        const sourceSongData = await db.select({
          id: songsTable.id,
          title: songsTable.title,
          slug: songsTable.slug,
          imageUrl: sql<string | null>`
            COALESCE(
              ${songsTable.suno_variants}->0->>'sourceImageUrl',
              ${songsTable.suno_variants}->0->>'imageUrl'
            )
          `,
        })
          .from(songsTable)
          .where(eq(songsTable.id, requestData[0].source_song_id))
          .limit(1);

        return sourceSongData[0] || null;
      })(),

      // All payments for this request
      db.select({
        id: paymentsTable.id,
        status: paymentsTable.status,
        amount: paymentsTable.amount,
        created_at: paymentsTable.created_at,
        payment_id: paymentsTable.payment_id,
        order_id: paymentsTable.order_id,
        payment_method: paymentsTable.payment_method,
      })
        .from(paymentsTable)
        .where(eq(paymentsTable.song_request_id, requestId))
        .orderBy(desc(paymentsTable.created_at)),
    ]);

    timer.mark('db_done');

    // Transform linked songs
    const linkedSongs = linkedSongsRaw.map(link => link.song);

    (ctx as any).logger.info('Admin request details fetched', {
      request_id: requestId,
      change_requests_count: changeRequests.length,
      linked_songs_count: linkedSongs.length,
      has_source_song: !!sourceSong,
      payments_count: payments.length,
    });

    timer.logSummary();

    return NextResponse.json({
      success: true,
      data: {
        changeRequests,
        linkedSongs,
        sourceSong,
        payments,
      },
    });
  } catch (error) {
    (ctx as any).logger.error('Error fetching admin request details', error as any);
    timer.logSummary();
    return NextResponse.json(
      { error: 'Failed to fetch request details' },
      { status: 500 }
    );
  }
});
