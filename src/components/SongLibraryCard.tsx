"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, Pause, Play } from "lucide-react";

import { SongArtwork } from "@/components/SongArtwork";
import { SongLikeButton } from "@/components/SongLikeButton";
import { ShareButton } from "@/components/ShareButton";
import LyricsModal from "@/components/LyricsModal";
import { cn, formatDuration } from "@/lib/utils";
import {
  trackCTAEvent,
  trackEngagementEvent,
  trackNavigationEvent,
  trackPlayerEvent,
} from "@/lib/analytics";
import type { Song } from "@/types";

function songHasLyricsCta(song: Song): boolean {
  return (
    (typeof song.lyrics === "string" && song.lyrics.trim().length > 0) ||
    Boolean(song.slug)
  );
}

function getVariantImageUrl(song: Song): string | null {
  const variants: unknown = song.suno_variants;

  if (variants && typeof variants === "object" && !Array.isArray(variants)) {
    if ("sourceImageUrl" in variants)
      return (variants as { sourceImageUrl?: string }).sourceImageUrl ?? null;
  }

  if (Array.isArray(variants) && variants.length > 0) {
    return variants[0]?.sourceImageUrl ?? null;
  }

  return null;
}

export type SongLibraryCardVariant = "grid" | "carousel";

export interface SongLibraryCardProps {
  song: Song;
  index: number;
  pageContext: string;
  songsPerPage: number;
  expandedTags: Set<number>;
  setExpandedTags: React.Dispatch<React.SetStateAction<Set<number>>>;
  prefetchSongData: (slug: string) => void;
  preloadImage: (src: string) => void;
  /** Grid page vs horizontal strip (fixed width + scroll snap) */
  variant?: SongLibraryCardVariant;
  /** Passed to CTA analytics as `cta_location` */
  analyticsLocation?: string;
  /** Third arg to `trackEngagementEvent.share` */
  shareMethod?: string;
}

