"use client";

import { Play, Pause } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface InlineAudioPlayerProps {
  audioUrl?: string | null;
  songTitle: string;
  songId: string | number;
  songSlug?: string; // Song slug for play count tracking
  skipPlayTracking?: boolean; // Skip play count tracking (e.g., for admin portal)
  className?: string;
}

let currentlyPlayingAudio: HTMLAudioElement | null = null;

export default function InlineAudioPlayer({
  audioUrl,
  songTitle,
  songId,
  songSlug,
  skipPlayTracking = false,
  className = "",
}: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = useMemo(() => {
    return (time: number) => {
      if (!Number.isFinite(time) || time <= 0) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };
  }, []);

  if (!audioUrl) {
    return null;
  }

  // Keep local audio element in sync with props
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If URL changes while playing, pause/reset to avoid stale audio playing.
    audio.pause();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);

    // best-effort load metadata for duration (won't auto-download full file)
    audio.load();
  }, [audioUrl, songId, songTitle]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onPause = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Always attempt play/pause directly from the click handler (user gesture),
    // which is what iOS/Safari requires. This avoids relying on AudioContext.
    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      // Prevent overlapping audio across many cards.
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        try {
          currentlyPlayingAudio.pause();
        } catch {
          // ignore
        }
      }
      currentlyPlayingAudio = audio;

      setIsLoading(true);
      audio.volume = 1;
      // play MUST be initiated from the user gesture on iOS
      await audio.play();

      // Optional tracking is handled elsewhere via songSlug; keep this component
      // minimal to avoid side effects in admin portals.
      void songSlug;
      void skipPlayTracking;
    } catch (e) {
      setIsLoading(false);
      setIsPlaying(false);
      // Keep noise low; callers already see UI not playing.
      console.warn("InlineAudioPlayer: failed to play audio", e);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  void progress; // slider uses currentTime/duration directly; keep for readability if needed later.

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" playsInline />
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        disabled={isLoading}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      {duration > 0 && (
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const newTime = Number(e.target.value);
              if (audioRef.current) {
                audioRef.current.currentTime = newTime;
              }
            }}
            className="w-full"
            aria-label="Seek position"
          />
        </div>
      )}
    </div>
  );
}
