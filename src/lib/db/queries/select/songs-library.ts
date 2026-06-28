/**
 * Library song queries - Public-facing song listings
 * Optimized for performance by excluding heavy JSON columns
 */

import { and, eq, sql, ilike, or, desc } from 'drizzle-orm';
import { db } from '../../index';
import { SelectSong, categoriesTable, songsTable, songCategoriesTable, songRequestsTable } from '../../schema';
import { LibrarySongRow } from './types';

/** Song row with optional request context (occasion, mood, languages) from song_requests join */
export type SongWithRequestContext = SelectSong & {
  occasion?: string | null;
  mood?: string[] | null;
  request_languages?: string | null;
};

// SQL fragment for extracting essential variant info (reusable)
const variantImageSql = sql<any>`CASE
  WHEN ${songsTable.suno_variants} IS NOT NULL AND jsonb_array_length(${songsTable.suno_variants}) > 0
  THEN jsonb_build_object(
    'sourceImageUrl', ${songsTable.suno_variants}->0->>'sourceImageUrl'
  )
  ELSE NULL
END`;

// SQL fragment for checking persona association (reusable)
// Note: Using table name directly to ensure proper qualification in subquery
const hasPersonaSql = sql<boolean>`EXISTS (SELECT 1 FROM persona_associations pa WHERE pa.song_id = songs.id)`;

// Common select fields for library listings
const librarySelectFields = {
  id: songsTable.id,
  created_at: songsTable.created_at,
  title: songsTable.title,
  song_description: songsTable.song_description,
  music_style: songsTable.music_style,
  service_provider: songsTable.service_provider,
  song_url: songsTable.song_url,
  duration: songsTable.duration,
  slug: songsTable.slug,
  add_to_library: songsTable.add_to_library,
  is_deleted: songsTable.is_deleted,
  status: songsTable.status,
  categories: songsTable.categories,
  tags: songsTable.tags,
  has_persona: hasPersonaSql,
  suno_variants: variantImageSql,
  selected_variant: songsTable.selected_variant,
  sequence: songsTable.sequence,
  show_lyrics: songsTable.show_lyrics,
  likes_count: songsTable.likes_count,
  play_count: songsTable.play_count,
  language: songsTable.language,
};

/**
 * Get paginated songs for library view
 * Optimized: excludes heavy JSONB columns
 * Sorted by likes_count DESC, then sequence, then created_at
 */
export async function getAllSongsPaginated(limit: number = 20, offset: number = 0): Promise<{ songs: LibrarySongRow[]; total: number }> {
  const songs = await db
    .select(librarySelectFields)
    .from(songsTable)
    .where(and(eq(songsTable.add_to_library, true), eq(songsTable.is_deleted, false)))
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset) as unknown as LibrarySongRow[];

  // Use simple count query (more efficient than window function for single value)
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(and(eq(songsTable.add_to_library, true), eq(songsTable.is_deleted, false)));

  return {
    songs,
    total: Number(countResult[0]?.count || 0)
  };
}

/**
 * Get song by slug (for public library)
 * Returns full song data for song detail page.
 * LEFT JOINs song_requests to include occasion, mood, and languages when the song has a request.
 */
