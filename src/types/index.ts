export interface LyricLine {
  index: number
  text: string
  start: number
  end: number
}

export interface AlignedWord {
  word: string
  startS: number // Changed from start_s to startS to match API response
  endS: number   // Changed from end_s to endS to match API response
  success: boolean
  palign: number // API response uses 'palign' not 'p_align'
}

export interface Song {
  id: number
  created_at: string
  title: string
  lyrics: string | null
  song_description?: string | null
  timestamp_lyrics: LyricLine[] | null
  timestamped_lyrics_variants: { [variantIndex: number]: LyricLine[] } | null
  timestamped_lyrics_api_responses: { [variantIndex: number]: any } | null
  music_style: string | null
  service_provider: string | null
  song_requester: string | null
  prompt: string | null
  song_url: string | null
  duration: string | null // Changed from number to string to match numeric database field
  slug: string
  add_to_library?: boolean
  is_deleted?: boolean
  status?: string
  categories?: string[]
  tags?: string[]
  suno_task_id?: string
  negative_tags?: string
  suno_variants?: any
  selected_variant?: number
  metadata?: any
  sequence?: number // Field to control display order
  show_lyrics?: boolean // Field to control whether to show lyrics
  likes_count?: number
  play_count?: number // Track how many times a song has been played
  download_allowed?: boolean // Field to control whether download is allowed
  hasPersona?: boolean // Whether this library song has an associated persona
  language?: string | null // Comma-separated values of languages for the song
  // Admin list performance fields (optional)
  has_timestamp_lyrics?: boolean
  variant_count?: number
  variant_audio_urls?: Array<string | null>
}

// Public song interface (without sensitive fields)
export interface PublicSong {
  id: number
  title: string
  lyrics: string | null
  song_description?: string | null
  timestamp_lyrics: LyricLine[] | null
  timestamped_lyrics_variants: { [variantIndex: number]: LyricLine[] } | null
  selected_variant?: number
  music_style: string | null
  service_provider: string | null
  song_url: string | null
  duration: string | null // Changed from number to string to match numeric database field
  slug: string
  /** Optional: from song_requests join or metadata; used for MusicRecording schema (keywords, about) */
  occasion?: string | null
  /** Optional: from song_requests join or metadata; used for MusicRecording schema (keywords, genre, audio description) */
  mood?: string | string[] | null
  /** Optional: languages from song_requests; used for MusicRecording schema (keywords) */
  request_languages?: string | null
  /** Auto-generated listing tags (theme/style); optional on library songs */
  tags?: string[] | null
  /** Category labels or slugs on songs row; optional */
  categories?: string[] | null
}

export interface CategoryWithCount {
  id: number
  name: string
  slug: string
  sequence: number
  count: number
}

export interface User {
  id: number;
  name: string;
  email: string;
  date_of_birth: string;
  phone_number: string | null;
  profile_picture: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}