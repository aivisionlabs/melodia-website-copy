export type SongPreview = {
  id: number;
  title: string;
  imageUrl?: string | null;
  slug?: string;
  song_url?: string | null;
  service_provider?: string | null;
};

export type LyricsInputMode = "story" | "lyrics";
