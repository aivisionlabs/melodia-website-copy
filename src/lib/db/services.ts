import { getAllSongs as getAllSongsQuery, getAllSongsForAdminQuery, getSongBySlug as getSongBySlugQuery, getSongByTaskId as getSongByTaskIdQuery, getAllSongRequests as getAllSongRequestsQuery, getAllUserSongsForAdmin as getAllUserSongsForAdminQuery, getPaymentAnalytics as getPaymentAnalyticsQuery, getAllSongsForAdminPaginated as getAllSongsForAdminPaginatedQuery, getAllSongRequestsPaginated as getAllSongRequestsPaginatedQuery, getAllUserSongsForAdminPaginated as getAllUserSongsForAdminPaginatedQuery, getAllSongsWithCategoriesForFuzzySearch, SongRequestWithRelations } from './queries/select';
import { createSong as createSongQuery } from './queries/insert';
import { updateSongStatus as updateSongStatusQuery, updateSongWithVariants as updateSongWithVariantsQuery, updateSongRequestStatus as updateSongRequestStatusQuery } from './queries/update';
import { Song } from '@/types';
import { generateBaseSlug } from '@/lib/utils/slug';
import bcrypt from 'bcryptjs';
import { db } from './index';
import { adminUsersTable, songCategoriesTable, SelectSongRequest, SelectUserSong, SelectSong, SelectChangeRequest, songRequestsTable } from './schema';
import { eq } from 'drizzle-orm';

