"use client";

import { useState, useCallback, useRef } from "react";
import type { Song } from "@/types";
import HorizontalScrollSection from "./HorizontalScrollSection";
import SongHorizontalCard from "./SongHorizontalCard";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";

interface SongCategoryRowProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  songs: Song[];
  onSongPlay: (song: Song) => void;
  className?: string;
  /**
   * If provided, loads more songs when the horizontal list is scrolled near the end.
   * Pass the exact category slug used to fetch the initial songs.
   */
  categorySlug?: string;
}

const LOAD_BATCH = 10;

export default function SongCategoryRow({
  title,
  subtitle,
  seeAllHref,
  songs: initialSongs,
  onSongPlay,
  className,
  categorySlug,
}: SongCategoryRowProps) {
  const [allSongs, setAllSongs] = useState<Song[]>(initialSongs);
  const [offset, setOffset] = useState(initialSongs.length);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!categorySlug);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!categorySlug || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getSongsByCategoryAction(categorySlug, LOAD_BATCH, offset);
      if (result.success && result.songs.length > 0) {
        setAllSongs((prev) => [...prev, ...result.songs]);
        setOffset((prev) => prev + result.songs.length);
        if (result.songs.length < LOAD_BATCH) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [categorySlug, offset, hasMore]);

  if (!allSongs || allSongs.length === 0) return null;

  return (
    <HorizontalScrollSection
      title={title}
      subtitle={subtitle}
      seeAllHref={seeAllHref}
      seeAllLabel="See all"
      gap={12}
      className={className}
      onNearEnd={categorySlug && hasMore ? loadMore : undefined}
    >
      {allSongs.map((song, index) => (
        <SongHorizontalCard
          key={song.id}
          song={song}
          index={index}
          onPlay={onSongPlay}
        />
      ))}

      {/* Pulsing skeleton cards while loading more */}
      {isLoading && Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="flex-shrink-0 w-36 h-48 sm:w-40 sm:h-52 md:w-44 md:h-56 rounded-2xl bg-text-teal/8 animate-pulse"
          style={{ scrollSnapAlign: "start" }}
          aria-hidden="true"
        />
      ))}
    </HorizontalScrollSection>
  );
}
