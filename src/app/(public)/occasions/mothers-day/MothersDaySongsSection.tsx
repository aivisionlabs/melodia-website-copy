"use client";

import { useCallback, useState } from "react";
import HorizontalScrollSection from "@/components/HorizontalScrollSection";
import { SongLibraryCard } from "@/components/SongLibraryCard";
import type { Song } from "@/types";

const SONGS_PER_PAGE = 12;

export default function MothersDaySongsSection({ songs }: { songs: Song[] }) {
  const [expandedTags, setExpandedTags] = useState<Set<number>>(new Set());

  const prefetchSongData = useCallback(async (slug: string) => {
    try {
      await fetch(`/api/song-lightweight/${slug}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // best-effort only
    }
  }, []);

  const preloadImage = useCallback((src: string) => {
    if (src && typeof window !== "undefined") {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  return (
    <HorizontalScrollSection
      title="Mom's Selection"
      subtitle="Curated songs for every shade of mom-love"
      className="bg-secondary-cream"
      gap={12}
    >
      {songs.length === 0 ? (
        <div
          className="flex-shrink-0 w-[min(90vw,360px)] bg-white rounded-2xl p-5 border border-text-teal/10 shadow-sm"
          style={{ scrollSnapAlign: "start" }}
        >
          <p className="text-sm text-text-teal/70 font-body">
            Songs will appear here once they are tagged with the mothers-day
            category.
          </p>
        </div>
      ) : (
        songs.map((song, index) => (
          <SongLibraryCard
            key={song.id}
            song={song}
            index={index}
            pageContext="occasions_mothers_day"
            songsPerPage={SONGS_PER_PAGE}
            expandedTags={expandedTags}
            setExpandedTags={setExpandedTags}
            prefetchSongData={prefetchSongData}
            preloadImage={preloadImage}
            variant="carousel"
            analyticsLocation="occasions_mothers_day_strip"
            shareMethod="occasions_mothers_day_strip_share"
          />
        ))
      )}
    </HorizontalScrollSection>
  );
}