// Song Services
export async function getAllSongs(): Promise<Song[]> {
  try {
    const songs = await getAllSongsQuery();
    return songs.map(song => ({
      id: song.id,
      created_at: song.created_at.toISOString(),
      title: song.title,
      lyrics: song.lyrics,
      song_description: (song as any).song_description ?? null,
      timestamp_lyrics: song.timestamp_lyrics as any,
      timestamped_lyrics_variants: song.timestamped_lyrics_variants as any,
      timestamped_lyrics_api_responses: song.timestamped_lyrics_api_responses as any,
      music_style: song.music_style,
      service_provider: song.service_provider,
      song_requester: song.song_requester,
      prompt: song.prompt,
      song_url: song.song_url,
      duration: song.duration,
      slug: song.slug,
      add_to_library: song.add_to_library ?? undefined,
      is_deleted: song.is_deleted ?? undefined,
      status: song.status ?? undefined,
      categories: song.categories ?? undefined,
      tags: song.tags ?? undefined,
      suno_task_id: song.suno_task_id ?? undefined,
      metadata: song.metadata ?? undefined,
      show_lyrics: song.show_lyrics ?? undefined,
      likes_count: (song as any).likes_count ?? 0,
      play_count: (song as any).play_count ?? 0,
      download_allowed: song.download_allowed ?? false,
      language: (song as any).language ?? null,
    }));
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
}

export async function getAllSongsForAdmin(): Promise<Song[]> {
  try {
    const songs = await getAllSongsForAdminQuery();
    return songs.map((song) => mapAdminSongRow(song));
  } catch (error) {
    console.error('Error fetching admin songs:', error);
    return [];
  }
}

function mapAdminSongRow(song: any): Song {
  const variant_audio_urls: Array<string | null> | null | undefined =
    song.variant_audio_urls
      ? (Array.isArray(song.variant_audio_urls)
        ? song.variant_audio_urls
        : typeof song.variant_audio_urls === 'string'
          ? (() => {
            try {
              const parsed = JSON.parse(song.variant_audio_urls);
              return Array.isArray(parsed) ? parsed : null;
            } catch {
              return null;
            }
          })()
          : song.variant_audio_urls)
      : null;

  return {
    id: song.id,
    created_at: song.created_at.toISOString(),
    title: song.title,
    lyrics: null,
    song_description: null,
    timestamp_lyrics: song.timestamp_lyrics as any,
    timestamped_lyrics_variants: null,
    timestamped_lyrics_api_responses: null,
    music_style: song.music_style,
    service_provider: song.service_provider,
    song_requester: song.song_requester,
    prompt: null,
    song_url: song.song_url,
    duration: song.duration,
    slug: song.slug,
    add_to_library: song.add_to_library ?? undefined,
    is_deleted: song.is_deleted ?? undefined,
    status: song.status ?? undefined,
    categories: song.categories ?? undefined,
    tags: song.tags ?? undefined,
    suno_task_id: song.suno_task_id ?? undefined,
    negative_tags: undefined,
    suno_variants: song.suno_variants ?? undefined,
    selected_variant: song.selected_variant ?? undefined,
    metadata: undefined,
    sequence: song.sequence ?? undefined,
    show_lyrics: song.show_lyrics ?? undefined,
    likes_count: song.likes_count ?? 0,
    play_count: song.play_count ?? 0,
    download_allowed: song.download_allowed ?? false,
    // Lightweight list fields
    has_timestamp_lyrics: song.has_timestamp_lyrics ?? undefined,
    variant_count: song.variant_count ?? undefined,
    variant_audio_urls: variant_audio_urls ?? undefined,
    language: song.language ?? null,
  };
}

export async function getAllSongsForAdminPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  categoryFilter?: string,
  sortBy?: string
): Promise<{ songs: Song[]; total: number }> {
  try {
    // Pass all filters to the database query
    const { songs, total } = await getAllSongsForAdminPaginatedQuery(
      limit,
      offset,
      searchQuery,
      categoryFilter,
      sortBy
    );
    return {
      songs: songs.map(song => mapAdminSongRow(song)),
      total
    };
  } catch (error) {
    console.error('Error fetching paginated admin songs:', error);
    return { songs: [], total: 0 };
  }
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  try {
    const song = await getSongBySlugQuery(slug);
    if (!song) return null;

    return {
      id: song.id,
      created_at: song.created_at.toISOString(),
      title: song.title,
      lyrics: song.lyrics,
      song_description: (song as any).song_description ?? null,
      timestamp_lyrics: song.timestamp_lyrics as any,
      timestamped_lyrics_variants: song.timestamped_lyrics_variants as any,
      timestamped_lyrics_api_responses: song.timestamped_lyrics_api_responses as any,
      music_style: song.music_style,
      service_provider: song.service_provider,
      song_requester: song.song_requester,
      prompt: song.prompt,
      song_url: song.song_url,
      duration: song.duration,
      slug: song.slug,
      add_to_library: song.add_to_library ?? undefined,
      is_deleted: song.is_deleted ?? undefined,
      status: song.status ?? undefined,
      categories: song.categories ?? undefined,
      tags: song.tags ?? undefined,
      suno_task_id: song.suno_task_id ?? undefined,
      negative_tags: song.negative_tags ?? undefined,
      suno_variants: song.suno_variants ?? undefined,
      selected_variant: song.selected_variant ?? undefined,
      metadata: song.metadata ?? undefined,
      show_lyrics: song.show_lyrics ?? undefined,
      likes_count: (song as any).likes_count ?? 0,
      play_count: (song as any).play_count ?? 0,
      download_allowed: song.download_allowed ?? false,
      language: (song as any).language ?? null,
    };
  } catch (error) {
    console.error('Error fetching song:', error);
    return null;
  }
}

export async function getSongByTaskId(taskId: string): Promise<Song | null> {
  try {
    const song = await getSongByTaskIdQuery(taskId);
    if (!song) return null;

    return {
      id: song.id,
      created_at: song.created_at.toISOString(),
      title: song.title,
      lyrics: song.lyrics,
      song_description: (song as any).song_description ?? null,
      timestamp_lyrics: song.timestamp_lyrics as any,
      timestamped_lyrics_variants: song.timestamped_lyrics_variants as any,
      timestamped_lyrics_api_responses: song.timestamped_lyrics_api_responses as any,
      music_style: song.music_style,
      service_provider: song.service_provider,
      song_requester: song.song_requester,
      prompt: song.prompt,
      song_url: song.song_url,
      duration: song.duration,
      slug: song.slug,
      add_to_library: song.add_to_library ?? undefined,
      is_deleted: song.is_deleted ?? undefined,
      status: song.status ?? undefined,
      categories: song.categories ?? undefined,
      tags: song.tags ?? undefined,
      suno_task_id: song.suno_task_id ?? undefined,
      negative_tags: song.negative_tags ?? undefined,
      suno_variants: song.suno_variants ?? undefined,
      selected_variant: song.selected_variant ?? undefined,
      metadata: song.metadata ?? undefined,
      show_lyrics: song.show_lyrics ?? undefined,
      likes_count: (song as any).likes_count ?? 0,
      play_count: (song as any).play_count ?? 0,
      download_allowed: song.download_allowed ?? false,
      language: (song as any).language ?? null,
    };
  } catch (error) {
    console.error('Error fetching song by task ID:', error);
    return null;
  }
}

