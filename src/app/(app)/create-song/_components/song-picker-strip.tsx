"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, Pause, Play } from "lucide-react";
import { promotionTagLabel } from "@/lib/templated-songs/promotion-tag";
import { trackFunnelEvent, trackPlayerEvent } from "@/lib/analytics";
import type { SongCatalogCardData } from "./song-catalog-card";

type TemplatedSongApiItem = {
  id: number;
  title: string;
  template_title: string | null;
  template_lyrics?: string | null;
  description: string | null;
  language?: string | null;
  tags?: string[] | null;
  selected_variant: number | null;
  song_variants: unknown;
  categories?: Array<{ slug: string; name: string }>;
  promotion_tag?: "trending" | "most_preferred" | "new" | null;
};

function normalizeVariants(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) {
    return input.filter(
      (v): v is Record<string, unknown> => !!v && typeof v === "object",
    );
  }
  if (input && typeof input === "object") {
    return Object.values(input).filter(
      (v): v is Record<string, unknown> => !!v && typeof v === "object",
    );
  }
  return [];
}

function toCardSong(song: TemplatedSongApiItem): SongCatalogCardData {
  const variants = normalizeVariants(song.song_variants);
  const selectedIndex =
    typeof song.selected_variant === "number" ? song.selected_variant : 0;
  const selected = variants[selectedIndex] ?? variants[0] ?? {};

  const imageUrl =
    (selected.sourceImageUrl as string | undefined) ??
    (selected.imageUrl as string | undefined) ??
    null;
  const previewAudioUrl =
    (selected.sourceAudioUrl as string | undefined) ??
    (selected.streamAudioUrl as string | undefined) ??
    (selected.audioUrl as string | undefined) ??
    null;

  const tags = (Array.isArray(song.tags) ? song.tags : [])
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: song.id,
    title: song.template_title || song.title,
    description: song.description || "",
    imageUrl,
    previewAudioUrl,
    tags:
      tags.length > 0
        ? tags
        : song.categories?.[0]?.name
          ? [song.categories[0].name]
          : ["Personalized"],
    languages:
      typeof song.language === "string"
        ? song.language
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [],
    promotionTag: song.promotion_tag ?? null,
    templateLyrics:
      typeof song.template_lyrics === "string" ? song.template_lyrics : null,
  };
}

interface SongPickerStripProps {
  occasionSlug: string | null;
  selectedTemplateId: number | null;
  onSelect: (id: number | null) => void;
}

export function SongPickerStrip({
  occasionSlug,
  selectedTemplateId,
  onSelect,
}: SongPickerStripProps) {
  const [songs, setSongs] = useState<SongCatalogCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const initialSelectedRef = useRef(selectedTemplateId);

  useEffect(() => {
    if (!occasionSlug) return;
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/templated-songs?categorySlug=${encodeURIComponent(occasionSlug)}&includeLyrics=false`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success || !Array.isArray(json.templatedSongs)) {
          setSongs([]);
          return;
        }
        const mapped = (json.templatedSongs as TemplatedSongApiItem[])
          .map((s) => {
            try {
              return toCardSong(s);
            } catch {
              return null;
            }
          })
          .filter((s): s is SongCatalogCardData => s !== null);
        setSongs(mapped);
      })
      .catch(() => {
        if (!cancelled) setSongs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [occasionSlug]);

  // Pre-selected song from step 1 floats to front
  const sortedSongs = useMemo(() => {
    const initId = initialSelectedRef.current;
    if (!initId) return songs;
    const idx = songs.findIndex((s) => s.id === initId);
    if (idx <= 0) return songs;
    return [songs[idx]!, ...songs.slice(0, idx), ...songs.slice(idx + 1)];
  }, [songs]);

  const handleSelect = (id: number) => {
    // Clicking the already-selected song deselects it.
    const willSelect = id !== selectedTemplateId;
    const song = songs.find((s) => s.id === id);
    trackFunnelEvent.referenceSongToggle(
      id,
      song?.title ?? String(id),
      willSelect,
    );
    onSelect(willSelect ? id : null);
  };

  const handlePlayToggle = (id: number) => {
    const nextAudio = audioRefs.current[id];
    if (!nextAudio) return;

    Object.entries(audioRefs.current).forEach(([key, el]) => {
      if (el && Number(key) !== id) {
        el.pause();
        el.currentTime = 0;
      }
    });

    const song = songs.find((s) => s.id === id);
    const songTitle = song?.title ?? String(id);

    if (playingId === id) {
      nextAudio.pause();
      setPlayingId(null);
      trackPlayerEvent.pause(songTitle, String(id), nextAudio.currentTime, {
        context: "create_song_reference_strip",
      });
      return;
    }

    nextAudio
      .play()
      .then(() => {
        setPlayingId(id);
        trackPlayerEvent.play(songTitle, String(id), false, {
          context: "create_song_reference_strip",
          occasion: occasionSlug ?? undefined,
        });
      })
      .catch(() => setPlayingId(null));
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-52 w-44 shrink-0 animate-pulse rounded-2xl bg-text-teal/10"
          />
        ))}
      </div>
    );
  }

  if (sortedSongs.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-text-teal/50">
        Choose music &amp; singer style (optional)
      </p>
      <p className="mb-3 text-sm text-text-teal/60">
        Pick a reference song, we&apos;ll match its music style and singer for
        your song.
      </p>
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sortedSongs.map((song) => {
          const selected = song.id === selectedTemplateId;
          const isPlaying = playingId === song.id;

          return (
            <div
              key={song.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={
                selected ? `${song.title} selected` : `Select ${song.title}`
              }
              onClick={() => handleSelect(song.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(song.id);
                }
              }}
              className="relative h-52 w-44 shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-all active:scale-[0.97]"
            >
              <div className="absolute inset-0 bg-[#073B4C]" />

              {song.imageUrl && (
                <img
                  src={song.imageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/85" />

              {selected && (
                <div className="absolute right-2 top-2 z-10">
                  <CheckCircle2 className="h-6 w-6 fill-accent-coral text-white drop-shadow-md" />
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-between p-3">
                <div>
                  {song.promotionTag ? (
                    <span className="inline-block rounded bg-accent-coral px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {promotionTagLabel(song.promotionTag)}
                    </span>
                  ) : null}
                </div>

                {!song.imageUrl && (
                  <div className="flex flex-1 items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-white/20" />
                  </div>
                )}

                <div className="flex items-end justify-between gap-1">
                  <h3 className="line-clamp-3 flex-1 text-sm font-black uppercase leading-tight text-white">
                    {song.title}
                  </h3>
                  <button
                    type="button"
                    aria-label={
                      isPlaying
                        ? `Pause ${song.title}`
                        : `Play preview of ${song.title}`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayToggle(song.id);
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-yellow text-text-teal shadow-md transition-transform active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 translate-x-0.5" />
                    )}
                  </button>
                </div>
              </div>

              {song.previewAudioUrl && (
                <audio
                  ref={(el) => {
                    audioRefs.current[song.id] = el;
                  }}
                  className="hidden"
                  preload="metadata"
                >
                  <source src={song.previewAudioUrl} />
                </audio>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
