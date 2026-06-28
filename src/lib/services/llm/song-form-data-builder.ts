/**
 * Shared helper for building SongFormData from a database song request.
 *
 * Multiple API routes (generate-lyrics, process-custom-lyrics,
 * regenerate-music-style) need to convert a DB song request row into
 * the SongFormData shape consumed by the LLM pipeline. This module
 * centralises that mapping so changes only need to happen in one place.
 */

import { DBSongRequest } from '@/types/song-request';
import { SongFormData } from './llm-lyrics-operation';
import { resolveOccasionLabel } from '@/lib/occasion-suggestions';

/**
 * Build a SongFormData object from a database song request.
 *
 * @param songRequest - The database row
 * @param overrides - Optional partial overrides (e.g. sourceSongLyrics, isPersonaBased)
 */
export function buildSongFormData(
  songRequest: DBSongRequest,
  overrides?: Partial<SongFormData>,
): SongFormData {
  return {
    recipientDetails: songRequest.recipient_details,
    occassion: resolveOccasionLabel(songRequest.occasion) || '',
    languages: songRequest.languages,
    songStory: songRequest.song_story || '',
    mood: songRequest.mood || [],
    languagePreferences: songRequest.language_preferences || undefined,
    advancedMusicChips:
      songRequest.music_style_chips?.length
        ? songRequest.music_style_chips
        : undefined,
    musicStyleNotes: songRequest.music_style_notes || undefined,
    ...overrides,
  };
}
