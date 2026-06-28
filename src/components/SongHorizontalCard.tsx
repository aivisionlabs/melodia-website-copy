"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { FileText, Play, Pause } from "lucide-react";
import type { Song } from "@/types";
import LyricsModal from "@/components/LyricsModal";
import { trackCTAEvent } from "@/lib/analytics";

interface SongHorizontalCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  index: number;
}

const CARD_GRADIENTS = [
  "from-accent-coral/90 via-accent-coral to-primary-yellow/60",
  "from-text-teal via-text-teal/90 to-accent-coral/30",
  "from-primary-yellow/90 via-primary-yellow to-accent-coral/40",
  "from-text-teal/80 via-text-teal/60 to-primary-yellow/50",
  "from-accent-coral/70 via-primary-yellow/50 to-accent-coral/40",
  "from-primary-yellow via-accent-coral/50 to-text-teal/60",
];

function getSongImageUrl(song: Song): string | null {
  const variants = song.suno_variants;
  if (!variants) return null;
  if (typeof variants === "object" && "sourceImageUrl" in variants) {
    return (variants as { sourceImageUrl?: string }).sourceImageUrl ?? null;
  }
  if (Array.isArray(variants)) {
    const idx = song.selected_variant ?? 0;
    return variants[idx]?.sourceImageUrl ?? variants[0]?.sourceImageUrl ?? null;
  }
  return null;
}

/** Tags or music_style — same styling for idle + playing bottom strip */
function SongCardMetaRow({ song, playing }: { song: Song; playing: boolean }) {
  if (song.tags && song.tags.length > 0) {
    return (
      <div
        className={`flex flex-wrap gap-1 ${playing ? "" : "mt-1"} max-w-full`}
      >
        {song.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/80 font-body leading-none"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }
  if (song.music_style) {
    return (
      <p
        className={
          playing
            ? "text-[11px] font-body opacity-70 truncate text-white"
            : "text-xs font-body mt-0.5 opacity-70 truncate text-white"
        }
      >
        {song.music_style}
      </p>
    );
  }
  return null;
}

export default function SongHorizontalCard({
  song,
  index,
  onPlay,
}: SongHorizontalCardProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const imageUrl = getSongImageUrl(song);

  const hasLyricsCta =
    (typeof song.lyrics === "string" && song.lyrics.trim().length > 0) ||
    Boolean(song.slug);

  // Stop this card when another card fires the global play event
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string | number }>).detail;
      if (id !== song.id && audioRef.current) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener("melodia:cardPlay", handleOtherPlay);
    return () => {
      window.removeEventListener("melodia:cardPlay", handleOtherPlay);
      audioRef.current?.pause();
    };
  }, [song.id]);

  const getAudio = useCallback(() => {
    if (!song.song_url) return null;
    if (!audioRef.current) {
      const audio = new Audio(song.song_url);
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      });
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [song.song_url]);

  const seekTo = useCallback((clientX: number) => {
    if (!seekBarRef.current || !audioRef.current?.duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setProgress(ratio);
  }, []);

  const handleSeekPointer = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      seekTo(e.clientX);
      const bar = e.currentTarget;
      bar.setPointerCapture(e.pointerId);
    },
    [seekTo],
  );

  const handleSeekMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      e.stopPropagation();
      seekTo(e.clientX);
    },
    [seekTo],
  );

  const handleToggle = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent("melodia:cardPlay", { detail: { id: song.id } }),
      );
      audio.play().catch(() => {});
      setPlaying(true);
      onPlay(song);
    }
  }, [playing, getAudio, song, onPlay]);

  useEffect(() => {
    if (!showLyricsModal) return;

    const inline =
      typeof song.lyrics === "string" && song.lyrics.trim().length > 0;
    if (inline) {
      setLyricsText(song.lyrics);
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
  }, [showLyricsModal, song.slug, song.lyrics]);

  const openLyricsModal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    trackCTAEvent.ctaClick("view_lyrics_homepage_card", "song_horizontal_card");
    setShowLyricsModal(true);
  }, []);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  return (
    <div
      className="flex-shrink-0 w-36 sm:w-40 md:w-44 rounded-2xl text-left"
      style={{ scrollSnapAlign: "start" }}
    >
      <div
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleCardKeyDown}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
        className={`relative w-full h-48 sm:h-52 md:h-56 rounded-2xl flex flex-col justify-end shadow-md hover:shadow-xl hover:scale-[1.04] transition-all duration-200 active:scale-[0.97] overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background ${!imageUrl ? `bg-gradient-to-b ${gradient}` : ""}`}
      >
        {/* Cover image */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={song.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 144px, (max-width: 768px) 160px, 176px"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Center play / pause — YouTube style */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className={`rounded-full flex items-center justify-center transition-all duration-200 ${
              playing
                ? "w-10 h-10 sm:w-11 sm:h-11 bg-white/95 scale-100 shadow-md"
                : "w-12 h-12 sm:w-14 sm:h-14 bg-black/45 backdrop-blur-sm scale-90 hover:scale-100 hover:bg-black/60"
            }`}
          >
            {playing ? (
              <Pause
                className="w-4 h-4 sm:w-5 sm:h-5 text-text-teal"
                fill="currentColor"
              />
            ) : (
              <Play
                className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 text-white"
                fill="currentColor"
              />
            )}
          </div>
        </div>

        {/* Bottom: title when idle → progress bar when playing */}
        <div className="relative z-10 p-3 sm:p-4">
          {playing ? (
            <div className="space-y-1.5">
              <p className="text-white/70 text-[11px] font-body truncate leading-none">
                {song.title}
              </p>
              <SongCardMetaRow song={song} playing />
              {/* Seekable progress bar */}
              <div
                ref={seekBarRef}
                className="relative w-full h-4 flex items-center cursor-pointer"
                onPointerDown={handleSeekPointer}
                onPointerMove={handleSeekMove}
                onClick={(e) => e.stopPropagation()}
                aria-label="Seek"
                role="slider"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {/* Track */}
                <div className="absolute inset-y-0 my-auto w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-yellow rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      transition: "width 0.15s linear",
                    }}
                  />
                </div>
                {/* Thumb */}
                <div
                  className="absolute w-3.5 h-3.5 rounded-full bg-accent-coral border-2 border-white/90 shadow-md ring-1 ring-black/15 -translate-x-1/2 pointer-events-none"
                  style={{
                    left: `${progress * 100}%`,
                    transition: "left 0.15s linear",
                  }}
                />
              </div>
              {hasLyricsCta && (
                <button
                  type="button"
                  onClick={openLyricsModal}
                  className="inline-flex items-center gap-1 self-start rounded-full px-2 py-1 mt-0.5 text-[10px] font-semibold font-body text-text-teal bg-primary-yellow/95 border border-white/30 shadow-sm hover:bg-primary-yellow hover:border-white/50 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                >
                  <FileText
                    className="w-3 h-3 shrink-0 text-text-teal/90"
                    aria-hidden
                  />
                  View lyrics
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs sm:text-sm font-bold font-heading leading-tight line-clamp-2 text-white">
                {song.title}
              </p>
              <SongCardMetaRow song={song} playing={false} />
            </>
          )}
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
