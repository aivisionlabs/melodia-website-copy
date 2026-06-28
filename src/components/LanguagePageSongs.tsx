"use client";

import { useMemo, useState } from "react";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongCardsGrid } from "@/components/SongCardsGrid";
import { getSongsByLanguageAction } from "@/lib/actions/language.actions";
import type { Song } from "@/types";

interface LanguagePageSongsProps {
  languageName: string;
  languageSlug: string;
  nativeName: string;
  initialSongs: Song[];
  totalSongs: number;
}

export function LanguagePageSongs({
  languageName,
  languageSlug,
  nativeName,
  initialSongs,
  totalSongs,
}: LanguagePageSongsProps) {
  const SONGS_PER_PAGE = 12;

  const [songs, setSongs] = useState<Song[]>(initialSongs || []);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = useMemo(() => {
    if (!totalSongs) return false;
    return songs.length < totalSongs;
  }, [songs.length, totalSongs]);

  const loadMoreSongs = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * SONGS_PER_PAGE;

      const res = await getSongsByLanguageAction(languageName, SONGS_PER_PAGE, offset);

      if (res.success) {
        setSongs((prev) => [...prev, ...(res.songs || [])]);
        setCurrentPage(nextPage);
      }
    } catch (e) {
      console.error("Failed to load more songs:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (songs.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 px-4 bg-white/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-2">
            Popular {languageName} Songs
          </h2>
          <p
            lang={languageSlug}
            className="text-xl sm:text-2xl text-text-teal/80 font-heading mb-3"
          >
            {nativeName}
          </p>
          <p className="text-text-teal/70 text-base sm:text-lg max-w-2xl mx-auto">
            Listen to personalized {languageName} song examples — weddings, birthdays,
            anniversaries &amp; more on Melodia.
          </p>
        </div>

        <SongCardsGrid
          songs={songs}
          pageContext={`language_${languageSlug}`}
          songsPerPage={SONGS_PER_PAGE}
        />

        {hasMore && (
          <div className="flex flex-col items-center mt-12">
            <Button
              onClick={loadMoreSongs}
              disabled={loadingMore}
              className="bg-gradient-to-r from-primary-yellow to-accent-coral text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Loading more songs...
                </>
              ) : (
                <>
                  <Music className="h-5 w-5 mr-2" />
                  Load More Songs ({songs.length} of {totalSongs})
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
