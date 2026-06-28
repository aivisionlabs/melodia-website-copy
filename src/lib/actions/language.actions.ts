'use server'

import { Song } from '@/types';
import { unstable_cache } from 'next/cache';

function transformLibrarySong(song: Awaited<
  ReturnType<typeof import('@/lib/db/queries/select').getSongsByLanguagePaginated>
>['songs'][number]): Song {
  return {
    id: song.id,
    created_at: song.created_at.toISOString(),
    title: song.title,
    lyrics: null,
    song_description: song.song_description ?? null,
    timestamp_lyrics: null,
    timestamped_lyrics_variants: null,
    timestamped_lyrics_api_responses: null,
    music_style: song.music_style ?? null,
    service_provider: song.service_provider ?? null,
    song_requester: null,
    prompt: null,
    song_url: song.song_url ?? null,
    duration: song.duration ?? null,
    slug: song.slug,
    add_to_library: song.add_to_library ?? undefined,
    is_deleted: song.is_deleted ?? undefined,
    status: song.status ?? undefined,
    categories: song.categories ?? undefined,
    tags: song.tags ?? undefined,
    suno_task_id: undefined,
    negative_tags: undefined,
    suno_variants: song.suno_variants as any,
    selected_variant: song.selected_variant ?? undefined,
    metadata: undefined,
    sequence: song.sequence ?? undefined,
    show_lyrics: song.show_lyrics ?? true,
    likes_count: (song as any).likes_count ?? 0,
    hasPersona: (song as any).has_persona ?? false,
    language: (song as any).language ?? null,
  };
}

export async function getSongsByLanguageAction(
  languageName: string,
  limit: number = 20,
  offset: number = 0,
): Promise<
  | { success: true; songs: Song[]; total: number; hasMore: boolean }
  | { success: false; error: string; songs: Song[]; total: number; hasMore: boolean }
> {
  try {
    const cachedResult = await unstable_cache(
      async () => {
        const { getSongsByLanguagePaginated } = await import('@/lib/db/queries/select');
        const { songs: dbSongs, total } = await getSongsByLanguagePaginated(languageName, limit, offset);
        const songs = dbSongs.map(transformLibrarySong);
        const hasMore = offset + songs.length < total;
        return { songs, total, hasMore };
      },
      [`songs-language-${languageName}-${limit}-${offset}`],
      {
        tags: ['songs', 'library'],
        revalidate: 60,
      },
    )();

    return { success: true, ...cachedResult };
  } catch (error) {
    console.error('Error in getSongsByLanguageAction:', error);
    return { success: false, error: 'Failed to get songs for language', songs: [], total: 0, hasMore: false };
  }
}
