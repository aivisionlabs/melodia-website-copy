"use client";

import { useCallback, useState } from "react";
import HorizontalScrollSection from "@/components/HorizontalScrollSection";
import { SongLibraryCard } from "@/components/SongLibraryCard";
import type { Song } from "@/types";

const SONGS_PER_PAGE = 12;

export default function KidsBirthdaySongsSection({ songs }: { songs: Song[] }) {
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
      title="Party Picks"
      subtitle="Curated birthday songs for every little star"
      className="bg-secondary-cream"
      gap={12}
    >
      {songs.length === 0 ? (
        <div
          className="flex-shrink-0 w-[min(90vw,360px)] bg-white rounded-2xl p-5 border border-text-teal/10 shadow-sm"
          style={{ scrollSnapAlign: "start" }}
        >
          <p className="text-sm text-text-teal/70 font-body">
            Songs will appear here once they are tagged with the birthday
            category.
          </p>
        </div>
      ) : (
        songs.map((song, index) => (
          <SongLibraryCard
            key={song.id}
            song={song}
            index={index}
            pageContext="occasions_kids_birthday"
            songsPerPage={SONGS_PER_PAGE}
            expandedTags={expandedTags}
            setExpandedTags={setExpandedTags}
            prefetchSongData={prefetchSongData}
            preloadImage={preloadImage}
            variant="carousel"
            analyticsLocation="occasions_kids_birthday_strip"
            shareMethod="occasions_kids_birthday_strip_share"
          />
        ))
      )}
    </HorizontalScrollSection>
  );
}
