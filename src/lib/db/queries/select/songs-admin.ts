/**
 * Admin song queries - For admin portal song management
 * Optimized to exclude heavy JSONB fields where not needed
 */

import { and, eq, sql, ilike, desc, asc, inArray, isNull } from 'drizzle-orm';
import { db } from '../../index';
import { categoriesTable, songsTable, songCategoriesTable } from '../../schema';
import { AdminSongRow } from './types';

// Lightweight computed fields to avoid shipping heavy JSON to the admin list
const variantCountSql = sql<number>`
  CASE
    WHEN jsonb_typeof(${songsTable.suno_variants}) = 'array'
      THEN COALESCE(jsonb_array_length(${songsTable.suno_variants}), 0)::int
    WHEN jsonb_typeof(${songsTable.suno_variants}) = 'object' AND ${songsTable.suno_variants} IS NOT NULL
      THEN (
        SELECT COUNT(*)::int
        FROM jsonb_object_keys(${songsTable.suno_variants}) AS k
      )
    ELSE 0
  END
`;

const variantAudioUrlsSql = sql<any>`
  CASE
    WHEN jsonb_typeof(${songsTable.suno_variants}) = 'array' THEN (
      SELECT COALESCE(
        jsonb_agg(
          COALESCE(v->>'sourceAudioUrl', v->>'audioUrl', v->>'streamAudioUrl')
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(${songsTable.suno_variants}) v
    )
    ELSE NULL
  END
`;

const hasTimestampLyricsSql = sql<boolean>`
  (
    ${songsTable.timestamp_lyrics} IS NOT NULL
    AND jsonb_typeof(${songsTable.timestamp_lyrics}) = 'array'
    AND COALESCE(jsonb_array_length(${songsTable.timestamp_lyrics}), 0) > 0
  )
  OR
  (
    ${songsTable.timestamped_lyrics_variants} IS NOT NULL
    AND jsonb_typeof(${songsTable.timestamped_lyrics_variants}) = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(${songsTable.timestamped_lyrics_variants}) AS k
      LIMIT 1
    )
  )
`;

// Helper to build sort order
function getSortOrder(sortBy: string = 'newest') {
  switch (sortBy) {
    case 'oldest':
      return asc(songsTable.created_at);
    case 'likes-desc':
      return desc(songsTable.likes_count);
    case 'likes-asc':
      return asc(songsTable.likes_count);
    case 'title-asc':
      return asc(songsTable.title);
    case 'title-desc':
      return desc(songsTable.title);
    case 'newest':
    default:
      return desc(songsTable.created_at);
  }
}

/**
 * Get all songs for admin portal (non-paginated, legacy)
 * @deprecated Use getAllSongsForAdminPaginated for better performance
 */
export async function getAllSongsForAdminQuery(): Promise<AdminSongRow[]> {
  const result = await db
    .select({
      id: songsTable.id,
      created_at: songsTable.created_at,
      title: songsTable.title,
      music_style: songsTable.music_style,
      service_provider: songsTable.service_provider,
      song_requester: songsTable.song_requester,
      song_url: songsTable.song_url,
      duration: songsTable.duration,
      slug: songsTable.slug,
      add_to_library: songsTable.add_to_library,
      is_deleted: songsTable.is_deleted,
      status: songsTable.status,
      categories: songsTable.categories, // Keep legacy field for backward compatibility
      tags: songsTable.tags,
      sequence: songsTable.sequence,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      play_count: songsTable.play_count,
      download_allowed: songsTable.download_allowed,
      suno_task_id: songsTable.suno_task_id,
      has_timestamp_lyrics: hasTimestampLyricsSql,
      variant_count: variantCountSql,
      variant_audio_urls: variantAudioUrlsSql,
      selected_variant: songsTable.selected_variant,
      language: songsTable.language,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
    })
    .from(songsTable)
    .leftJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .leftJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(eq(songsTable.is_deleted, false))
    .orderBy(desc(songsTable.created_at));

  // Group by song and collect category names
  const songMap = new Map<number, AdminSongRow & { categories: string[] }>();

  result.forEach((row: any) => {
    const songId = row.id;

    if (!songMap.has(songId)) {
      // Extract song data excluding category fields
      const { categoryName, categorySlug, ...song } = row;
      songMap.set(songId, {
        ...song,
        categories: []
      });
    }

    // Add category name if it exists and isn't already added
    if (row.categoryName && !songMap.get(songId)!.categories.includes(row.categoryName)) {
      songMap.get(songId)!.categories.push(row.categoryName);
    }
  });

  return Array.from(songMap.values());
}

