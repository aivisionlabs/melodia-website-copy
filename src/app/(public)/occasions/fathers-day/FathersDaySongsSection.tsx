"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import HorizontalScrollSection from "@/components/HorizontalScrollSection";
import { SongArtwork } from "@/components/SongArtwork";
import { cn, formatDuration } from "@/lib/utils";
import { trackPlayerEvent } from "@/lib/analytics";
import type { TemplatedSongCard } from "@/lib/actions/category.actions";

const CREATE_HREF = "/create-song/fathers-day";

type CardData = {
  id: number;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
  tags: string[];
};

function normalizeVariants(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) {
    return input.filter(
      (variant): variant is Record<string, unknown> =>
        !!variant && typeof variant === "object",
    );
  }
  if (input && typeof input === "object") {
    return Object.values(input).filter(
      (variant): variant is Record<string, unknown> =>
        !!variant && typeof variant === "object",
    );
  }
  return [];
}

function extractTags(selected: Record<string, unknown>): string[] {
  const raw: unknown =
    (selected.tags as unknown) ??
    (selected.tagList as unknown) ??
    (selected.moods as unknown) ??
    (selected.genres as unknown) ??
    [];

  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",").map((value) => value.trim())
      : [];

  const tags = list
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean)
    .slice(0, 3);

  return tags.length > 0 ? tags : ["Personalized"];
}

function toCardData(song: TemplatedSongCard): CardData {
  const variants = normalizeVariants(song.song_variants);
  const index =
    typeof song.selected_variant === "number" ? song.selected_variant : 0;
  const selected = variants[index] ?? variants[0] ?? {};

  const imageUrl =
    (selected.sourceImageUrl as string | undefined) ??
    (selected.imageUrl as string | undefined) ??
    null;
  const audioUrl =
    (selected.sourceAudioUrl as string | undefined) ??
    (selected.streamAudioUrl as string | undefined) ??
    (selected.audioUrl as string | undefined) ??
    null;
  const duration =
    typeof selected.duration === "number" ? selected.duration : null;

  return {
    id: song.id,
    title: song.template_title || song.title,
    imageUrl,
    audioUrl,
    duration,
    tags: extractTags(selected),
  };
}

function TemplatedSongStripCard({ song }: { song: CardData }) {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const canPlay = Boolean(song.audioUrl);
  const audioActive = playing || progress > 0;

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
    if (!song.audioUrl) return null;
    if (!audioRef.current) {
      const audio = new Audio(song.audioUrl);
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
  }, [song.audioUrl]);

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
        page_context: "occasions_fathers_day",
      });
    }
  }, [playing, getAudio, song.id, song.title]);

  const goToCreate = useCallback(() => {
    router.push(CREATE_HREF);
  }, [router]);

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
      className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col flex-shrink-0 w-40 sm:w-44 md:w-48"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <button
          type="button"
          onClick={goToCreate}
          aria-label={`Create a Father's Day song like ${song.title}`}
          className="block w-full h-full"
        >
          {song.imageUrl ? (
            <Image
              src={song.imageUrl}
              alt={song.title}
              width={256}
              height={256}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 160px, (max-width: 768px) 176px, 192px"
            />
          ) : (
            <SongArtwork />
          )}
        </button>

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
        <button
          type="button"
          onClick={goToCreate}
          className="block w-full text-left"
        >
          <h3 className="text-text-teal text-xs sm:text-sm font-bold font-heading line-clamp-2 leading-snug">
            {song.title}
          </h3>
          {song.duration ? (
            <p className="text-text-teal/35 text-[11px] font-body mt-0.5">
              {formatDuration(song.duration)}
            </p>
          ) : null}
        </button>

        {song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {song.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-text-teal/8 text-text-teal/60 font-body leading-none border border-text-teal/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {canPlay && audioActive && (
          <div className="mt-2">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function FathersDaySongsSection({
  songs,
}: {
  songs: TemplatedSongCard[];
}) {
  const cards = songs.map(toCardData);

  return (
    <HorizontalScrollSection
      title="Dad's Selection"
      subtitle="Curated songs for every shade of dad-love"
      className="bg-secondary-cream"
      gap={12}
    >
      {cards.length === 0 ? (
        <div
          className="flex-shrink-0 w-[min(90vw,360px)] bg-white rounded-2xl p-5 border border-text-teal/10 shadow-sm"
          style={{ scrollSnapAlign: "start" }}
        >
          <p className="text-sm text-text-teal/70 font-body">
            Songs will appear here once they are tagged with the fathers-day
            category.
          </p>
        </div>
      ) : (
        cards.map((song) => (
          <TemplatedSongStripCard key={song.id} song={song} />
        ))
      )}
    </HorizontalScrollSection>
  );
}
