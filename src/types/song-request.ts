export interface SongRequestPayload {
  requesterName: string;
  recipientDetails: string;
  occasion: string;
  languages: string;
  story: string;
  lyricsInputMode?: "story" | "lyrics";
  inputLyrics?: string;
  mood: string[];
  userId: number | string | null;
  anonymousUserId: string | null;
  mobileNumber?: string; // Optional mobile number
  email?: string; // Optional email address
}

export interface DBSongRequest {
  id: number;
  requester_name: string | null;
  recipient_details: string;
  languages: string;
  song_story: string | null;
  lyrics_input_mode: string | null;
  input_lyrics: string | null;
  occasion: string | null;
  mood: string[] | null;
  mobile_number: string | null;
  email: string | null;
  status: string | null;
  created_at: Date; // Drizzle ORM converts PostgreSQL timestamps to Date objects
  updated_at: Date; // Drizzle ORM converts PostgreSQL timestamps to Date objects
  user_id: number | null;
  anonymous_user_id: string | null;
  language_preferences: string | null;
  music_style_chips: string[] | null;
  music_style_notes: string | null;
}

export type SongRequestStatus = "pending" | "processing" | "completed" | "failed";



