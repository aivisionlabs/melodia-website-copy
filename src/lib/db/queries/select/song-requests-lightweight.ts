/**
 * Lightweight song request queries - Optimized for admin dashboard initial load
 *
 * Strategy:
 * - Load only essential data upfront (2 queries)
 * - Defer heavy data (change requests, linked songs, source songs) to on-demand API
 * - Use aggregations to reduce round trips
 */

import { eq, sql, ilike, desc, and, or, isNull, gte } from 'drizzle-orm';
import { db } from '../../index';
import {
  songRequestsTable,
  packagesTable,
  paymentsTable,
} from '../../schema';

// Filter interface for paginated requests
export interface RequestFilters {
  package?: string;
  payment?: string;
  fulfillment?: string;
  dateRange?: string;
  assignee?: string;
}

// Lightweight type for initial load - only critical fields
export type LightweightSongRequest = {
  id: number;
  recipient_details: string;
  occasion: string | null;
  mood: string | string[] | null;
  languages: string;
  song_story: string | null;
  initial_requirements_text: string | null;
  fulfillment_status: 'pending' | 'shared' | 'change_requested' | 'completed';
  assignee: string | null;
  created_at: Date;
  mobile_number: string | null;
  email: string | null;
  user_id: number | null;
  package_id: number | null;
  source_song_id: number | null;
  // Aggregated/computed fields
  package: {
    name: string;
    slug: string;
    price: string | number;
    expert_created: boolean;
  } | null;
  payment: {
    status: string;
    amount: string | number;
  } | null;
  song: {
    id: number;
    slug: string | null;
    status: string | null;
    kind: 'user_song' | 'library_song';
  } | null;
  has_lyrics: boolean;
  change_request_count: number;
  linked_song_count: number;
};

/**
 * Get paginated song requests - OPTIMIZED for initial load
 * Only fetches critical data, defers heavy relations to separate API calls
 */
export async function getAllSongRequestsLightweight(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  filters?: RequestFilters
): Promise<{
  requests: LightweightSongRequest[];
  total: number;
}> {
  // Build where conditions array
  const whereConditions: any[] = [];

  // Search condition
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

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // QUERY 1: Total count (fast, no joins)
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songRequestsTable)
    .where(whereClause);

  const total = Number(totalResult[0]?.count || 0);

  // QUERY 2: Get requests with aggregated data using subqueries
  // This replaces the previous 6 queries with a single query using JSON aggregation
  const requests = await db
    .select({
      // Base request fields
      id: songRequestsTable.id,
      recipient_details: songRequestsTable.recipient_details,
      occasion: songRequestsTable.occasion,
      mood: songRequestsTable.mood,
      languages: songRequestsTable.languages,
      song_story: songRequestsTable.song_story,
      initial_requirements_text: songRequestsTable.initial_requirements_text,
      fulfillment_status: songRequestsTable.fulfillment_status,
      assignee: songRequestsTable.assignee,
      created_at: songRequestsTable.created_at,
      mobile_number: songRequestsTable.mobile_number,
      email: songRequestsTable.email,
      user_id: songRequestsTable.user_id,
      package_id: songRequestsTable.package_id,
      source_song_id: songRequestsTable.source_song_id,

      // Package info (LEFT JOIN - safe, 1:1 relationship)
      package: {
        name: packagesTable.name,
        slug: packagesTable.slug,
        price: packagesTable.price,
        expert_created: packagesTable.expert_created,
      },

      // Payment info - use subquery to get most recent/completed payment
      payment_status: sql<string | null>`
        (
          SELECT pay.status
          FROM payments pay
          WHERE pay.song_request_id = ${songRequestsTable.id}
          ORDER BY
            CASE WHEN pay.status = 'completed' THEN 0 ELSE 1 END,
            pay.created_at DESC
          LIMIT 1
        )
      `,
      payment_amount: sql<string | null>`
        (
          SELECT pay.amount::text
          FROM payments pay
          WHERE pay.song_request_id = ${songRequestsTable.id}
          ORDER BY
            CASE WHEN pay.status = 'completed' THEN 0 ELSE 1 END,
            pay.created_at DESC
          LIMIT 1
        )
      `,

      // Song info - check both user_songs and songs tables
      user_song_id: sql<number | null>`
        (SELECT id FROM user_songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,
      user_song_slug: sql<string | null>`
        (SELECT slug FROM user_songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,
      user_song_status: sql<string | null>`
        (SELECT status FROM user_songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,
      library_song_id: sql<number | null>`
        (SELECT id FROM songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,
      library_song_slug: sql<string | null>`
        (SELECT slug FROM songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,
      library_song_status: sql<string | null>`
        (SELECT status FROM songs WHERE song_request_id = ${songRequestsTable.id} LIMIT 1)
      `,

      // Aggregated counts
      has_lyrics: sql<boolean>`
        EXISTS (
          SELECT 1 FROM lyrics_drafts
          WHERE song_request_id = ${songRequestsTable.id}
        )
      `,
      change_request_count: sql<number>`
        (
          SELECT COUNT(*)::int
          FROM change_requests
          WHERE song_request_id = ${songRequestsTable.id}
        )
      `,
      linked_song_count: sql<number>`
        (
          SELECT COUNT(*)::int
          FROM song_request_songs
          WHERE song_request_id = ${songRequestsTable.id}
        )
      `,
    })
    .from(songRequestsTable)
    .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
    .where(whereClause)
    .orderBy(desc(songRequestsTable.created_at))
    .limit(limit)
    .offset(offset);

  // Transform to final shape
  const transformedRequests: LightweightSongRequest[] = requests.map(row => {
    // Determine song info
    let song: LightweightSongRequest['song'] = null;
    if (row.user_song_id) {
      song = {
        id: row.user_song_id,
        slug: row.user_song_slug,
        status: row.user_song_status,
        kind: 'user_song',
      };
    } else if (row.library_song_id) {
      song = {
        id: row.library_song_id,
        slug: row.library_song_slug,
        status: row.library_song_status,
        kind: 'library_song',
      };
    }

    return {
      id: row.id,
      recipient_details: row.recipient_details,
      occasion: row.occasion,
      mood: row.mood,
      languages: row.languages,
      song_story: row.song_story,
      initial_requirements_text: row.initial_requirements_text,
      fulfillment_status: row.fulfillment_status,
      assignee: row.assignee,
      created_at: row.created_at,
      mobile_number: row.mobile_number,
      email: row.email,
      user_id: row.user_id,
      package_id: row.package_id,
      source_song_id: row.source_song_id,
      package: row.package?.slug ? {
        name: row.package.name,
        slug: row.package.slug,
        price: row.package.price,
        expert_created: row.package.expert_created ?? false,
      } : null,
      payment: row.payment_status ? {
        status: row.payment_status,
        amount: row.payment_amount || '0',
      } : null,
      song,
      has_lyrics: row.has_lyrics,
      change_request_count: row.change_request_count,
      linked_song_count: row.linked_song_count,
    };
  });

  return { requests: transformedRequests, total };
}