export function SongLibraryCard({
  song,
  index,
  pageContext,
  songsPerPage,
  expandedTags,
  setExpandedTags,
  prefetchSongData,
  preloadImage,
  variant = "grid",
  analyticsLocation = "song_cards_grid",
  shareMethod = "library_card_native_share",
}: SongLibraryCardProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const hasLyrics = songHasLyricsCta(song);
  const audioActive = playing || progress > 0;
  const imageUrl = getVariantImageUrl(song);
  const canPlay = Boolean(song.song_url);

  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string | number }>).detail;
      if (id !== song.id && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlaying(false);
        setProgress(0);
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
      e.currentTarget.setPointerCapture(e.pointerId);
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
      trackPlayerEvent.play(song.title, song.id.toString(), false, {
        page_context: pageContext,
      });
    }
  }, [playing, getAudio, song, pageContext]);

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

  const openLyricsModal = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      trackCTAEvent.ctaClick("view_lyrics_library_card", analyticsLocation);
      setShowLyricsModal(true);
    },
    [analyticsLocation],
  );

  const handleOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (canPlay) handleToggle();
      }
    },
    [canPlay, handleToggle],
  );

  return (
    <div
      className={cn(
        "bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col",
        variant === "carousel" &&
          "flex-shrink-0 w-40 sm:w-44 md:w-48",
        variant === "grid" && "w-full",
      )}
      style={{
        animationDelay: `${(index % songsPerPage) * 50}ms`,
        animationFillMode: "forwards",
        ...(variant === "carousel" ? { scrollSnapAlign: "start" as const } : {}),
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Link
          href={`/song/${song.slug}`}
          className="block w-full h-full"
          prefetch={true}
          onMouseEnter={() => {
            prefetchSongData(song.slug);
            if (imageUrl) preloadImage(imageUrl);
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={song.title}
              width={256}
              height={256}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              priority={variant === "carousel" ? index < 4 : index < 8}
              loading={variant === "carousel" ? (index < 4 ? "eager" : "lazy") : index < 8 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes={
                variant === "carousel"
                  ? "(max-width: 640px) 160px, (max-width: 768px) 176px, 192px"
                  : "(max-width: 640px) 45vw, (max-width: 1280px) 22vw, 256px"
              }
            />
          ) : (
            <SongArtwork />
          )}
        </Link>

        <div
          tabIndex={canPlay ? 0 : -1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canPlay) handleToggle();
          }}
          onKeyDown={handleOverlayKeyDown}
          aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow focus-visible:ring-inset",
            canPlay ? "cursor-pointer" : "cursor-not-allowed opacity-60",
          )}
        >
          <div
            className={cn(
              "rounded-full flex items-center justify-center transition-all duration-200",
              playing
                ? "w-10 h-10 sm:w-11 sm:h-11 bg-white/95 shadow-md"
                : "w-11 h-11 sm:w-12 sm:h-12 bg-black/45 backdrop-blur-sm hover:scale-110 hover:bg-black/60 active:scale-90",
            )}
          >
            {playing ? (
              <Pause
                className="w-4 h-4 sm:w-5 sm:h-5 text-text-teal"
                fill="currentColor"
              />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white ml-0.5" />
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3 sm:px-3.5 sm:pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/song/${song.slug}`}
            className="min-w-0 flex-1"
            prefetch={true}
            onClick={() =>
              trackNavigationEvent.click(
                song.title,
                `/song/${song.slug}`,
                "song_card",
              )
            }
          >
            <h3 className="text-text-teal text-xs sm:text-sm font-bold font-heading line-clamp-2 leading-snug">
              {song.title}
            </h3>
            <p className="text-text-teal/35 text-[11px] font-body mt-0.5">
              {formatDuration(song.duration)}
            </p>
          </Link>
          <div className="flex-shrink-0 mt-0.5">
            <SongLikeButton
              slug={song.slug}
              initialCount={song.likes_count || 0}
              size="sm"
              songTitle={song.title}
              songId={song.id.toString()}
              pageContext={pageContext}
            />
          </div>
        </div>
        {song.tags && song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(expandedTags.has(song.id) ? song.tags : song.tags.slice(0, 3)).map(
              (tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-text-teal/8 text-text-teal/60 font-body leading-none border border-text-teal/10"
                >
                  {tag}
                </span>
              ),
            )}
            {song.tags.length > 3 && !expandedTags.has(song.id) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpandedTags((prev) => new Set(prev).add(song.id));
                }}
                className="text-[10px] px-1.5 py-0.5 rounded-full text-accent-coral/70 font-body leading-none hover:text-accent-coral transition-colors"
              >
                +{song.tags.length - 3} more
              </button>
            )}
          </div>
        )}

        {canPlay && audioActive && (
          <div className="mt-2 space-y-2">
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
              <div className="absolute inset-y-0 my-auto w-full h-1.5 bg-text-teal/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-yellow rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    transition: "width 0.15s linear",
                  }}
                />
              </div>
              <div
                className="absolute w-3 h-3 rounded-full bg-accent-coral border-2 border-white/90 shadow-sm -translate-x-1/2 pointer-events-none"
                style={{
                  left: `${progress * 100}%`,
                  transition: "left 0.15s linear",
                }}
              />
            </div>
            <div
              className="flex flex-wrap items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {hasLyrics && (
                <button
                  type="button"
                  onClick={openLyricsModal}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold font-body text-text-teal bg-primary-yellow/95 border border-text-teal/15 shadow-sm hover:bg-primary-yellow hover:border-text-teal/30 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <FileText
                    className="w-3 h-3 shrink-0 text-text-teal/90"
                    aria-hidden
                  />
                  View lyrics
                </button>
              )}
              {song.slug && (
                <ShareButton
                  slug={song.slug}
                  title={song.title}
                  variant="ghost"
                  className="h-auto min-h-0 py-1 px-2.5 rounded-full text-[10px] font-semibold font-body border border-text-teal/20 text-text-teal bg-white shadow-sm hover:bg-text-teal/5 [&_svg]:!h-3 [&_svg]:!w-3 [&_svg]:!mr-1"
                  onShare={() =>
                    trackEngagementEvent.share(song.title, song.slug, shareMethod)
                  }
                  onCopyLink={() =>
                    trackEngagementEvent.copyLink(song.title, song.slug)
                  }
                />
              )}
            </div>
          </div>
        )}
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