export async function getSongById(id: number): Promise<Song | null> {
  try {
    const { getSongByIdQuery } = await import('./queries/select');
    const song = await getSongByIdQuery(id);
    if (!song) return null;

    return {
      id: song.id,
      created_at: song.created_at.toISOString(),
      title: song.title,
      lyrics: song.lyrics,
      song_description: (song as any).song_description ?? null,
      timestamp_lyrics: song.timestamp_lyrics as any,
      timestamped_lyrics_variants: song.timestamped_lyrics_variants as any,
      timestamped_lyrics_api_responses: song.timestamped_lyrics_api_responses as any,
      music_style: song.music_style,
      service_provider: song.service_provider,
      song_requester: song.song_requester,
      prompt: song.prompt,
      song_url: song.song_url,
      duration: song.duration,
      slug: song.slug,
      add_to_library: song.add_to_library ?? undefined,
      is_deleted: song.is_deleted ?? undefined,
      status: song.status ?? undefined,
      categories: song.categories ?? undefined,
      tags: song.tags ?? undefined,
      suno_task_id: song.suno_task_id ?? undefined,
      negative_tags: song.negative_tags ?? undefined,
      suno_variants: song.suno_variants ?? undefined,
      selected_variant: song.selected_variant ?? undefined,
      metadata: song.metadata ?? undefined,
      show_lyrics: song.show_lyrics ?? undefined,
      likes_count: (song as any).likes_count ?? 0,
      play_count: (song as any).play_count ?? 0,
      download_allowed: song.download_allowed ?? false,
      language: (song as any).language ?? null,
    };
  } catch (error) {
    console.error('Error fetching song by ID:', error);
    return null;
  }
}

export async function incrementSongLike(slug: string) {
  const { incrementSongLikeBySlug } = await import('./queries/update');
  await incrementSongLikeBySlug(slug);
}

export async function decrementSongLike(slug: string) {
  const { decrementSongLikeBySlug } = await import('./queries/update');
  await decrementSongLikeBySlug(slug);
}

export async function incrementSongPlayCount(slug: string) {
  const { incrementSongPlayCountBySlug } = await import('./queries/update');
  await incrementSongPlayCountBySlug(slug);
}


// Helper function to generate unique slug
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  // If base slug is empty, use a default
  if (!baseSlug || baseSlug.trim() === '') {
    baseSlug = 'song';
  }

  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 1000;

  console.log(`Generating unique slug for base: "${baseSlug}"`);

  while (counter <= maxAttempts) {
    // Check if slug exists in database (including deleted songs)
    const { getSongBySlugAll } = await import('./queries/select');
    const existingSong = await getSongBySlugAll(slug);

    if (!existingSong) {
      console.log(`Generated unique slug: "${slug}" (attempt ${counter})`);
      return slug;
    }

    // Generate next slug with counter
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Fallback: use timestamp to ensure uniqueness
  const timestamp = Date.now();
  const fallbackSlug = `${baseSlug}-${timestamp}`;
  console.log(`Using fallback slug: "${fallbackSlug}" after ${maxAttempts} attempts`);
  return fallbackSlug;
}