/**
 * Get paginated songs for admin portal with search, category filter, and sorting support
 * Optimized: Uses two-phase query to avoid pagination issues with joins
 */
export async function getAllSongsForAdminPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  categoryFilter?: string,
  sortBy?: string
): Promise<{ songs: Array<AdminSongRow & { categories: string[] }>; total: number }> {
  const sortOrder = getSortOrder(sortBy);

  // Handle special category filter for "No Category Selected"
  const isNoCategoryFilter = categoryFilter === '__NO_CATEGORY__';
  const hasCategoryFilter = categoryFilter && !isNoCategoryFilter;

  // Build base where clause with optional search on title only
  const baseWhereClause = and(
    eq(songsTable.is_deleted, false),
    searchQuery ? ilike(songsTable.title, `%${searchQuery}%`) : undefined
  );

  // Phase 1: Get song IDs for current page
  let songIdsQuery;

  if (isNoCategoryFilter) {
    // Filter songs with no category - use LEFT JOIN and check for NULL
    songIdsQuery = db
      .select({ id: songsTable.id })
      .from(songsTable)
      .leftJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
      .where(and(baseWhereClause, isNull(songCategoriesTable.category_id)))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);
  } else if (hasCategoryFilter) {
    // Filter by specific category name
    songIdsQuery = db
      .select({ id: songsTable.id })
      .from(songsTable)
      .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
      .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
      .where(and(baseWhereClause, eq(categoriesTable.name, categoryFilter)))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);
  } else {
    // No category filter
    songIdsQuery = db
      .select({ id: songsTable.id })
      .from(songsTable)
      .where(baseWhereClause)
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);
  }

  const songIdsResult = await songIdsQuery;
  const songIds = songIdsResult.map(r => r.id);

  // Get total count with the same filters
  let totalCount = 0;
  if (isNoCategoryFilter) {
    const totalResult = await db
      .select({ count: sql<number>`count(DISTINCT ${songsTable.id})` })
      .from(songsTable)
      .leftJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
      .where(and(baseWhereClause, isNull(songCategoriesTable.category_id)));
    totalCount = Number(totalResult[0]?.count || 0);
  } else if (hasCategoryFilter) {
    const totalResult = await db
      .select({ count: sql<number>`count(DISTINCT ${songsTable.id})` })
      .from(songsTable)
      .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
      .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
      .where(and(baseWhereClause, eq(categoriesTable.name, categoryFilter)));
    totalCount = Number(totalResult[0]?.count || 0);
  } else {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(songsTable)
      .where(baseWhereClause);
    totalCount = Number(totalResult[0]?.count || 0);
  }

  // Early return if no results
  if (songIds.length === 0) {
    return { songs: [], total: totalCount };
  }

  // Phase 2: Fetch full data for these specific IDs with category joins
  const result = await db
    .select({
      id: songsTable.id,
      created_at: songsTable.created_at,
      title: songsTable.title,
      music_style: songsTable.music_style,
      service_provider: songsTable.service_provider,
      song_requester: songsTable.song_requester,
      song_url: songsTable.song_url,
      duration: songsTable.duration,
      slug: songsTable.slug,
      add_to_library: songsTable.add_to_library,
      is_deleted: songsTable.is_deleted,
      status: songsTable.status,
      categories: songsTable.categories,
      tags: songsTable.tags,
      sequence: songsTable.sequence,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      play_count: songsTable.play_count,
      download_allowed: songsTable.download_allowed,
      suno_task_id: songsTable.suno_task_id,
      has_timestamp_lyrics: hasTimestampLyricsSql,
      variant_count: variantCountSql,
      variant_audio_urls: variantAudioUrlsSql,
      selected_variant: songsTable.selected_variant,
      language: songsTable.language,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
    })
    .from(songsTable)
    .leftJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .leftJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(inArray(songsTable.id, songIds))
    .orderBy(sortOrder);

  // Group by song and collect category names, maintaining order
  const songMap = new Map<number, AdminSongRow & { categories: string[] }>();

  // Initialize map with song IDs to maintain order
  songIds.forEach(id => {
    songMap.set(id, null as any);
  });

  result.forEach((row: any) => {
    const songId = row.id;

    if (!songMap.get(songId)) {
      const { categoryName, categorySlug, ...song } = row;
      songMap.set(songId, {
        ...song,
        categories: []
      });
    }

    if (row.categoryName && !songMap.get(songId)!.categories.includes(row.categoryName)) {
      songMap.get(songId)!.categories.push(row.categoryName);
    }
  });

  return {
    songs: Array.from(songMap.values()).filter(Boolean),
    total: totalCount
  };
}

