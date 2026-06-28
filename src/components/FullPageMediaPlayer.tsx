"use client";

import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useLyrics } from "@/hooks/useLyrics";
import { LyricsViewerModal } from "./LyricsViewerModal";
import { SongPlayerControls } from "./player/SongPlayerControls";
import { SongContent } from "./player/SongContent";
import type { LyricLine } from "@/types";

interface Song {
  id: string;
  title: string;
  artist: string;
  audioUrl?: string;
  song_url?: string;
  duration: number;
  timestamp_lyrics?: LyricLine[];
  timestamped_lyrics_variants?: { [variantIndex: number]: LyricLine[] } | null;
  selected_variant?: number;
  lyrics?: string | null;
  slug?: string;
  show_lyrics?: boolean;
  likes_count?: number;
  suno_variants?: Array<{
    id: string;
    sourceAudioUrl?: string | null;
    streamAudioUrl?: string | null;
    audioUrl: string | null;
    sourceImageUrl: string;
    imageUrl: string;
    prompt: string;
    modelName: string;
    title: string;
    tags: string;
    createTime: string;
    duration: number;
  }>;
  download_allowed?: boolean;
  song_description?: string;
  languageLinks?: Array<{ slug: string; name: string; nativeName: string }>;
}

interface FullPageMediaPlayerProps {
  song: Song;
  /** Optional slot for variant switcher - shown in the player bar after the song name */
  variantSwitcher?: React.ReactNode;
}

export const FullPageMediaPlayer = ({
  song,
  variantSwitcher,
}: FullPageMediaPlayerProps) => {
  // Helper function to get the best audio URL using standardized priority
  // Priority: sourceAudioUrl (highest quality) > streamAudioUrl > audioUrl
  const getBestAudioUrl = (): string | undefined => {
    // First, try song_url (which should already be the best URL from the API)
    if (song.song_url) {
      return song.song_url;
    }

    // Fallback to song.audioUrl
    if (song.audioUrl) {
      return song.audioUrl;
    }

    // If no direct URL, try to get from selected variant
    if (song.suno_variants && song.suno_variants.length > 0) {
      const selectedIndex = song.selected_variant ?? 0;
      const selectedVariant =
        song.suno_variants[selectedIndex] || song.suno_variants[0];

      if (selectedVariant) {
        return (
          selectedVariant.sourceAudioUrl ||
          selectedVariant.streamAudioUrl ||
          selectedVariant.audioUrl ||
          undefined
        );
      }
    }

    return undefined;
  };

  // Get the best audio URL for consistent use across playing and downloading
  const bestAudioUrl = getBestAudioUrl();

  // Use audio player hook
  const {
    isPlaying,
    currentTime,
    duration,
    audioError,
    isLoading,
    isPlayLoading,
    togglePlay,
    skipTime,
    seekTo,
    formatTime,
    audioRef,
  } = useAudioPlayer({
    audioUrl: bestAudioUrl,
    songTitle: song.title,
    songId: song.id,
    songSlug: song.slug,
  });

  // Convert current time to milliseconds for timestamp comparison
  const currentTimeMs = currentTime * 1000;

  // Generate deterministic heights for visualizer bars to avoid hydration mismatch
  // Using a deterministic function based on index to ensure server/client match
  const getBarHeight = (index: number) => {
    // Use a deterministic pattern based on index (sine wave pattern)
    return 20 + (Math.sin(index * 0.5) * 0.5 + 0.5) * 40;
  };

  // Use lyrics hook
  const {
    lyrics,
    showLyricsViewer,
    setShowLyricsViewer,
    hasLyrics,
    getLyricsData,
    lyricsContainerRef,
    lyricRefs,
  } = useLyrics({
    song,
    currentTimeMs,
    isPlaying,
    audioError,
  });

  // Helper function to get the variant image URL from the selected variant
  const getVariantImageUrl = () => {
    if (song.suno_variants && song.suno_variants.length > 0) {
      // Get the selected variant index (default to 0 if not set)
      const selectedIndex = song.selected_variant ?? 0;
      const selectedVariant =
        song.suno_variants[selectedIndex] || song.suno_variants[0];
      return (
        selectedVariant?.sourceImageUrl || selectedVariant?.imageUrl || null
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={bestAudioUrl}
        preload="auto"
        playsInline
        controls={false}
        muted={false}
      />

      {/* Main Content Section */}
      <SongContent
        songTitle={song.title}
        imageUrl={getVariantImageUrl()}
        lyrics={lyrics}
        hasLyrics={hasLyrics}
        onViewLyrics={() => setShowLyricsViewer(true)}
        isPlaying={isPlaying}
        showLyrics={song.show_lyrics !== false}
        lyricsContainerRef={lyricsContainerRef}
        lyricRefs={lyricRefs}
        getBarHeight={getBarHeight}
        songDescription={song.song_description}
        languageLinks={song.languageLinks}
      />

      {/* Fixed Bottom Player Controls */}
      <SongPlayerControls
        songTitle={song.title}
        songId={song.id}
        songSlug={song.slug}
        likesCount={song.likes_count}
        isPlaying={isPlaying}
        isLoading={isLoading}
        isPlayLoading={isPlayLoading}
        currentTime={currentTime}
        duration={duration}
        formatTime={formatTime}
        togglePlay={togglePlay}
        skipTime={skipTime}
        seekTo={seekTo}
        variantSwitcher={variantSwitcher}
      />

      {/* Lyrics Viewer Modal */}
      <LyricsViewerModal
        show={showLyricsViewer}
        onClose={() => setShowLyricsViewer(false)}
        title={song.title}
        songSlug={song.slug}
        songId={song.id}
        lyricsData={getLyricsData()}
        isLoading={false}
      />
    </div>
  );
};
