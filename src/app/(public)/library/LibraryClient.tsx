"use client";

import Footer from "@/components/Footer";
import { LibrarySearchBar } from "@/components/LibrarySearchBar";
import {
  getActiveSongsAction,
  getPersonaSongsByCategoryAction,
} from "@/lib/actions/song.actions";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { fuzzySearchSongsAction } from "@/lib/actions/search.actions";
import { trackSearchEvent, trackEngagementEvent, trackPlayerEvent } from "@/lib/analytics";
import { Song } from "@/types";
import { useEffect, useState, useRef } from "react";
import { SongCardsGrid } from "@/components/SongCardsGrid";
import { SimilarStyleSongsRow } from "@/components/SimilarStyleSongsRow";
import { MediaPlayer } from "@/components/MediaPlayer";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/Header";

type CategoryPill = {
  name: string;
  slug: string;
  count: number;
  sequence: number;
};

export default function LibraryClient({
  initialSongs,
  initialPersonaSongs = [],
  initialCategories,
  initialTotalSongs,
  initialHasMore,
  initialSearchQuery = "",
}: {
  initialSongs: Song[];
  initialPersonaSongs?: Song[];
  initialCategories: CategoryPill[];
  initialTotalSongs: number;
  initialHasMore: boolean;
  initialSearchQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] =
    useState<CategoryPill[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [personaSongs, setPersonaSongs] = useState<Song[]>(initialPersonaSongs);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSongPlay = (song: Song) => {
    trackPlayerEvent.play(song.title, song.slug, false, { source: "library" });
    setSelectedSong(song);
  };

  const searchRequestIdRef = useRef<number>(0);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalSongs, setTotalSongs] = useState(initialTotalSongs);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const SONGS_PER_PAGE = 20;

  const initialSearchRunRef = useRef(false);
  useEffect(() => {
    if (!initialSearchQuery?.trim() || initialSearchRunRef.current) return;
    initialSearchRunRef.current = true;
    handleSearch(initialSearchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (songs.length > 0 || loading) return;
    async function loadInitialFallback() {
      try {
        setLoading(true);
        let songsRes;
        if (selectedCategory === "all") {
          songsRes = await getActiveSongsAction(SONGS_PER_PAGE, 0);
        } else {
          songsRes = await getSongsByCategoryAction(
            selectedCategory,
            SONGS_PER_PAGE,
            0,
          );
        }
        if (songsRes.success) {
          setSongs(songsRes.songs || []);
          setTotalSongs(songsRes.total);
          setHasMore(songsRes.hasMore);
          setCurrentPage(0);
        }
      } finally {
        setLoading(false);
      }
    }
    loadInitialFallback();
  }, [songs.length, loading, selectedCategory]);

  const handleSearch = async (query: string) => {
    const currentRequestId = ++searchRequestIdRef.current;
    const trimmed = query.trim();

    try {
      setSearchQuery(query);
      setIsSearching(true);
      setCurrentPage(0);

      const newUrl = trimmed
        ? `${pathname}?q=${encodeURIComponent(trimmed)}`
        : pathname;
      router.replace(newUrl);

      if (!trimmed) {
        setLoading(true);
        try {
          let songsRes;
          if (selectedCategory === "all") {
            songsRes = await getActiveSongsAction(SONGS_PER_PAGE, 0);
          } else {
            songsRes = await getSongsByCategoryAction(
              selectedCategory,
              SONGS_PER_PAGE,
              0,
            );
          }
          if (songsRes.success) {
            setSongs(songsRes.songs || []);
            setTotalSongs(songsRes.total);
            setHasMore(songsRes.hasMore);
            setCurrentPage(0);
          }
        } catch (e) {
          console.error("Failed to reset songs:", e);
        } finally {
          setLoading(false);
        }
        return;
      }

      const res = await fuzzySearchSongsAction(trimmed, 50);

      if (currentRequestId !== searchRequestIdRef.current) return;

      if (res.success) {
        setSongs(res.songs || []);
        setTotalSongs(res.total);
        setHasMore(false);
        setCurrentPage(0);
        trackSearchEvent.search(trimmed, res.songs.length, "text", "fuzzy");
      } else {
        setSongs([]);
        setTotalSongs(0);
        setHasMore(false);
        trackSearchEvent.searchNoResults(trimmed, "text");
      }
    } catch (e) {
      if (currentRequestId !== searchRequestIdRef.current) return;
      console.error("Failed to search songs:", e);
      setSongs([]);
      setTotalSongs(0);
      setHasMore(false);
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  const handleCategoryFilter = async (categorySlug: string) => {
    if (categorySlug === selectedCategory) return;

    trackEngagementEvent.categoryFilter(categorySlug);

    try {
      setLoading(true);
      setSelectedCategory(categorySlug);
      setCurrentPage(0);
      setSearchQuery("");

      let songsRes;
      if (categorySlug === "all") {
        songsRes = await getActiveSongsAction(SONGS_PER_PAGE, 0);
      } else {
        songsRes = await getSongsByCategoryAction(
          categorySlug,
          SONGS_PER_PAGE,
          0,
        );
      }

      if (songsRes.success) {
        setSongs(songsRes.songs || []);
        setTotalSongs(songsRes.total);
        setHasMore(songsRes.hasMore);
      }

      const personaSongsRes = await getPersonaSongsByCategoryAction(
        categorySlug === "all" ? null : categorySlug,
        12,
        0,
      );
      if (personaSongsRes.success) {
        setPersonaSongs(personaSongsRes.songs || []);
      }
    } catch (e) {
      console.error("Failed to filter songs by category:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSongs = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * SONGS_PER_PAGE;

      let res;
      if (searchQuery.trim()) {
        res = await fuzzySearchSongsAction(searchQuery, 50);
      } else {
        res = await getSongsByCategoryAction(
          selectedCategory === "all" ? null : selectedCategory,
          SONGS_PER_PAGE,
          offset,
        );
      }

      if (res.success) {
        setSongs((prev) => [...prev, ...(res.songs || [])]);
        setHasMore("hasMore" in res ? res.hasMore : false);
        setCurrentPage(nextPage);
      }
    } catch (e) {
      console.error("Failed to load more songs:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col">
      <Header showCreateSongCTA />

      <main className="flex flex-1 flex-col">
        {/* ── Page header ── */}
        <div className="px-4 md:px-8 pt-3 md:pt-6 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-teal font-heading leading-tight">
                Song Library
              </h1>
            </div>
            <div className="w-full max-w-[220px] md:max-w-[360px]">
              <LibrarySearchBar
                onSearch={handleSearch}
                initialQuery={initialSearchQuery}
                placeholder="Search songs..."
                className="w-full"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryFilter(cat.slug)}
                aria-current={
                  selectedCategory === cat.slug ? "page" : undefined
                }
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  selectedCategory === cat.slug
                    ? "bg-accent-coral border-accent-coral shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <span
                  className={
                    selectedCategory === cat.slug
                      ? "text-white"
                      : "text-text-teal/60"
                  }
                >
                  {cat.name}
                </span>
                <span
                  className={`text-[10px] ${selectedCategory === cat.slug ? "text-white/70" : "text-text-teal/30"}`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Style inspiration row — top of library ── */}
        {!searchQuery.trim() && personaSongs.length > 0 && (
          <div className="px-4 md:px-8 pb-4">
            <SimilarStyleSongsRow
              songs={personaSongs}
              onSongSelect={handleSongPlay}
              currentCategory={
                selectedCategory !== "all" ? selectedCategory : undefined
              }
              cta={
                selectedCategory !== "all" ? (
                  <Link
                    href={`/occasions/${selectedCategory}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-text-teal border border-gray-200 text-xs font-bold hover:border-gray-300 transition-colors"
                  >
                    <span>
                      Explore{" "}
                      {categories.find((c) => c.slug === selectedCategory)
                        ?.name || "Category"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : undefined
              }
            />
          </div>
        )}

        {/* ── Songs grid ── */}
        <div className="flex-1 px-4 md:px-8 pb-24">
          {loading || isSearching ? (
            <div className="flex flex-col items-center justify-center min-h-64 gap-3">
              <div className="w-8 h-8 border-[3px] border-gray-100 border-t-accent-coral rounded-full animate-spin" />
              <p className="text-sm text-text-teal/40 font-body">
                {isSearching ? "Searching..." : "Loading songs..."}
              </p>
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-64 gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                🎵
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-text-teal font-heading">
                  {searchQuery ? "No songs found" : "No songs yet"}
                </p>
                <p className="text-sm text-text-teal/50 font-body mt-1">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "Check back soon."}
                </p>
              </div>
            </div>
          ) : (
            <SongCardsGrid
              songs={songs}
              pageContext="library_grid"
              songsPerPage={SONGS_PER_PAGE}
            />
          )}

          {/* Load more */}
          {hasMore && songs.length > 0 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMoreSongs}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-text-teal hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load more · ${songs.length} of ${totalSongs}`
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedSong && (
        <MediaPlayer
          song={{
            title: selectedSong.title,
            artist: selectedSong.service_provider || "Melodia",
            song_url: selectedSong.song_url || undefined,
            timestamp_lyrics: selectedSong.timestamp_lyrics || undefined,
            timestamped_lyrics_variants:
              selectedSong.timestamped_lyrics_variants || undefined,
            selected_variant: selectedSong.selected_variant || undefined,
            slug: selectedSong.slug,
            show_lyrics: selectedSong.show_lyrics,
            plain_lyrics: selectedSong.lyrics,
            likes_count: selectedSong.likes_count || 0,
            suno_variants: (selectedSong.suno_variants as any) || undefined,
          }}
          onClose={() => setSelectedSong(null)}
        />
      )}

      <Footer />
    </div>
  );
}
