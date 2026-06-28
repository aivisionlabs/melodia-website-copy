"use client";

import { useCallback, useState } from "react";
import { SongLibraryCard } from "@/components/SongLibraryCard";
import type { Song } from "@/types";

export function SongCardsGrid({
  songs,
  pageContext,
  songsPerPage = 20,
  enableHoverPrefetch = true,
}: {
  songs: Song[];
  pageContext: string;
  songsPerPage?: number;
  enableHoverPrefetch?: boolean;
}) {
  const [expandedTags, setExpandedTags] = useState<Set<number>>(new Set());

  const prefetchSongData = useCallback(
    async (slug: string) => {
      if (!enableHoverPrefetch) return;
      try {
        await fetch(`/api/song-lightweight/${slug}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // best-effort only
      }
    },
    [enableHoverPrefetch],
  );

  const preloadImage = useCallback((src: string) => {
    if (src && typeof window !== "undefined") {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  if (!songs || songs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-w-screen-2xl mx-auto items-start">
      {songs.map((song, index) => (
        <SongLibraryCard
          key={song.id}
          song={song}
          index={index}
          pageContext={pageContext}
          songsPerPage={songsPerPage}
          expandedTags={expandedTags}
          setExpandedTags={setExpandedTags}
          prefetchSongData={prefetchSongData}
          preloadImage={preloadImage}
          variant="grid"
        />
      ))}
    </div>
  );
}