export async function getSongBySlug(slug: string): Promise<SongWithRequestContext | undefined> {
  const result = await db
    .select({
      id: songsTable.id,
      created_at: songsTable.created_at,
      title: songsTable.title,
      lyrics: songsTable.lyrics,
      customer_lyrics: songsTable.customer_lyrics,
      song_description: songsTable.song_description,
      timestamp_lyrics: songsTable.timestamp_lyrics,
      timestamped_lyrics_variants: songsTable.timestamped_lyrics_variants,
      timestamped_lyrics_api_responses: songsTable.timestamped_lyrics_api_responses,
      music_style: songsTable.music_style,
      service_provider: songsTable.service_provider,
      song_requester: songsTable.song_requester,
      prompt: songsTable.prompt,
      song_url: songsTable.song_url,
      duration: songsTable.duration,
      slug: songsTable.slug,
      add_to_library: songsTable.add_to_library,
      is_deleted: songsTable.is_deleted,
      is_active: songsTable.is_active,
      status: songsTable.status,
      categories: songsTable.categories,
      tags: songsTable.tags,
      suno_task_id: songsTable.suno_task_id,
      negative_tags: songsTable.negative_tags,
      suno_variants: songsTable.suno_variants,
      selected_variant: songsTable.selected_variant,
      metadata: songsTable.metadata,
      sequence: songsTable.sequence,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      play_count: songsTable.play_count,
      song_request_id: songsTable.song_request_id,
      user_id: songsTable.user_id,
      is_featured: songsTable.is_featured,
      song_url_variant_1: songsTable.song_url_variant_1,
      download_allowed: songsTable.download_allowed,
      user_song_id: songsTable.user_song_id,
      language: songsTable.language,
      occasion: songRequestsTable.occasion,
      mood: songRequestsTable.mood,
      request_languages: songRequestsTable.languages,
    })
    .from(songsTable)
    .leftJoin(songRequestsTable, eq(songsTable.song_request_id, songRequestsTable.id))
    .where(and(
      eq(songsTable.slug, slug),
      eq(songsTable.is_deleted, false)
      // NOTE: intentionally NOT filtering by add_to_library here.
      // add_to_library = false means "unlisted" (hidden from /library, search, sitemap)
      // but the song must remain accessible via its direct URL (/song/[slug]).
    ))
    .limit(1);

  return result[0] as SongWithRequestContext | undefined;
}

/**
 * Get lightweight song data for faster navigation
 * Excludes heavy JSON fields like lyrics, timestamp_lyrics, etc.
 */
export async function getSongBySlugLightweight(slug: string): Promise<{
  id: number;
  title: string;
  artist: string;
  song_url: string | null;
  duration: string | null;
  slug: string;
  show_lyrics: boolean | null;
  likes_count: number | null;
  suno_variants: unknown;
  selected_variant: number | null;
  download_allowed: boolean | null;
  song_requester: string | null;
  song_description: string | null;
  tags: string[] | null;
  categories: string[] | null;
  add_to_library: boolean | null;
} | undefined> {
  const result = await db
    .select({
      id: songsTable.id,
      title: songsTable.title,
      service_provider: songsTable.service_provider,
      song_url: songsTable.song_url,
      duration: songsTable.duration,
      slug: songsTable.slug,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      suno_variants: songsTable.suno_variants,
      selected_variant: songsTable.selected_variant,
      download_allowed: songsTable.download_allowed,
      song_requester: songsTable.song_requester,
      song_description: songsTable.song_description,
      tags: songsTable.tags,
      categories: songsTable.categories,
      add_to_library: songsTable.add_to_library,
    })
    .from(songsTable)
    .where(and(
      eq(songsTable.slug, slug),
      eq(songsTable.is_deleted, false)
      // NOTE: intentionally NOT filtering by add_to_library here.
      // Unlisted songs (add_to_library = false) must remain reachable via /song/[slug].
      // Callers that render the page use add_to_library to toggle robots noindex.
    ))
    .limit(1);

  const song = result[0];
  if (!song) return undefined;

  return {
    id: song.id,
    title: song.title,
    artist: song.service_provider || "Melodia",
    song_url: song.song_url,
    duration: song.duration,
    slug: song.slug,
    show_lyrics: song.show_lyrics,
    likes_count: song.likes_count,
    suno_variants: song.suno_variants,
    selected_variant: song.selected_variant,
    download_allowed: song.download_allowed,
    song_requester: song.song_requester,
    song_description: song.song_description,
    tags: song.tags,
    categories: song.categories,
    add_to_library: song.add_to_library,
  };
}

/**
 * Get song by slug without library/deleted filters
 * Used for slug uniqueness checks
 */
export async function getSongBySlugAll(slug: string): Promise<SelectSong | undefined> {
  const result = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.slug, slug))
    .limit(1);

  return result[0];
}

/**
 * Get song by ID (full data)
 */
export async function getSongById(id: number): Promise<SelectSong | undefined> {
  const result = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get song by Suno task ID
 */
export async function getSongByTaskId(taskId: string): Promise<SelectSong | undefined> {
  const result = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.suno_task_id, taskId))
    .limit(1);

  return result[0];
}

/**
 * Alias for getSongById for backward compatibility
 */
export async function getSongByIdQuery(id: number): Promise<SelectSong | undefined> {
  return getSongById(id);
}

