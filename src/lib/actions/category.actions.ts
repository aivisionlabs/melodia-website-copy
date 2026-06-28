'use server'

import { Song } from '@/types';
import { unstable_cache } from 'next/cache';

// Server-side: get songs by category slug with pagination and caching
export async function getSongsByCategoryAction(categorySlug: string | null, limit: number = 20, offset: number = 0): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const cachedResult = await unstable_cache(
      async () => {
        const { getSongsByCategorySlugPaginated } = await import('@/lib/db/queries/select');
        const { songs: dbSongs, total } = await getSongsByCategorySlugPaginated(categorySlug, limit, offset);

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
          language: (song as any).language ?? null,
        }));

        const hasMore = offset + songs.length < total;
        return { songs, total, hasMore };
      },
      [`songs-category-${categorySlug}-${limit}-${offset}`],
      {
        tags: ['songs', 'library'],
        revalidate: 60, // 1 minute
      }
    )();

    return { success: true, ...cachedResult };
  } catch (error) {
    console.error('Error in getSongsByCategoryAction:', error);
    return { success: false, error: 'Failed to get songs for category', songs: [], total: 0, hasMore: false };
  }
}

export type TemplatedSongCard = {
  id: number;
  title: string;
  template_title: string | null;
  slug: string;
  description: string | null;
  song_variants: unknown;
  selected_variant: number | null;
};

// Server-side: get active templated songs tagged with a category slug, with caching.
export async function getTemplatedSongsByCategoryAction(
  categorySlug: string,
  limit: number = 12,
): Promise<
  | { success: true; songs: TemplatedSongCard[] }
  | { success: false; error: string; songs: TemplatedSongCard[] }
> {
  try {
    const songs = await unstable_cache(
      async (): Promise<TemplatedSongCard[]> => {
        const { db } = await import('@/lib/db');
        const {
          templatedSongsTable,
          templatedSongCategoriesTable,
          categoriesTable,
        } = await import('@/lib/db/schema');
        const { eq, and, asc } = await import('drizzle-orm');
        const { mapSongVariantsRecordForResponse } = await import('@/lib/utils/url');

        const rows = await db
          .select({
            id: templatedSongsTable.id,
            title: templatedSongsTable.title,
            template_title: templatedSongsTable.template_title,
            slug: templatedSongsTable.slug,
            description: templatedSongsTable.description,
            song_variants: templatedSongsTable.song_variants,
            selected_variant: templatedSongsTable.selected_variant,
          })
          .from(templatedSongsTable)
          .innerJoin(
            templatedSongCategoriesTable,
            eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id),
          )
          .innerJoin(
            categoriesTable,
            and(
              eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
              eq(categoriesTable.slug, categorySlug),
            ),
          )
          .where(eq(templatedSongsTable.is_active, true))
          .orderBy(
            asc(templatedSongCategoriesTable.display_order),
            asc(templatedSongsTable.id),
          )
          .limit(limit);

        return rows.map((row) => ({
          ...row,
          song_variants: mapSongVariantsRecordForResponse(row.song_variants),
        }));
      },
      [`templated-songs-category-${categorySlug}-${limit}`],
      {
        tags: ['templated-songs', 'library'],
        revalidate: 60,
      },
    )();

    return { success: true, songs };
  } catch (error) {
    console.error('Error in getTemplatedSongsByCategoryAction:', error);
    return { success: false, error: 'Failed to get templated songs for category', songs: [] };
  }
}

// Server-side: list categories with counts and caching
export async function getCategoriesWithCountsAction(): Promise<
  | { success: true; categories: Array<{ id: number; name: string; slug: string; sequence: number; count: number }>; total: number }
  | { success: false; error: string; categories: Array<any>; total: number }
> {
  try {
    const { libraryCache, getCacheTTL } = await import('@/lib/cache');
    const cacheKey = libraryCache.getCategoriesKey();

    // Check cache first
    const cached = libraryCache.get<{ categories: Array<{ id: number; name: string; slug: string; sequence: number; count: number }>; total: number }>(cacheKey);
    if (cached) {
      return { success: true, ...cached };
    }

    const { getCategoriesWithCounts, getAllSongsPaginated } = await import('@/lib/db/queries/select');
    const [categories, { total }] = await Promise.all([
      getCategoriesWithCounts(),
      getAllSongsPaginated(1, 0), // Just get count, not actual songs
    ]);

    const result = {
      categories: categories.map(c => ({ ...c, sequence: c.sequence ?? 0 })),
      total
    };

    // Cache the result
    libraryCache.set(cacheKey, result, getCacheTTL('categories'));

    return { success: true, ...result };
  } catch (error) {
    console.error('Error in getCategoriesWithCountsAction:', error);
    return { success: false, error: 'Failed to get categories', categories: [], total: 0 };
  }
}
