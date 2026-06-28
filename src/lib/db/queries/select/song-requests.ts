/**
 * Song request queries - For admin portal request management
 *
 * Performance goals:
 * - Avoid join-explosion pagination (IDs first, then hydrate)
 * - Avoid shipping heavy JSON columns from songs/user_songs
 * - Avoid N+1 for related entities
 * - Keep filters fast (EXISTS subqueries instead of LEFT JOIN filters)
 */

import { eq, sql, ilike, desc, inArray, and, or, isNull, gte } from 'drizzle-orm';
import { db } from '../../index';
import {
  SelectSongRequest,
  SelectChangeRequest,
  songRequestsTable,
  userSongsTable,
  songsTable,
  packagesTable,
  paymentsTable,
  changeRequestsTable,
  songRequestSongsTable
} from '../../schema';

// Filter interface for paginated requests
export interface RequestFilters {
  package?: string;
  payment?: string;
  fulfillment?: string;
  dateRange?: string;
  assignee?: string;
}

// Type for song request with related data
export type SongRequestWithRelations = SelectSongRequest & {
  song?: {
    id: number;
    slug: string | null;
    status: string | null;
    kind: 'user_song' | 'library_song';
  } | null;
  linkedSongs: Array<{ id: number; title: string; slug: string }>;
  isUserSong?: boolean;
  package?: {
    name: string;
    slug: string;
    price: string | number;
    expert_created: boolean
  } | null;
  payment?: {
    id: number;
    status: string;
    amount: string | number;
    created_at: Date;
    payment_id: string | null;
    order_id: string | null
  } | null;
  latestLyricsDraft?: {
    music_style: string | null;
    has_lyrics: boolean
  } | null;
  changeRequests: SelectChangeRequest[];
  sourceSong?: {
    id: number;
    title: string;
    slug: string;
    imageUrl?: string | null
  } | null;
};

/**
 * Get all song requests with related data (non-paginated, legacy)
 * @deprecated Use getAllSongRequestsPaginated for better performance
 */
export async function getAllSongRequests(): Promise<SongRequestWithRelations[]> {
  const result = await getAllSongRequestsPaginated(1000, 0);
  return result.requests;
}

/**
 * Get paginated song requests with all related data
 * Optimized: Batches related data fetches to reduce round trips
 */
