"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { LyricLine as BaseLyricLine } from "@/types";

// Processed lyric line with active/past state (output type)
interface ProcessedLyricLine {
  index: number;
  text: string;
  start: number;
  end: number;
  isActive: boolean;
  isPast: boolean;
}

// Input lyrics data (base type without isActive/isPast)
interface LyricsData {
  timestamp_lyrics?: BaseLyricLine[];
  timestamped_lyrics_variants?: { [variantIndex: number]: BaseLyricLine[] };
  selected_variant?: number;
  plain_lyrics?: string;
}

// Song interface for input (uses base LyricLine type)
interface Song {
  title: string;
  artist: string;
  audioUrl?: string;
  song_url?: string;
  videoUrl?: string;
  lyrics?: BaseLyricLine[] | string | null;
  timestamp_lyrics?: BaseLyricLine[];
  timestamped_lyrics_variants?: {
    [variantIndex: number]: BaseLyricLine[];
  } | null;
  selected_variant?: number;
  slug?: string;
  show_lyrics?: boolean;
  likes_count?: number;
}

interface LyricsState {
  lyrics: ProcessedLyricLine[];
  isLoadingLyrics: boolean;
  fetchedLyrics: LyricsData | null;
  showLyricsViewer: boolean;
}

interface LyricsActions {
  setShowLyricsViewer: (show: boolean) => void;
  hasLyrics: () => boolean;
  getLyricsData: () => string | null;
  lyricsContainerRef: React.RefObject<HTMLDivElement | null>;
  lyricRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  shouldShowLyrics: boolean;
}

interface UseLyricsOptions {
  song: Song;
  currentTimeMs: number;
  isPlaying: boolean;
  audioError: boolean;
}