/**
 * Get songs filtered by category slug with pagination
 */
export async function getSongsByCategorySlugPaginated(
  categorySlug: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ songs: LibrarySongRow[]; total: number }> {
  if (!categorySlug || categorySlug === 'all') {
    return getAllSongsPaginated(limit, offset);
  }

  const songs = await db
    .select(librarySelectFields)
    .from(songsTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(and(
      eq(categoriesTable.slug, categorySlug),
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ))
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset) as unknown as LibrarySongRow[];

  // Optimized count query
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(and(
      eq(categoriesTable.slug, categorySlug),
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ));

  return {
    songs,
    total: Number(countResult[0]?.count || 0)
  };
}

/** Match songs whose comma-separated `language` field includes the given language name */
function languageMatchCondition(languageName: string) {
  return sql`EXISTS (
    SELECT 1
    FROM unnest(string_to_array(replace(COALESCE(${songsTable.language}, ''), ', ', ','), ',')) AS lang
    WHERE trim(lang) ILIKE ${languageName}
  )`;
}

const librarySongFilters = and(
  eq(songsTable.add_to_library, true),
  eq(songsTable.is_deleted, false),
);

/**
 * Get songs filtered by language name with pagination
 */
export async function getSongsByLanguagePaginated(
  languageName: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ songs: LibrarySongRow[]; total: number }> {
  const songs = await db
    .select(librarySelectFields)
    .from(songsTable)
    .where(and(librarySongFilters, languageMatchCondition(languageName)))
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset) as unknown as LibrarySongRow[];

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(and(librarySongFilters, languageMatchCondition(languageName)));

  return {
    songs,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Search songs by title and description with pagination
 */
export async function searchSongsPaginated(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ songs: LibrarySongRow[]; total: number }> {
  if (!query || query.trim().length === 0) {
    return getAllSongsPaginated(limit, offset);
  }

  const searchTerm = `%${query.trim()}%`;

  const songs = await db
    .select(librarySelectFields)
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
      or(
        ilike(songsTable.title, searchTerm),
        ilike(songsTable.song_description, searchTerm),
        sql`COALESCE(array_to_string(${songsTable.tags}, ' '), '') ILIKE ${searchTerm}`,
        sql`COALESCE(array_to_string(${songsTable.categories}, ' '), '') ILIKE ${searchTerm}`
      )
    ))
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset) as unknown as LibrarySongRow[];

  // Optimized count query
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
      or(
        ilike(songsTable.title, searchTerm),
        ilike(songsTable.song_description, searchTerm),
        sql`COALESCE(array_to_string(${songsTable.tags}, ' '), '') ILIKE ${searchTerm}`,
        sql`COALESCE(array_to_string(${songsTable.categories}, ' '), '') ILIKE ${searchTerm}`
      )
    ));

  return {
    songs,
    total: Number(countResult[0]?.count || 0)
  };
}

/**
 * Legacy: Get all songs (non-paginated)
 * @deprecated Use getAllSongsPaginated instead
 */
export async function getAllSongs(): Promise<SelectSong[]> {
  return db
    .select()
    .from(songsTable)
    .where(eq(songsTable.is_deleted, false))
    .orderBy(sql`${songsTable.created_at} DESC`);
}

/**
 * Legacy: Get songs by category (non-paginated)
 * @deprecated Use getSongsByCategorySlugPaginated instead
 */
export async function getSongsByCategorySlug(categorySlug: string): Promise<SelectSong[]> {
  if (!categorySlug || categorySlug === 'all') {
    return getAllSongs();
  }

  const rows = await db
    .select()
    .from(songsTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(and(
      eq(categoriesTable.slug, categorySlug),
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ))
    .orderBy(songsTable.sequence, songsTable.created_at);

  // rows will be array of tuples due to joins; map to songsTable shape
  return rows.map((r: any) => r.songs);
}

/**
 * Legacy: Search songs (non-paginated)
 * @deprecated Use searchSongsPaginated instead
 */
export async function searchSongs(query: string): Promise<SelectSong[]> {
  if (!query || query.trim().length === 0) {
    return getAllSongs();
  }
  const searchTerm = `%${query.trim()}%`;
  return db
    .select()
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
      or(
        ilike(songsTable.title, searchTerm),
        ilike(songsTable.song_description, searchTerm)
      )
    ))
    .orderBy(songsTable.sequence, songsTable.created_at);
}

