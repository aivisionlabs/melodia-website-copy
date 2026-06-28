"use client";

import { Check, FileText, Languages, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import LyricsModal from "@/components/LyricsModal";
import { PlayingBackgroundVisualizer } from "@/components/player/PlayingBackgroundVisualizer";
import { trackCTAEvent } from "@/lib/analytics";
import {
  promotionTagLabel,
  type TemplatedPromotionTag,
} from "@/lib/templated-songs/promotion-tag";

export interface SongCatalogCardData {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  previewAudioUrl: string | null;
  tags: string[];
  languages: string[];
  promotionTag?: TemplatedPromotionTag | null;
  templateLyrics?: string | null;
}

interface SongCatalogCardProps {
  song: SongCatalogCardData;
  selected: boolean;
  isPlaying: boolean;
  onSelect: (songId: number) => void;
  onTogglePlay: (songId: number) => void;
  audioRef?: (element: HTMLAudioElement | null) => void;
}

const PROMOTION_TAG_BADGE_CLASS =
  "mb-1 inline-block rounded-sm bg-accent-coral px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm";

function PromotionTagBadge({ tag }: { tag: TemplatedPromotionTag }) {
  return (
    <span className={PROMOTION_TAG_BADGE_CLASS}>
      {promotionTagLabel(tag)}
    </span>
  );
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function SongCatalogCard({
  song,
  selected,
  isPlaying,
  onSelect,
  onTogglePlay,
  audioRef,
}: SongCatalogCardProps) {
  const audioLabelId = useId();
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const isDraggingSeekRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);

  // Detect whether the single-line clamped description is actually truncated,
  // so the "more" affordance only appears when there's hidden text to reveal.
  useEffect(() => {
    if (descriptionExpanded) return;
    const el = descriptionRef.current;
    if (!el) return;
    setDescriptionOverflows(el.scrollWidth > el.clientWidth + 1);
  }, [song.description, descriptionExpanded]);

  const hasLyrics =
    typeof song.templateLyrics === "string" &&
    song.templateLyrics.trim().length > 0;

  const setRefs = useCallback(
    (element: HTMLAudioElement | null) => {
      internalAudioRef.current = element;
      audioRef?.(element);
    },
    [audioRef],
  );

  useEffect(() => {
    const audio = internalAudioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    syncDuration();

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [song.previewAudioUrl]);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentTime(internalAudioRef.current?.currentTime ?? 0);
    }
  }, [isPlaying]);

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const seekToRatio = useCallback(
    (ratio: number) => {
      const audio = internalAudioRef.current;
      if (!audio || duration <= 0) return;
      const nextTime = Math.max(0, Math.min(duration, ratio * duration));
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration],
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = progressBarRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      seekToRatio(ratio);
    },
    [duration, seekToRatio],
  );

  const onSeekPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    seekFromClientX(event.clientX);
    isDraggingSeekRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onSeekPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSeekRef.current) return;
    event.stopPropagation();
    seekFromClientX(event.clientX);
  };

  const onSeekPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSeekRef.current) return;
    isDraggingSeekRef.current = false;
    event.stopPropagation();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* capture already released */
    }
  };

  const onSeekKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.stopPropagation();
    const audio = internalAudioRef.current;
    if (!audio) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      audio.currentTime = Math.min(duration, audio.currentTime + 5);
    }
  };

  const openLyricsModal = () => {
    trackCTAEvent.ctaClick("view_lyrics", "create_song_catalog", "button");
    setShowLyricsModal(true);
  };

  const canPreview = Boolean(song.previewAudioUrl);

  const handleCardPlayToggle = () => {
    if (!canPreview) return;
    onTogglePlay(song.id);
  };

  return (
    <>
      <div
        role={canPreview ? "button" : undefined}
        tabIndex={canPreview ? 0 : undefined}
        onClick={handleCardPlayToggle}
        onKeyDown={(event) => {
          if (!canPreview) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTogglePlay(song.id);
          }
        }}
        aria-label={
          canPreview
            ? isPlaying
              ? `Pause preview for ${song.title}`
              : `Play preview for ${song.title}`
            : undefined
        }
        className={`relative flex w-full flex-col gap-3 overflow-hidden rounded-lg border border-surface-container-high bg-surface-container-lowest px-3 py-5 text-left shadow-sm transition-transform active:scale-[0.98] ${
          canPreview ? "cursor-pointer" : ""
        } ${isPlaying ? "border-primary-yellow/30" : ""}`}
      >
        <PlayingBackgroundVisualizer active={isPlaying} />

        <div className="relative z-10 flex w-full items-center gap-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(song.id);
            }}
            aria-label={
              selected ? `${song.title} selected` : `Select ${song.title}`
            }
            aria-pressed={selected}
            className="flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow focus-visible:ring-offset-2"
          >
            {selected ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-yellow bg-primary-yellow">
                <Check className="h-4 w-4 text-text-teal" />
              </span>
            ) : (
              <span className="h-6 w-6 rounded-full border-2 border-surface-container-highest bg-transparent" />
            )}
          </button>

          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container-highest">
            {song.imageUrl ? (
              <img
                src={song.imageUrl}
                alt={song.title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-grow">
            {song.promotionTag ? (
              <PromotionTagBadge tag={song.promotionTag} />
            ) : null}
            <h3 className="text-sm font-black uppercase text-text-teal">
              {song.title}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <p
                ref={descriptionRef}
                className={`flex-1 text-[11px] text-on-surface-variant ${
                  descriptionExpanded ? "" : "truncate"
                }`}
              >
                {song.description}
              </p>
              {descriptionOverflows || descriptionExpanded ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDescriptionExpanded((prev) => !prev);
                  }}
                  className="shrink-0 text-[10px] font-semibold text-text-teal/50 underline underline-offset-2 transition-colors hover:text-text-teal"
                  aria-expanded={descriptionExpanded}
                >
                  {descriptionExpanded ? "less" : "more"}
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {song.languages.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-text-teal/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-teal">
                  <Languages className="h-2.5 w-2.5" aria-hidden />
                  {song.languages.join(", ")}
                </span>
              ) : null}
              {song.tags.slice(0, 4).map((tag) => (
                <span
                  key={`${song.id}-${tag}`}
                  className="rounded-lg bg-surface-container px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-on-surface-variant"
                >
                  {tag}
                </span>
              ))}
            </div>

            {isPlaying ? (
              <div
                className="mt-3 space-y-3"
                onClick={(event) => event.stopPropagation()}
              >
                {hasLyrics ? (
                  <button
                    type="button"
                    onClick={openLyricsModal}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-text-teal bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-teal transition-colors hover:bg-surface-container-low"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    View Lyrics
                  </button>
                ) : null}

                <div className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-[10px] font-medium tabular-nums text-on-surface-variant">
                    {formatPlaybackTime(currentTime)}
                  </span>
                  <div
                    ref={progressBarRef}
                    role="slider"
                    tabIndex={duration > 0 ? 0 : -1}
                    aria-label="Playback position"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(currentTime)}
                    aria-disabled={duration <= 0}
                    onPointerDown={onSeekPointerDown}
                    onPointerMove={onSeekPointerMove}
                    onPointerUp={onSeekPointerUp}
                    onPointerCancel={onSeekPointerUp}
                    onKeyDown={onSeekKeyDown}
                    className={`relative h-1.5 min-h-[6px] flex-1 touch-none rounded-full bg-surface-container-highest ${
                      duration > 0
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-accent-coral"
                      style={{ width: `${progress}%` }}
                    />
                    {duration > 0 ? (
                      <span
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent-coral shadow-sm"
                        style={{ left: `calc(${progress}% - 6px)` }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] font-medium tabular-nums text-on-surface-variant">
                    {duration > 0 ? formatPlaybackTime(duration) : "0:00"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <span className="shrink-0 self-start">
            <button
              type="button"
              aria-labelledby={audioLabelId}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePlay(song.id);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary-yellow text-text-teal shadow-sm`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <span id={audioLabelId} className="sr-only">
              {isPlaying ? "Pause preview" : "Play preview"} for {song.title}
            </span>
          </span>
        </div>

        {song.previewAudioUrl ? (
          <audio ref={setRefs} className="hidden" preload="metadata">
            <source src={song.previewAudioUrl} />
          </audio>
        ) : null}
      </div>

      <LyricsModal
        show={showLyricsModal}
        title={song.title}
        lyricsText={song.templateLyrics ?? null}
        isLoadingLyrics={false}
        onClose={() => setShowLyricsModal(false)}
      />
    </>
  );
}
