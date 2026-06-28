"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, X, Loader2, Music2 } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import LyricsModal from "@/components/LyricsModal";
import { trackCTAEvent } from "@/lib/analytics";

interface SongPreview {
  id: number;
  title: string;
  imageUrl?: string | null;
  slug?: string;
  song_url?: string | null;
  service_provider?: string | null;
  lyrics?: string | null;
}

interface InlineSongPlayerProps {
  song: SongPreview;
  onClose?: () => void;
  mode?: "card" | "embedded";
}

export function InlineSongPlayer({
  song,
  onClose,
  mode = "card",
}: InlineSongPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    audioError,
    isPlayLoading,
    togglePlay,
    seekTo,
    skipTime,
    formatTime,
    audioRef,
  } = useAudioPlayer({
    audioUrl: song.song_url || undefined,
    songTitle: song.title,
    songId: String(song.id),
    songSlug: song.slug,
    skipPlayTracking: true,
  });

  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [showLyricsModal, setShowLyricsModal] = useState(false);

  useEffect(() => {
    const inline =
      typeof song.lyrics === "string" && song.lyrics.trim().length > 0;
    if (inline) {
      setLyricsText(song.lyrics ?? null);
      setIsLoadingLyrics(false);
      return;
    }
    if (!song.slug) {
      setLyricsText(null);
      setIsLoadingLyrics(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLyrics(true);
    setLyricsText(null);

    (async () => {
      try {
        const response = await fetch(`/api/song-lyrics/${song.slug}`);
        const data = await response.json();
        if (cancelled) return;
        if (data.success && data.song?.lyrics) {
          setLyricsText(data.song.lyrics);
        } else {
          setLyricsText(null);
        }
      } catch {
        if (!cancelled) setLyricsText(null);
      } finally {
        if (!cancelled) setIsLoadingLyrics(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [song.slug, song.lyrics]);

  const hasLyricsCta =
    (typeof song.lyrics === "string" && song.lyrics.trim().length > 0) ||
    Boolean(song.slug);

  const openLyricsModal = useCallback(() => {
    trackCTAEvent.ctaClick("view_lyrics_inline_player", "inline_song_player");
    setShowLyricsModal(true);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingSeekRef = useRef(false);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = progressBarRef.current;
      if (!el || duration <= 0 || audioError) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      seekTo(ratio * duration);
    },
    [duration, audioError, seekTo],
  );

  const onSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (audioError || duration <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    seekFromClientX(e.clientX);
    isDraggingSeekRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSeekRef.current) return;
    seekFromClientX(e.clientX);
  };

  const onSeekPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSeekRef.current) return;
    isDraggingSeekRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
  };

  const onSeekKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (audioError || duration <= 0) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      skipTime(-5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      skipTime(5);
    }
  };

  const isEmbedded = mode === "embedded";

  return (
    <div
      className={
        isEmbedded
          ? "mt-2 pt-2 border-t border-text-teal/10 animate-in slide-in-from-top-2 duration-200"
          : "mt-3 rounded-2xl border-2 border-accent-coral/30 bg-white shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200"
      }
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hidden audio element — required by useAudioPlayer */}
      <audio
        ref={audioRef}
        src={song.song_url || undefined}
        preload="metadata"
      />

      {!isEmbedded ? (
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          {/* Thumbnail */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
            {song.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-yellow/20 to-accent-coral/20 flex items-center justify-center">
                <Music2 className="w-5 h-5 text-text-teal/30" />
              </div>
            )}
          </div>

          {/* Title + artist */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-teal leading-tight truncate">
              {song.title}
            </p>
            <p className="text-[11px] text-text-teal/45 leading-none mt-0.5 truncate">
              {song.service_provider || "Melodia"}
            </p>
          </div>

          {/* Close */}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-text-teal/40 hover:text-text-teal transition-colors flex-shrink-0"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Lyrics CTA — open full lyrics in modal (no inline singalong) */}
      <div className={isEmbedded ? "px-0 pb-2" : "px-3 pb-2"}>
        {hasLyricsCta ? (
          <button
            type="button"
            onClick={openLyricsModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-coral hover:underline"
          >
            {isLoadingLyrics && !lyricsText ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
            ) : null}
            View lyrics
          </button>
        ) : (
          <p className="text-[11px] text-text-teal/40 text-center px-2 py-1">
            No lyrics available for this preview.
          </p>
        )}
      </div>

      {/* Progress + controls row */}
      <div className={isEmbedded ? "flex items-center gap-2 px-0 pb-1" : "flex items-center gap-2 px-3 pb-3"}>
        {/* Play/pause */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          disabled={!!audioError}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-coral hover:bg-accent-coral/90 disabled:bg-gray-200 transition-colors flex-shrink-0 shadow-sm"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlayLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 text-white ml-0.5" />
          )}
        </button>

        {/* Progress bar (click or drag to seek) */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div
            ref={progressBarRef}
            role="slider"
            tabIndex={audioError || duration <= 0 ? -1 : 0}
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-disabled={!!audioError || duration <= 0}
            onPointerDown={onSeekPointerDown}
            onPointerMove={onSeekPointerMove}
            onPointerUp={onSeekPointerUp}
            onPointerCancel={onSeekPointerUp}
            onKeyDown={onSeekKeyDown}
            className={`flex-1 h-2 min-h-[8px] rounded-full bg-gray-200 overflow-hidden touch-none ${
              audioError || duration <= 0
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
          >
            <div
              className="h-full bg-accent-coral rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-text-teal/40 font-mono tabular-nums flex-shrink-0 whitespace-nowrap text-right">
            {formatTime(currentTime)}
            {duration > 0 ? ` / ${formatTime(duration)}` : ""}
          </span>
        </div>
      </div>

      <LyricsModal
        show={showLyricsModal}
        title={song.title}
        lyricsText={lyricsText}
        isLoadingLyrics={isLoadingLyrics}
        onClose={() => setShowLyricsModal(false)}
      />
    </div>
  );
}