export async function createSong(songData: {
  title: string;
  lyrics: string;
  music_style: string | null;
  tags?: string[];
  negative_tags?: string;
  prompt?: string;
  download_allowed?: boolean;
  customer_lyrics?: string | null;
  song_request_id?: number;
  language?: string | null;
  metadata?: any;
}): Promise<{ success: boolean; songId?: number; error?: string }> {
  try {
    // Validate title
    if (!songData.title || typeof songData.title !== 'string' || songData.title.trim().length === 0) {
      return { success: false, error: 'Title is required and cannot be empty' };
    }

    if (songData.title.length > 200) {
      return { success: false, error: 'Title is too long (maximum 200 characters)' };
    }

    // Generate base slug from title
    const baseSlug = generateBaseSlug(songData.title);

    // Generate unique slug
    const slug = await generateUniqueSlug(baseSlug);

    const newSong = {
      title: songData.title,
      lyrics: songData.lyrics,
      customer_lyrics: songData.customer_lyrics ?? null,
      music_style: songData.music_style,
      tags: songData.tags || [],
      negative_tags: songData.negative_tags,
      prompt: songData.prompt || songData.lyrics,
      slug,
      status: 'draft',
      add_to_library: false,
      is_deleted: false,
      download_allowed: songData.download_allowed || false,
      song_request_id: songData.song_request_id,
      language: songData.language ?? null,
      metadata: songData.metadata,
    };

    const song = await createSongQuery(newSong);
    return { success: true, songId: song.id };
  } catch (error) {
    console.error('Error creating song:', error);

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('songs_slug_key')) {
        return { success: false, error: 'A song with this title already exists (including deleted songs). Please choose a different title.' };
      }
      if (error.message.includes('violates not-null constraint')) {
        return { success: false, error: 'Missing required fields. Please fill in all required information.' };
      }
    }

    return { success: false, error: 'Failed to create song. Please try again.' };
  }
}