export async function getAllSongRequestsPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  filters?: RequestFilters
): Promise<{
  requests: SongRequestWithRelations[];
  total: number;
}> {
  // Build where conditions array
  const whereConditions: any[] = [];

  // Search condition - on recipient_details, mobile_number, and email
  if (searchQuery && searchQuery.trim()) {
    const searchPattern = `%${searchQuery.trim()}%`;
    whereConditions.push(
      or(
        ilike(songRequestsTable.recipient_details, searchPattern),
        ilike(songRequestsTable.mobile_number, searchPattern),
        ilike(songRequestsTable.email, searchPattern)
      )!
    );
  }

  // Filter conditions
  if (filters) {
    // Package filter
    if (filters.package) {
      whereConditions.push(sql`
        EXISTS (
          SELECT 1
          FROM packages p
          WHERE p.id = ${songRequestsTable.package_id}
            AND p.slug = ${filters.package}
        )
      `);
    }

    // Payment status filter
    if (filters.payment) {
      if (filters.payment === 'no_payment') {
        whereConditions.push(sql`
          NOT EXISTS (
            SELECT 1
            FROM payments pay
            WHERE pay.song_request_id = ${songRequestsTable.id}
          )
        `);
      } else {
        whereConditions.push(sql`
          EXISTS (
            SELECT 1
            FROM payments pay
            WHERE pay.song_request_id = ${songRequestsTable.id}
              AND pay.status = ${filters.payment}
          )
        `);
      }
    }

    // Fulfillment status filter
    if (filters.fulfillment) {
      const validStatuses = ['pending', 'shared', 'change_requested', 'completed'] as const;
      type FulfillmentStatus = typeof validStatuses[number];
      if (validStatuses.includes(filters.fulfillment as FulfillmentStatus)) {
        whereConditions.push(eq(songRequestsTable.fulfillment_status, filters.fulfillment as FulfillmentStatus));
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const daysAgo = parseInt(filters.dateRange);
      if (!isNaN(daysAgo)) {
        const dateThreshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        whereConditions.push(gte(songRequestsTable.created_at, dateThreshold));
      }
    }

    // Assignee filter
    if (filters.assignee) {
      if (filters.assignee === 'unassigned') {
        whereConditions.push(isNull(songRequestsTable.assignee));
      } else {
        whereConditions.push(eq(songRequestsTable.assignee, filters.assignee));
      }
    }
  }

  // Combine all conditions
  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Total count (no joins => stable and fast)
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songRequestsTable)
    .where(whereClause);

  const total = Number(totalResult[0]?.count || 0);

  // Phase 1: fetch IDs for this page (prevents pagination issues with joins)
  const requestIdRows = await db
    .select({ id: songRequestsTable.id })
    .from(songRequestsTable)
    .where(whereClause)
    .orderBy(desc(songRequestsTable.created_at))
    .limit(limit)
    .offset(offset);

  const requestIds = requestIdRows.map(r => r.id);

  if (requestIds.length === 0) {
    return { requests: [], total };
  }

  // Phase 2: hydrate with lightweight joins and computed fields (avoid heavy JSON)
  // NOTE: Removed LEFT JOIN with paymentsTable to avoid join explosion (song requests can have multiple payments)
  // Payments are now fetched separately below and deduplicated
  const requestsWithRelations = await db
    .select({
      request: songRequestsTable,
      userSong: {
        id: userSongsTable.id,
        slug: userSongsTable.slug,
        status: userSongsTable.status,
      },
      librarySong: {
        id: songsTable.id,
        slug: songsTable.slug,
        title: songsTable.title,
        status: songsTable.status,
      },
      package: {
        name: packagesTable.name,
        slug: packagesTable.slug,
        price: packagesTable.price,
        expert_created: packagesTable.expert_created,
      },
      // Latest lyrics info via subqueries (avoid fetching all drafts)
      latest_music_style: sql<string | null>`
        (
          SELECT ld.music_style
          FROM lyrics_drafts ld
          WHERE ld.song_request_id = ${songRequestsTable.id}
          ORDER BY ld.version DESC
          LIMIT 1
        )
      `,
      has_lyrics: sql<boolean>`
        EXISTS (
          SELECT 1
          FROM lyrics_drafts ld
          WHERE ld.song_request_id = ${songRequestsTable.id}
          LIMIT 1
        )
      `,
    })
    .from(songRequestsTable)
    .leftJoin(userSongsTable, eq(userSongsTable.song_request_id, songRequestsTable.id))
    .leftJoin(songsTable, eq(songsTable.song_request_id, songRequestsTable.id))
    .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
    .where(inArray(songRequestsTable.id, requestIds))
    .orderBy(desc(songRequestsTable.created_at));

  // Batch fetch related lists in parallel
  // NOTE: Payments are fetched separately to avoid join explosion (multiple payments per request)
  const [allChangeRequests, allLinkedSongs, allPayments, sourceSongsRaw] = await Promise.all([
    db.select()
      .from(changeRequestsTable)
      .where(inArray(changeRequestsTable.song_request_id, requestIds))
      .orderBy(desc(changeRequestsTable.created_at)),

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
      .where(inArray(songRequestSongsTable.song_request_id, requestIds)),

    // Fetch all payments for these requests, ordered by most recent first
    db.select({
      song_request_id: paymentsTable.song_request_id,
      id: paymentsTable.id,
      status: paymentsTable.status,
      amount: paymentsTable.amount,
      created_at: paymentsTable.created_at,
      payment_id: paymentsTable.payment_id,
      order_id: paymentsTable.order_id,
    })
      .from(paymentsTable)
      .where(inArray(paymentsTable.song_request_id, requestIds))
      .orderBy(desc(paymentsTable.created_at)),

    (async () => {
      const sourceSongIds = requestsWithRelations
        .map(row => row.request.source_song_id)
        .filter((id): id is number => id !== null && id !== undefined);

      if (sourceSongIds.length === 0) return [];

      return db.select({
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
        .where(inArray(songsTable.id, sourceSongIds));
    })()
  ]);

  // Process change requests into map
  const changeRequestsByRequestId = new Map<number, SelectChangeRequest[]>();
  allChangeRequests.forEach(cr => {
    const existing = changeRequestsByRequestId.get(cr.song_request_id);
    if (existing) {
      existing.push(cr);
    } else {
      changeRequestsByRequestId.set(cr.song_request_id, [cr]);
    }
  });

  // Process linked songs into map
  const linkedSongsByRequestId = new Map<number, Array<{ id: number; title: string; slug: string }>>();
  allLinkedSongs.forEach(link => {
    const existing = linkedSongsByRequestId.get(link.song_request_id);
    if (existing) {
      existing.push(link.song);
    } else {
      linkedSongsByRequestId.set(link.song_request_id, [link.song]);
    }
  });

  // Process payments into map - take the most relevant payment per request
  // Priority: 1) completed payment, 2) most recent payment
  const paymentsByRequestId = new Map<number, {
    id: number;
    status: string;
    amount: string | number;
    created_at: Date;
    payment_id: string | null;
    order_id: string | null;
  }>();

  allPayments.forEach(payment => {
    if (!payment.song_request_id) return;

    const existing = paymentsByRequestId.get(payment.song_request_id);

    // If no existing payment, set this one
    if (!existing) {
      paymentsByRequestId.set(payment.song_request_id, {
        id: payment.id,
        status: payment.status || 'pending',
        amount: payment.amount,
        created_at: payment.created_at,
        payment_id: payment.payment_id,
        order_id: payment.order_id,
      });
      return;
    }

    // Priority logic: prefer completed payment, otherwise take most recent
    const shouldReplace =
      (payment.status === 'completed' && existing.status !== 'completed') ||
      (payment.status === existing.status && payment.created_at > existing.created_at);

    if (shouldReplace) {
      paymentsByRequestId.set(payment.song_request_id, {
        id: payment.id,
        status: payment.status || 'pending',
        amount: payment.amount,
        created_at: payment.created_at,
        payment_id: payment.payment_id,
        order_id: payment.order_id,
      });
    }
  });

  // Process source songs into map
  const sourceSongsMap = new Map<number, { id: number; title: string; slug: string; imageUrl?: string | null }>();
  sourceSongsRaw.forEach(song => {
    sourceSongsMap.set(song.id, { id: song.id, title: song.title, slug: song.slug, imageUrl: (song as any).imageUrl ?? null });
  });

  // Build final result
  const requests = requestsWithRelations.map(row => {
    const changeRequests = changeRequestsByRequestId.get(row.request.id) || [];
    const linkedSongs = linkedSongsByRequestId.get(row.request.id) || [];
    const payment = paymentsByRequestId.get(row.request.id) || null;

    const song =
      row.userSong?.id
        ? { ...row.userSong, kind: 'user_song' as const }
        : row.librarySong?.id
          ? { id: row.librarySong.id, slug: row.librarySong.slug, status: row.librarySong.status, kind: 'library_song' as const }
          : null;

    return {
      ...row.request,
      changeRequestCount: changeRequests.length,
      changeRequests,
      linkedSongs,
      song,
      isUserSong: song?.kind === 'user_song',
      package: row.package?.slug ? {
        name: row.package.name,
        slug: row.package.slug,
        price: row.package.price,
        expert_created: row.package.expert_created ?? false,
      } : null,
      payment,
      latestLyricsDraft: row.has_lyrics ? {
        music_style: row.latest_music_style || null,
        has_lyrics: true,
      } : null,
      sourceSong: row.request.source_song_id
        ? (sourceSongsMap.get(row.request.source_song_id) || null)
        : null,
    };
  });

  return { requests, total };
}