export function useLyrics({
  song,
  currentTimeMs,
  isPlaying,
  audioError,
}: UseLyricsOptions): LyricsState & LyricsActions {
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [showLyricsViewer, setShowLyricsViewer] = useState(false);
  const [fetchedLyrics, setFetchedLyrics] = useState<LyricsData | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Helper function to check if lyrics should be shown
  const shouldShowLyrics = song.show_lyrics !== false; // Default to true if undefined

  // Helper function to check if lyrics are available
  const hasLyrics = useCallback(() => {
    const lyrics = song.lyrics || fetchedLyrics?.plain_lyrics;
    return (
      lyrics !== null &&
      typeof lyrics === "string" &&
      lyrics.trim().length > 0
    );
  }, [song.lyrics, fetchedLyrics?.plain_lyrics]);

  // Helper function to get lyrics data
  const getLyricsData = useCallback(() => {
    // Always use the lyrics field
    return song.lyrics as string | null || fetchedLyrics?.plain_lyrics || null;
  }, [song.lyrics, fetchedLyrics?.plain_lyrics]);

  // Function to fetch lyrics for library songs (by slug). Skip when we already have lyrics
  // (e.g. templated instances pass replaced_lyrics and use a different slug space).
  const fetchSongLyrics = useCallback(async () => {
    if (
      song.timestamp_lyrics ||
      song.timestamped_lyrics_variants ||
      !song.slug
    ) {
      return;
    }
    if (
      typeof song.lyrics === "string" &&
      song.lyrics.trim().length > 0
    ) {
      return;
    }

    try {
      setIsLoadingLyrics(true);
      const response = await fetch(`/api/song-lyrics/${song.slug}`);
      const data = await response.json();

      if (data.success && data.song) {
        setFetchedLyrics({
          timestamp_lyrics: data.song.timestamp_lyrics,
          timestamped_lyrics_variants: data.song.timestamped_lyrics_variants,
          selected_variant: data.song.selected_variant,
          plain_lyrics: data.song.lyrics,
        });
      }
    } catch (error) {
      console.warn("Failed to fetch song lyrics:", error);
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [song.slug, song.lyrics, song.timestamp_lyrics, song.timestamped_lyrics_variants]);

  // Fetch lyrics when component mounts
  useEffect(() => {
    fetchSongLyrics();
  }, [fetchSongLyrics]);

  const getLyricsAtTime = (timeMs: number): ProcessedLyricLine[] => {
    // If we're loading lyrics, return loading state
    if (isLoadingLyrics) {
      return [
        {
          index: 0,
          text: "Loading lyrics...",
          start: 0,
          end: 1000,
          isActive: true,
          isPast: false,
        },
      ];
    }

    // Priority 1: Use timestamp_lyrics (final variation) if available
    const timestampLyrics =
      song.timestamp_lyrics || fetchedLyrics?.timestamp_lyrics;
    if (timestampLyrics && timestampLyrics.length > 0) {
      return timestampLyrics.map((line: BaseLyricLine): ProcessedLyricLine => ({
        ...line,
        isActive: timeMs >= line.start && timeMs < line.end,
        isPast: timeMs >= line.end,
      }));
    }

    // Priority 2: Use timestamped lyrics variants if available (fallback)
    const timestampedVariants =
      song.timestamped_lyrics_variants ||
      fetchedLyrics?.timestamped_lyrics_variants;
    if (timestampedVariants) {
      // If no selected_variant is set, default to variant 0
      const selectedVariant =
        song.selected_variant !== undefined
          ? song.selected_variant
          : fetchedLyrics?.selected_variant !== undefined
            ? fetchedLyrics.selected_variant
            : 0;
      let selectedVariantLyrics = timestampedVariants[selectedVariant];

      // If the default variant doesn't exist, try to find any available variant
      if (!selectedVariantLyrics || selectedVariantLyrics.length === 0) {
        const availableVariants = Object.keys(timestampedVariants);
        if (availableVariants.length > 0) {
          const firstVariant = parseInt(availableVariants[0]);
          selectedVariantLyrics = timestampedVariants[firstVariant];
        }
      }

      if (selectedVariantLyrics && selectedVariantLyrics.length > 0) {
        return selectedVariantLyrics.map((line: BaseLyricLine): ProcessedLyricLine => ({
          ...line,
          isActive: timeMs >= line.start && timeMs < line.end,
          isPast: timeMs >= line.end,
        }));
      }
    }

    // Priority 3: Use the legacy lyrics prop if available
    if (song.lyrics && Array.isArray(song.lyrics) && song.lyrics.length > 0) {
      console.log("MediaPlayer: Using legacy lyrics prop");
      return song.lyrics.map((line: BaseLyricLine): ProcessedLyricLine => ({
        ...line,
        isActive: timeMs >= line.start && timeMs < line.end,
        isPast: timeMs >= line.end,
      }));
    }

    // No lyrics available - return empty array to show music experience UI
    return [];
  };

  // Calculate lyrics
  const lyrics = getLyricsAtTime(currentTimeMs);

  // Auto-scroll to active lyric (Spotify-style)
  useEffect(() => {
    if (!isPlaying || audioError || !lyricsContainerRef.current) return;

    const activeIndex = lyrics.findIndex((line) => line.isActive);
    if (activeIndex === -1) return;

    const activeElement = lyricRefs.current[activeIndex];
    if (!activeElement) return;

    // Make auto-scroll robust across layout changes:
    // Use scrollIntoView to let the browser pick the correct scroll container,
    // and center the active lyric in the viewport.
    requestAnimationFrame(() => {
      try {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      } catch {
        // Fallback for older browsers / edge cases
        const container = lyricsContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();

        const containerCenter = containerRect.height / 2;
        const elementCenter =
          elementRect.top + elementRect.height / 2 - containerRect.top;
        const scrollOffset = elementCenter - containerCenter;

        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: "smooth",
        });
      }
    });
  }, [currentTimeMs, isPlaying, audioError, lyrics]);

  // Reset lyrics position only on errors (or when playback is effectively reset to start).
  // Pausing should NOT jump the user back to the top.
  useEffect(() => {
    const shouldResetToTop = audioError || (!isPlaying && currentTimeMs <= 0);
    if (!shouldResetToTop) return;

    if (lyricsContainerRef.current) {
      lyricsContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [isPlaying, audioError, currentTimeMs]);

  return {
    // State
    lyrics,
    isLoadingLyrics,
    fetchedLyrics,
    showLyricsViewer,
    // Actions
    setShowLyricsViewer,
    hasLyrics,
    getLyricsData,
    // Refs for components to use
    lyricsContainerRef,
    lyricRefs,
    // Helper
    shouldShowLyrics,
  };
}