export async function updateSongStatus(
  songId: number,
  status: 'draft' | 'pending' | 'generating' | 'completed' | 'failed',
  songUrl?: string,
  sunoTaskId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateSongStatusQuery(songId, status, songUrl, sunoTaskId);
    return { success: true };
  } catch (error) {
    console.error('Error updating song status:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateSongWithSunoVariants(
  songId: number,
  sunoVariants: any[],
  selectedVariant?: number,
  addToLibrary?: boolean,
  showLyrics?: boolean,
  downloadAllowed?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateSongWithVariantsQuery(songId, sunoVariants, selectedVariant, addToLibrary, showLyrics, downloadAllowed);
    return { success: true };
  } catch (error) {
    console.error('Error updating song with variants:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Analytics Services - Removed for now
export async function incrementSongView(songId: number): Promise<void> {
  // TODO: Implement analytics tracking later
  console.log('Song view tracked:', songId);
}

export async function incrementSongPlay(songId: number): Promise<void> {
  // TODO: Implement analytics tracking later
  console.log('Song play tracked:', songId);
}

// Admin Services
export async function validateAdminCredentials(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔍 [DEBUG] Validating credentials for user: ${username}`);

    // Query the database for the admin user
    const adminUser = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);

    console.log(`📋 [DEBUG] Query result: ${adminUser.length} users found`);

    if (adminUser.length === 0) {
      console.log('❌ [DEBUG] No user found');
      return { success: false, error: 'Invalid credentials' };
    }

    const user = adminUser[0];
    console.log(`👤 [DEBUG] Found user: ${user.username}`);
    console.log(`🔐 [DEBUG] Password hash: ${user.password_hash}`);

    // Compare the provided password with the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`✅ [DEBUG] Password comparison result: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log('❌ [DEBUG] Password does not match');
      return { success: false, error: 'Invalid credentials' };
    }

    console.log('🎉 [DEBUG] Authentication successful!');
    return { success: true };
  } catch (error) {
    console.error('❌ [DEBUG] Error validating admin credentials:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function softDeleteSong(songId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { updateSong } = await import('./queries/update');
    await updateSong(songId, { is_deleted: true });
    return { success: true };
  } catch (error) {
    console.error('Error soft deleting song:', error);
    return { success: false, error: 'Failed to delete song' };
  }
}

// Admin user management
export async function createAdminUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: 'Username already exists' };
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new admin user
    await db.insert(adminUsersTable).values({
      username,
      password_hash: hashedPassword,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
}

export async function restoreSong(songId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { updateSong } = await import('./queries/update');
    await updateSong(songId, { is_deleted: false });
    return { success: true };
  } catch (error) {
    console.error('Error restoring song:', error);
    return { success: false, error: 'Failed to restore song' };
  }
}

// Song-Category mapping services
export async function createSongCategoryMappings(songId: number, categoryIds: number[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (categoryIds.length === 0) {
      return { success: true };
    }

    // Create mappings for each category
    const mappings = categoryIds.map(categoryId => ({
      song_id: songId,
      category_id: categoryId,
    }));

    // Use onConflictDoNothing to handle duplicate mappings gracefully
    await db.insert(songCategoriesTable)
      .values(mappings)
      .onConflictDoNothing();

    console.log(`Successfully inserted/ignored ${mappings.length} category mapping(s) for song ${songId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating song-category mappings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create category mappings' };
  }
}

// Song Request Services
export async function getAllSongRequests(): Promise<SongRequestWithRelations[]> {
  try {
    return await getAllSongRequestsQuery();
  } catch (error) {
    console.error('Error fetching song requests:', error);
    return [];
  }
}

export interface RequestFilters {
  package?: string;
  payment?: string;
  fulfillment?: string;
  dateRange?: string;
  assignee?: string;
}

export async function getAllSongRequestsPaginated(limit: number = 50, offset: number = 0, searchQuery?: string, filters?: RequestFilters) {
  try {
    // Pass the search query and filters directly to the database query
    return await getAllSongRequestsPaginatedQuery(limit, offset, searchQuery, filters);
  } catch (error) {
    console.error('Error fetching paginated song requests:', error);
    return { requests: [], total: 0 };
  }
}

// OPTIMIZED: Lightweight version for initial dashboard load (2 queries instead of 7)
export async function getAllSongRequestsLightweightService(limit: number = 50, offset: number = 0, searchQuery?: string, filters?: RequestFilters) {
  try {
    const { getAllSongRequestsLightweight } = await import('./queries/select/song-requests-lightweight');
    return await getAllSongRequestsLightweight(limit, offset, searchQuery, filters);
  } catch (error) {
    console.error('Error fetching lightweight song requests:', error);
    return { requests: [], total: 0 };
  }
}

// Get all user songs for admin portal
export async function getAllUserSongsForAdmin() {
  try {
    return await getAllUserSongsForAdminQuery();
  } catch (error) {
    console.error('Error fetching user songs for admin:', error);
    return [];
  }
}

export async function getAllUserSongsForAdminPaginated(limit: number = 50, offset: number = 0, searchQuery?: string) {
  try {
    // Server-side search is now handled in the query
    return await getAllUserSongsForAdminPaginatedQuery(limit, offset, searchQuery);
  } catch (error) {
    console.error('Error fetching paginated user songs:', error);
    return { userSongs: [], total: 0 };
  }
}

// Get payment analytics
export async function getPaymentAnalytics() {
  try {
    return await getPaymentAnalyticsQuery();
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    // Generate empty daily data for last 30 days
    const generateDateRange = () => {
      const dates: string[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };
    const allDates = generateDateRange();
    return {
      paidSongs: { count: 0, revenue: 0 },
      paidRequests: { count: 0, revenue: 0 },
      totalRevenue: 0,
      totalCompletedPayments: 0,
      recentPayments: { count: 0, revenue: 0 },
      paymentStatusBreakdown: [],
      dailyData: allDates.map((date) => ({
        date,
        revenue: 0,
        paymentCount: 0,
        paidSongs: 0,
        paidRequests: 0,
      })),
    };
  }
}

export async function markSongRequestAsCompleted(requestId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await updateSongRequestStatusQuery(requestId, 'completed');
    return { success: true };
  } catch (error) {
    console.error('Error marking song request as completed:', error);
    return { success: false, error: 'Failed to mark request as completed' };
  }
}

export async function cancelSongRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if request exists and get its current status
    const requestResult = await db
      .select({
        id: songRequestsTable.id,
        status: songRequestsTable.status,
      })
      .from(songRequestsTable)
      .where(eq(songRequestsTable.id, requestId))
      .limit(1);

    if (requestResult.length === 0) {
      return { success: false, error: 'Request not found' };
    }

    const request = requestResult[0];

    // Only allow cancelling requests that aren't already completed or cancelled
    if (request.status === 'completed') {
      return { success: false, error: 'Cannot cancel a completed request' };
    }

    if (request.status === 'cancelled') {
      return { success: false, error: 'Request is already cancelled' };
    }

    await updateSongRequestStatusQuery(requestId, 'cancelled');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling song request:', error);
    return { success: false, error: 'Failed to cancel request' };
  }
}