/**
 * Get all songs for fuzzy search (returns all songs without filtering)
 */
export async function getAllSongsForFuzzySearch(): Promise<SelectSong[]> {
  return db
    .select()
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ))
    .orderBy(songsTable.sequence, songsTable.created_at);
}

/**
 * Get all songs with category names for enhanced fuzzy search
 * IMPORTANT: Returns lightweight data to stay under Next.js cache limits (~2MB)
 */
export async function getAllSongsWithCategoriesForFuzzySearch(): Promise<Array<SelectSong & { categoryNames: string[] }>> {
  const result = await db
    .select({
      id: songsTable.id,
      created_at: songsTable.created_at,
      title: songsTable.title,
      song_description: songsTable.song_description,
      music_style: songsTable.music_style,
      service_provider: songsTable.service_provider,
      song_url: songsTable.song_url,
      duration: songsTable.duration,
      slug: songsTable.slug,
      add_to_library: songsTable.add_to_library,
      is_deleted: songsTable.is_deleted,
      status: songsTable.status,
      categories: songsTable.categories,
      tags: songsTable.tags,
      // Keep variants lightweight (library-card needs the image)
      suno_variants: variantImageSql,
      selected_variant: songsTable.selected_variant,
      sequence: songsTable.sequence,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      language: songsTable.language,
      // Used for "Create Similar Song" CTA
      has_persona: hasPersonaSql,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
    })
    .from(songsTable)
    .leftJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .leftJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ))
    .orderBy(songsTable.sequence, songsTable.created_at);

  // Group by song and collect category names
  const songMap = new Map<number, any & { categoryNames: string[] }>();

  result.forEach((row: any) => {
    const songId = row.id;

    if (!songMap.has(songId)) {
      // Keep all lightweight song fields
      const { categoryName, categorySlug, ...song } = row;
      songMap.set(songId, {
        ...song,
        categoryNames: []
      });
    }

    // Add category name if it exists and isn't already added
    if (row.categoryName && !songMap.get(songId)!.categoryNames.includes(row.categoryName)) {
      songMap.get(songId)!.categoryNames.push(row.categoryName);
    }
  });

  return Array.from(songMap.values());
}

/**
 * Get songs with persona association (for "Spark Your Creativity" rail)
 */
export async function getSongsWithPersonaPaginated(
  limit: number = 20,
  offset: number = 0
): Promise<{ songs: LibrarySongRow[]; total: number }> {
  const songs = await db
    .select(librarySelectFields)
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
      hasPersonaSql
    ))
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset) as unknown as LibrarySongRow[];

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
      hasPersonaSql
    ));

  return {
    songs,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Get persona-associated songs filtered by category slug
 */
export async function getSongsWithPersonaByCategorySlugPaginated(
  categorySlug: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ songs: LibrarySongRow[]; total: number }> {
  if (!categorySlug || categorySlug === "all") {
    return getSongsWithPersonaPaginated(limit, offset);
  }

  const songs = (await db
    .select(librarySelectFields)
    .from(songsTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(
      and(
        eq(categoriesTable.slug, categorySlug),
        eq(songsTable.add_to_library, true),
        eq(songsTable.is_deleted, false),
        hasPersonaSql
      )
    )
    .orderBy(desc(songsTable.likes_count), songsTable.sequence, desc(songsTable.created_at))
    .limit(limit)
    .offset(offset)) as unknown as LibrarySongRow[];

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.song_id, songsTable.id))
    .innerJoin(categoriesTable, eq(categoriesTable.id, songCategoriesTable.category_id))
    .where(
      and(
        eq(categoriesTable.slug, categorySlug),
        eq(songsTable.add_to_library, true),
        eq(songsTable.is_deleted, false),
        hasPersonaSql
      )
    );

  return {
    songs,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Get count of active songs in library
 */
export async function getActiveSongsCount(): Promise<number> {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songsTable)
    .where(and(eq(songsTable.add_to_library, true), eq(songsTable.is_deleted, false)));
  return Number(totalResult[0]?.count || 0);
}

