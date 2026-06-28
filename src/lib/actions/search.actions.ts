'use server'

import { Song } from '@/types';

// Search songs action with pagination and caching
export async function searchSongsAction(query: string, limit: number = 20, offset: number = 0): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const { libraryCache, getCacheTTL } = await import('@/lib/cache');
    const cacheKey = libraryCache.getSearchKey(query, limit, offset);

    // Check cache first
    const cached = libraryCache.get<{ songs: Song[]; total: number; hasMore: boolean }>(cacheKey);
    if (cached) {
      return { success: true, ...cached };
    }

    const { searchSongsPaginated } = await import('@/lib/db/queries/select');
    const { songs: dbSongs, total } = await searchSongsPaginated(query, limit, offset);

    // Transform database songs to match Song type (optimized - no heavy fields)
    const songs: Song[] = dbSongs.map(song => ({
      id: song.id,
      created_at: song.created_at.toISOString(),
      title: song.title,
      lyrics: null, // Not loaded for library view
      song_description: song.song_description ?? null,
      timestamp_lyrics: null, // Not loaded for library view
      timestamped_lyrics_variants: null, // Not loaded for library view
      timestamped_lyrics_api_responses: null, // Not loaded for library view
      music_style: song.music_style ?? null,
      service_provider: song.service_provider ?? null,
      song_requester: null, // Not needed for library view
      prompt: null, // Not needed for library view
      song_url: song.song_url ?? null,
      duration: song.duration ?? null,
      slug: song.slug,
      add_to_library: song.add_to_library ?? undefined,
      is_deleted: song.is_deleted ?? undefined,
      status: song.status ?? undefined,
      categories: song.categories ?? undefined,
      tags: song.tags ?? undefined,
      suno_task_id: undefined, // Not exposed in library
      negative_tags: undefined, // Not needed for library view
      suno_variants: song.suno_variants as any,
      selected_variant: song.selected_variant ?? undefined,
      metadata: undefined, // Not needed for library view
      sequence: song.sequence ?? undefined,
      show_lyrics: song.show_lyrics ?? true,
      likes_count: (song as any).likes_count ?? 0,
      hasPersona: (song as any).has_persona ?? false,
    }));

    const hasMore = offset + songs.length < total;
    const result = { songs, total, hasMore };

    // Cache the result
    libraryCache.set(cacheKey, result, getCacheTTL('search'));

    return { success: true, ...result };
  } catch (error) {
    console.error('Error in searchSongsAction:', error);
    return { success: false, error: 'Failed to search songs', songs: [], total: 0, hasMore: false };
  }
}

// Fuzzy search songs action with intelligent matching
export async function fuzzySearchSongsAction(query: string, limit: number = 50): Promise<
  | { success: true; songs: Song[]; total: number; suggestions?: string[] }
  | { success: false; error: string; songs: Song[]; total: number; suggestions?: string[] }
> {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, songs: [], total: 0, suggestions: [] };
    }

    const { FuzzySongSearch, /* songToSearchable, searchableToSong */ } = await import('@/lib/fuzzy-search');
    const { getAllSongsWithCategoriesForFuzzySearch } = await import('@/lib/db/queries/select');
    const { libraryCache, getCacheTTL } = await import('@/lib/cache');
    const { unstable_cache } = await import('next/cache');

    // Cache the fuzzy search data (songs list) to avoid loading from DB every time
    const fuzzySearchDataKey = libraryCache.getFuzzySearchDataKey();
    let dbSongs: Array<any & { categoryNames: string[] }>;

    const cachedSongs = libraryCache.get<Array<any & { categoryNames: string[] }>>(fuzzySearchDataKey);
    if (cachedSongs) {
      dbSongs = cachedSongs;
    } else {
      // Use Next.js cache for the database query (longer TTL)
      dbSongs = await unstable_cache(
        async () => {
          return await getAllSongsWithCategoriesForFuzzySearch();
        },
        ['fuzzy-search-songs'],
        {
          tags: ['songs', 'library', 'fuzzy-search'],
          revalidate: 300, // 5 minutes - songs don't change that often
        }
      )();

      // Also cache in memory cache for faster access
      libraryCache.set(fuzzySearchDataKey, dbSongs, getCacheTTL('songs'));
    }

    // Transform to searchable format
    const searchableSongs = dbSongs.map(song => ({
      id: song.id,
      title: song.title,
      song_description: song.song_description ?? null,
      music_style: song.music_style ?? null,
      service_provider: song.service_provider ?? null,
      categories: song.categories ?? null,
      categoryNames: song.categoryNames ?? null, // NEW: Include category names
      tags: song.tags ?? null,
      slug: song.slug,
    }));

    // Create fuzzy search instance
    const fuzzySearch = new FuzzySongSearch(searchableSongs);

    // Perform fuzzy search
    const searchResults = fuzzySearch.search(query, limit);

    // Get suggestions for autocomplete
    const suggestions = fuzzySearch.getSuggestions(query, 5);

    // Transform results back to Song format
    const songs: Song[] = searchResults.map(result => {
      const dbSong = dbSongs.find(s => s.id === result.item.id);
      if (!dbSong) return null;

      // Handle created_at - it might be a Date object or already a string
      const createdAt = dbSong.created_at instanceof Date
        ? dbSong.created_at.toISOString()
        : typeof dbSong.created_at === 'string'
          ? dbSong.created_at
          : new Date(dbSong.created_at as any).toISOString();

      return {
        id: dbSong.id,
        created_at: createdAt,
        title: dbSong.title,
        lyrics: null, // Not loaded for library view
        song_description: dbSong.song_description ?? null,
        timestamp_lyrics: null, // Not loaded for library view
        timestamped_lyrics_variants: null, // Not loaded for library view
        timestamped_lyrics_api_responses: null, // Not loaded for library view
        music_style: dbSong.music_style ?? null,
        service_provider: dbSong.service_provider ?? null,
        song_requester: null, // Not needed for library view
        prompt: null, // Not needed for library view
        song_url: dbSong.song_url ?? null,
        duration: dbSong.duration ?? null,
        slug: dbSong.slug,
        add_to_library: dbSong.add_to_library ?? undefined,
        is_deleted: dbSong.is_deleted ?? undefined,
        status: dbSong.status ?? undefined,
        categories: dbSong.categories ?? undefined,
        tags: dbSong.tags ?? undefined,
        suno_task_id: undefined, // Not exposed in library
        negative_tags: undefined, // Not needed for library view
        suno_variants: dbSong.suno_variants as any,
        selected_variant: dbSong.selected_variant ?? undefined,
        metadata: undefined, // Not needed for library view
        sequence: dbSong.sequence ?? undefined,
        show_lyrics: dbSong.show_lyrics ?? true,
        likes_count: (dbSong as any).likes_count ?? 0,
        hasPersona: (dbSong as any).has_persona ?? false,
      };
    }).filter(Boolean) as Song[];

    // Note: Search analytics are tracked client-side in LibraryClient.tsx
    // Server-side tracking was removed as sendGAEvent requires browser environment

    return {
      success: true,
      songs,
      total: songs.length,
      suggestions
    };
  } catch (error) {
    console.error('Error in fuzzySearchSongsAction:', error);
    return {
      success: false,
      error: 'Failed to perform fuzzy search',
      songs: [],
      total: 0,
      suggestions: []
    };
  }
}
