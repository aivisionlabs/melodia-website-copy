/**
 * User song queries - For admin portal user song management
 * Optimized to avoid loading heavy JSONB fields unnecessarily
 */

import { eq, sql, desc, inArray, or, and } from 'drizzle-orm';
import { db } from '../../index';
import {
  userSongsTable,
  songRequestsTable,
  usersTable,
  lyricsDraftsTable,
  songsTable,
  paymentsTable
} from '../../schema';
import { AdminUserSongRow } from './types';

/**
 * Get all user songs for admin portal (non-paginated, legacy)
 * @deprecated Use getAllUserSongsForAdminPaginated for better performance
 */
export async function getAllUserSongsForAdmin(): Promise<AdminUserSongRow[]> {
  const result = await getAllUserSongsForAdminPaginated(1000, 0);
  return result.userSongs;
}

/**
 * Get paginated user songs for admin portal with server-side search
 * Optimized: Uses JSONB operators to avoid loading full variant data
 */
export async function getAllUserSongsForAdminPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string
): Promise<{
  userSongs: AdminUserSongRow[];
  total: number;
}> {
  // Build where conditions
  const whereConditions: any[] = [
    sql`${userSongsTable.is_deleted} = false OR ${userSongsTable.is_deleted} IS NULL`
  ];

  // Add search condition for recipient_details if search query is provided
  if (searchQuery && searchQuery.trim()) {
    const searchPattern = `%${searchQuery.trim()}%`;
    whereConditions.push(
      sql`${songRequestsTable.recipient_details} ILIKE ${searchPattern}`
    );
  }

  const whereClause = and(...whereConditions);
  // Main query with optimized field selection
  const userSongsWithData = await db
    .select({
      song: {
        id: userSongsTable.id,
        song_request_id: userSongsTable.song_request_id,
        slug: userSongsTable.slug,
        status: userSongsTable.status,
        created_at: userSongsTable.created_at,
        // Extract title from metadata using JSONB operator (avoids loading full metadata)
        metadata_title: sql<string | null>`${userSongsTable.metadata}->>'title'`,
        // Get variant count using JSONB functions (avoids loading full array)
        variant_count: sql<number>`
          CASE
            WHEN jsonb_typeof(${userSongsTable.song_variants}) = 'array'
              THEN COALESCE(jsonb_array_length(${userSongsTable.song_variants}), 0)::int
            WHEN jsonb_typeof(${userSongsTable.song_variants}) = 'object' AND ${userSongsTable.song_variants} IS NOT NULL
              THEN (
                SELECT COUNT(*)::int
                FROM jsonb_object_keys(${userSongsTable.song_variants}) AS k
              )
            ELSE 0
          END
        `,
      },
      request: {
        id: songRequestsTable.id,
        user_id: songRequestsTable.user_id,
        anonymous_user_id: songRequestsTable.anonymous_user_id,
        recipient_details: songRequestsTable.recipient_details,
        occasion: songRequestsTable.occasion,
        languages: songRequestsTable.languages,
        status: songRequestsTable.status,
        created_at: songRequestsTable.created_at,
      },
      user: {
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      },
      lyricsDraft: {
        song_title: lyricsDraftsTable.song_title,
        music_style: lyricsDraftsTable.music_style,
      },
      librarySong: {
        id: songsTable.id,
        play_count: songsTable.play_count,
      },
      payment: {
        payment_id: paymentsTable.payment_id,
        order_id: paymentsTable.order_id,
      },
    })
    .from(userSongsTable)
    .innerJoin(songRequestsTable, eq(userSongsTable.song_request_id, songRequestsTable.id))
    .leftJoin(usersTable, eq(songRequestsTable.user_id, usersTable.id))
    .leftJoin(lyricsDraftsTable, eq(userSongsTable.approved_lyrics_id, lyricsDraftsTable.id))
    .leftJoin(songsTable, eq(songsTable.user_song_id, userSongsTable.id))
    .leftJoin(paymentsTable, eq(userSongsTable.payment_id, paymentsTable.id))
    .where(whereClause)
    .orderBy(sql`${userSongsTable.created_at} DESC`)
    .limit(limit)
    .offset(offset);

  // Get total count with same where clause
  const totalResult = await db
    .select({ count: sql<number>`count(DISTINCT ${userSongsTable.id})` })
    .from(userSongsTable)
    .innerJoin(songRequestsTable, eq(userSongsTable.song_request_id, songRequestsTable.id))
    .leftJoin(usersTable, eq(songRequestsTable.user_id, usersTable.id))
    .leftJoin(lyricsDraftsTable, eq(userSongsTable.approved_lyrics_id, lyricsDraftsTable.id))
    .leftJoin(paymentsTable, eq(userSongsTable.payment_id, paymentsTable.id))
    .where(whereClause);

  const total = Number(totalResult[0]?.count || 0);

  // Transform to final shape
  const userSongs: AdminUserSongRow[] = userSongsWithData.map(({ song, request, user, lyricsDraft, librarySong, payment }) => {
    const title =
      song.metadata_title ||
      lyricsDraft?.song_title ||
      (request.recipient_details ? `Song for ${request.recipient_details}` : 'Untitled Song');

    const is_converted_to_library = !!librarySong?.id;

    return {
      id: song.id,
      slug: song.slug,
      title,
      status: song.status || 'processing',
      created_at: song.created_at,
      request_id: song.song_request_id,
      recipient_details: request.recipient_details,
      occasion: request.occasion,
      languages: request.languages,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
      } : null,
      is_anonymous: !user && !!request.anonymous_user_id,
      variant_count: song.variant_count ?? 0,
      music_style: lyricsDraft?.music_style || null,
      selected_variant: 0,
      is_converted_to_library,
      play_count: librarySong?.play_count ?? 0,
      payment_id: payment?.payment_id || null,
      order_id: payment?.order_id || null,
    };
  });

  return { userSongs, total };
}

