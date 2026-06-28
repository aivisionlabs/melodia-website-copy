"use client";

import DeleteSongButton from "@/components/DeleteSongButton";
import TimestampLyricsEditor from "@/components/TimestampLyricsEditor";
import {
  getSongWithLyricsAction,
  toggleDownloadAllowedAction,
  toggleShowLyricsAction,
} from "@/lib/actions/song.actions";
import {
  downloadFile,
  downloadTimestampLyrics,
} from "@/lib/utils/download-utils";
import { LyricLine, Song } from "@/types";
import { Download, Check, Play, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
// Removed icon imports; using text CTA instead
import CreatePersonaButton from "@/components/admin/CreatePersonaButton";
import InlineAudioPlayer from "@/components/InlineAudioPlayer";
import { updateLikesCountAction } from "@/lib/actions/song.actions";
import CategorySelectionModal from "@/components/admin/CategorySelectionModal";
import CustomerLyricsModal from "@/components/admin/CustomerLyricsModal";
import LanguageModal from "@/components/admin/LanguageModal";
import LessCommonDetailsModal from "@/components/admin/LessCommonDetailsModal";
import { LanguageSelector } from "@/components/admin/LanguageSelector";

interface SongListProps {
  songs: Song[];
  searchQuery?: string;
  categoryFilter?: string;
  sortBy?: string;
  availableCategories?: Array<{
    id: number;
    name: string;
    slug: string;
    sequence: number;
    count: number;
  }>;
}

export default function SongList({
  songs,
  searchQuery = "",
  categoryFilter = "",
  sortBy = "newest",
  availableCategories = [],
}: SongListProps) {
  const router = useRouter();
  const [currentSongs, setCurrentSongs] = useState<Song[]>(songs);
  const [songsWithPersonas, setSongsWithPersonas] = useState<
    Map<number, Array<{ id: number; variantIndex: number | null }>>
  >(new Map());

  // State for tracking category assignments per song
  const [categoryAssignments, setCategoryAssignments] = useState<
    Record<number, string[]>
  >({});
  const [updatingCategories, setUpdatingCategories] = useState<Set<number>>(
    new Set()
  );
  const [categoryModalOpen, setCategoryModalOpen] = useState<number | null>(
    null
  );
  const [customerLyricsModalOpen, setCustomerLyricsModalOpen] = useState<
    number | null
  >(null);
  const [customerLyricsData, setCustomerLyricsData] = useState<
    Record<number, string | null>
  >({});
  const [languageModalOpen, setLanguageModalOpen] = useState<number | null>(
    null
  );
  const [languageAssignments, setLanguageAssignments] = useState<
    Record<number, string[]>
  >({});
  const [updatingLanguage, setUpdatingLanguage] = useState<Set<number>>(
    new Set()
  );
  const [detailsModalOpen, setDetailsModalOpen] = useState<number | null>(
    null
  );

  // Initialize category assignments from songs data
  useEffect(() => {
    const initialAssignments: Record<number, string[]> = {};
    const initialLanguageAssignments: Record<number, string[]> = {};
    currentSongs.forEach((song) => {
      initialAssignments[song.id] = song.categories || [];
      // Parse language from comma-separated string
      if (song.language) {
        initialLanguageAssignments[song.id] = song.language.split(", ").map(l => l.trim());
      } else {
        initialLanguageAssignments[song.id] = [];
      }
    });
    setCategoryAssignments(initialAssignments);
    setLanguageAssignments(initialLanguageAssignments);
  }, [currentSongs]);

  // Filter songs based on search query and category filter
  const filteredSongs = useMemo(() => {
    let filtered = currentSongs;

    // Apply category filter first
    if (categoryFilter.trim()) {
      filtered = filtered.filter((song) => {
        // Get current categories (from assignments if updated, otherwise from song data)
        const currentCategories =
          categoryAssignments[song.id] || song.categories || [];

        // Special case: filter songs with no categories
        if (categoryFilter === "__NO_CATEGORY__") {
          return currentCategories.length === 0;
        }
        // Regular category filter
        return currentCategories.some(
          (cat) => cat.toLowerCase() === categoryFilter.toLowerCase()
        );
      });
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((song) => {
        // Search in title
        if (song.title?.toLowerCase().includes(query)) return true;

        // Search in music style
        if (song.music_style?.toLowerCase().includes(query)) return true;

        // Search in service provider
        if (song.service_provider?.toLowerCase().includes(query)) return true;

        // Search in status
        if (song.status?.toLowerCase().includes(query)) return true;

        // Search in song requester
        if (song.song_requester?.toLowerCase().includes(query)) return true;

        // Search in categories
        if (song.categories?.some((cat) => cat.toLowerCase().includes(query)))
          return true;

        // Search in tags
        if (song.tags?.some((tag) => tag.toLowerCase().includes(query)))
          return true;

        return false;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        case "likes-desc":
          return (b.likes_count || 0) - (a.likes_count || 0);
        case "likes-asc":
          return (a.likes_count || 0) - (b.likes_count || 0);
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title-desc":
          return (b.title || "").localeCompare(a.title || "");
        default:
          return 0;
      }
    });

    return sorted;
  }, [currentSongs, searchQuery, categoryFilter, sortBy, categoryAssignments]);

  // Modal state for lyrics editor
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [editorSongData, setEditorSongData] = useState<{
    songId: number;
    slug: string;
    timestampLyrics: LyricLine[] | null;
    plainLyrics: string | null;
  } | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "generating":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSongDelete = (deletedSongId: number) => {
    setCurrentSongs((prevSongs) =>
      prevSongs.filter((song) => song.id !== deletedSongId)
    );
  };

  const handleSongClick = (song: Song) => {
    // If song is in generating state, navigate to the generate page
    if (song.status === "generating" && song.suno_task_id) {
      router.push(`/song-admin-portal/generate/${song.suno_task_id}`);
    } else if (song.slug) {
      router.push(`/song/${song.slug}`);
    }
  };

  const handleFixLyrics = async (song: Song) => {
    try {
      const result = await getSongWithLyricsAction(song.id);
      if (result.success && result.song) {
        setEditorSongData({
          songId: result.song.id,
          slug: result.song.slug,
          timestampLyrics: result.song.timestamp_lyrics,
          plainLyrics: result.song.lyrics,
        });
        setShowLyricsEditor(true);
      }
    } catch (error) {
      console.error("Error loading song data:", error);
    }
  };

  const handleEditorSave = () => {
    setShowLyricsEditor(false);
    // Refresh the page to show updated data
    window.location.reload();
  };

  const handleEditorCancel = () => {
    setShowLyricsEditor(false);
  };

  const handleCategoryUpdate = async (songId: number, categories: string[]) => {
    setUpdatingCategories((prev) => new Set(prev).add(songId));

    try {
      const response = await fetch(`/api/admin/songs/${songId}/categories`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        throw new Error("Failed to update categories");
      }

      // Update local state
      setCategoryAssignments((prev) => ({
        ...prev,
        [songId]: categories,
      }));

      // Update the songs data to reflect the change
      setCurrentSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.id === songId ? { ...song, categories } : song
        )
      );
    } catch (error) {
      console.error("Error updating categories:", error);
      alert("Failed to update categories. Please try again.");
    } finally {
      setUpdatingCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  const handleCategoryModalSave = (songId: number, categories: string[], languages: string[] = []) => {
    handleCategoryUpdate(songId, categories);
    if (languages.length > 0) {
      handleLanguageUpdate(songId, languages);
    }
    setCategoryModalOpen(null);
  };

  const handleLanguageUpdate = async (songId: number, languages: string[]) => {
    setUpdatingLanguage((prev) => new Set(prev).add(songId));

    try {
      const languageString = languages.length > 0 ? languages.join(", ") : null;
      const response = await fetch(`/api/admin/songs/${songId}/language`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: languageString }),
      });

      if (!response.ok) {
        throw new Error("Failed to update language");
      }

      // Update local state
      setLanguageAssignments((prev) => ({
        ...prev,
        [songId]: languages,
      }));

      // Update the songs data to reflect the change
      setCurrentSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.id === songId ? { ...song, language: languageString } : song
        )
      );
    } catch (error) {
      console.error("Error updating language:", error);
      alert("Failed to update language. Please try again.");
    } finally {
      setUpdatingLanguage((prev) => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  const handleToggleShowLyrics = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering song click
    try {
      const result = await toggleShowLyricsAction(song.id, !song.show_lyrics);
      if (result.success) {
        // Update the local state
        setCurrentSongs((prevSongs) =>
          prevSongs.map((s) =>
            s.id === song.id ? { ...s, show_lyrics: !song.show_lyrics } : s
          )
        );
      }
    } catch (error) {
      console.error("Error toggling show lyrics:", error);
    }
  };

  const handleToggleDownloadAllowed = async (
    song: Song,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering song click
    try {
      const result = await toggleDownloadAllowedAction(
        song.id,
        !song.download_allowed
      );
      if (result.success) {
        // Update the local state
        setCurrentSongs((prevSongs) =>
          prevSongs.map((s) =>
            s.id === song.id
              ? { ...s, download_allowed: !song.download_allowed }
              : s
          )
        );
      }
    } catch (error) {
      console.error("Error toggling download allowed:", error);
    }
  };

  const handleSwitchVariant = async (
    song: Song,
    variantIndex: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering song click
    try {
      const response = await fetch(`/api/admin/songs/${song.id}/variant`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variantIndex }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to switch variant");
      }

      const result = await response.json();

      if (result.success) {
        // Update the local state
        setCurrentSongs((prevSongs) =>
          prevSongs.map((s) => {
            if (s.id === song.id) {
              // Update selected_variant and song_url
              const rawVariants = s.suno_variants;
              const variantsArray: any[] = Array.isArray(rawVariants)
                ? rawVariants
                : rawVariants && typeof rawVariants === "object"
                  ? Object.values(rawVariants as any)
                  : [];

              const selectedVariant = variantsArray[variantIndex];
              const newSongUrl =
                selectedVariant?.sourceAudioUrl ||
                selectedVariant?.audioUrl ||
                selectedVariant?.streamAudioUrl ||
                s.song_url;

              return {
                ...s,
                selected_variant: variantIndex,
                song_url: newSongUrl,
              };
            }
            return s;
          })
        );
      }
    } catch (error) {
      console.error("Error switching variant:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to switch variant. Please try again."
      );
    }
  };

  const handleEditCustomerLyrics = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering song click
    setCustomerLyricsModalOpen(song.id);
    // Store current customer_lyrics if available (we'll fetch it in the modal if not)
    if ((song as any).customer_lyrics !== undefined) {
      setCustomerLyricsData((prev) => ({
        ...prev,
        [song.id]: (song as any).customer_lyrics,
      }));
    }
  };

  const handleSaveCustomerLyrics = async (
    songId: number,
    customerLyrics: string
  ) => {
    try {
      const response = await fetch(
        `/api/admin/songs/${songId}/customer-lyrics`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customer_lyrics: customerLyrics }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update customer lyrics");
      }

      const result = await response.json();

      if (result.success) {
        // Update the local state
        setCurrentSongs((prevSongs) =>
          prevSongs.map((s) => {
            if (s.id === songId) {
              return {
                ...s,
                customer_lyrics: customerLyrics,
              } as Song & { customer_lyrics?: string | null };
            }
            return s;
          })
        );

        // Update the customer lyrics data cache
        setCustomerLyricsData((prev) => ({
          ...prev,
          [songId]: customerLyrics,
        }));
      }
    } catch (error) {
      console.error("Error saving customer lyrics:", error);
      throw error;
    }
  };

  const handleLikesInputChange = (songId: number, value: string) => {
    const parsed = parseInt(value, 10);
    const safeValue = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;

    setCurrentSongs((prevSongs) =>
      prevSongs.map((s) =>
        s.id === songId ? { ...s, likes_count: safeValue } : s
      )
    );
  };

  const handleLikesSave = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const likes = song.likes_count ?? 0;
      const result = await updateLikesCountAction(song.id, likes);
      if (!result.success) {
        console.error("Failed to update likes_count:", result.error);
      }
    } catch (error) {
      console.error("Error updating likes_count:", error);
    }
  };

  const handleDownload = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering song click
    try {
      const audioUrl = song.song_url;
      if (!audioUrl) {
        console.error("No audio URL available for download");
        return;
      }

      const filename = `${song.title || "song"}.mp3`;
      await downloadFile(audioUrl, filename);
    } catch (error) {
      console.error("Error downloading audio:", error);
    }
  };

  const handleDownloadTimestampLyrics = async (
    song: Song,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent triggering song click
    try {
      const response = await fetch(
        `/api/admin/songs/${song.id}/timestamp-lyrics`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch timestamp lyrics");
      }

      if (!data.timestamp_lyrics || data.timestamp_lyrics.length === 0) {
        alert("No timestamp lyrics available for this song");
        return;
      }

      // Sanitize filename
      const sanitizedTitle = (data.title || song.title || "song")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${sanitizedTitle}_timestamp_lyrics`;

      downloadTimestampLyrics(data.timestamp_lyrics, filename);
    } catch (error) {
      console.error("Error downloading timestamp lyrics:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to download timestamp lyrics"
      );
    }
  };

  if (currentSongs.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No songs found
        </h3>
        <p className="text-gray-500 mb-4">
          Get started by creating your first song.
        </p>
        <Link
          href="/song-admin-portal/create"
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Song
        </Link>
      </div>
    );
  }

  if (filteredSongs.length === 0 && searchQuery.trim()) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No songs found
        </h3>
        <p className="text-gray-500 mb-4">
          No songs match your search query &quot;{searchQuery}&quot;.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Lyrics Editor Modal */}
      {showLyricsEditor && editorSongData && (
        <TimestampLyricsEditor
          songId={editorSongData.songId}
          slug={editorSongData.slug}
          timestampLyrics={editorSongData.timestampLyrics}
          plainLyrics={editorSongData.plainLyrics}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {/* Category Selection Modal */}
      {categoryModalOpen !== null && (
        <CategorySelectionModal
          open={categoryModalOpen !== null}
          onClose={() => setCategoryModalOpen(null)}
          onSave={(categories, languages = []) => {
            if (categoryModalOpen !== null) {
              handleCategoryModalSave(categoryModalOpen, categories, languages);
            }
          }}
          availableCategories={availableCategories}
          selectedCategories={
            categoryAssignments[categoryModalOpen] ||
            currentSongs.find((s) => s.id === categoryModalOpen)?.categories ||
            []
          }
          selectedLanguages={
            languageAssignments[categoryModalOpen] ||
            (currentSongs.find((s) => s.id === categoryModalOpen)?.language
              ? currentSongs
                  .find((s) => s.id === categoryModalOpen)
                  ?.language?.split(",")
                  .map((l) => l.trim()) || []
              : [])
          }
          songTitle={
            currentSongs.find((s) => s.id === categoryModalOpen)?.title
          }
        />
      )}

      {/* Customer Lyrics Modal */}
      {customerLyricsModalOpen !== null && (
        <CustomerLyricsModal
          open={customerLyricsModalOpen !== null}
          onClose={() => setCustomerLyricsModalOpen(null)}
          onSave={async (customerLyrics) => {
            if (customerLyricsModalOpen !== null) {
              await handleSaveCustomerLyrics(
                customerLyricsModalOpen,
                customerLyrics
              );
            }
          }}
          songId={customerLyricsModalOpen}
          songTitle={
            currentSongs.find((s) => s.id === customerLyricsModalOpen)?.title ||
            "Unknown Song"
          }
          initialCustomerLyrics={customerLyricsData[customerLyricsModalOpen]}
        />
      )}

      {/* Language Modal */}
      {languageModalOpen !== null && (
        <LanguageModal
          open={languageModalOpen !== null}
          onClose={() => setLanguageModalOpen(null)}
          onSave={(languages) => {
            if (languageModalOpen !== null) {
              handleLanguageUpdate(languageModalOpen, languages);
              setLanguageModalOpen(null);
            }
          }}
          selectedLanguages={
            languageAssignments[languageModalOpen] ||
            (currentSongs.find((s) => s.id === languageModalOpen)?.language
              ? currentSongs
                  .find((s) => s.id === languageModalOpen)
                  ?.language?.split(", ")
                  .map((l) => l.trim()) || []
              : [])
          }
          songTitle={
            currentSongs.find((s) => s.id === languageModalOpen)?.title ||
            "Unknown Song"
          }
        />
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-100">
          {filteredSongs.map((song) => (
            <li key={song.id} className="px-4 py-3 sm:px-6">
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white hover:shadow-sm transition-shadow">
                {/* Header: avatar + title + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center cursor-pointer flex-shrink-0"
                      onClick={() => handleSongClick(song)}
                    >
                      <span className="text-yellow-600 font-medium">
                        {song.title.charAt(0)}
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-left flex-1"
                          onClick={() => handleSongClick(song)}
                        >
                          <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {song.title}
                          </div>
                        </button>
                        <Link
                          href={`/song/${song.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-yellow-600 hover:text-yellow-900 text-xs sm:text-sm font-medium whitespace-nowrap"
                        >
                          View
                        </Link>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>
                          {song.add_to_library ? "In Library" : "Private"}
                        </span>
                        {song.play_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            {song.play_count} play
                            {song.play_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      song.status || "draft"
                    )}`}
                  >
                    {song.status || "draft"}
                  </span>
                </div>

                {/* Middle: audio / variants */}
                <div
                  className="mt-3 space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    // Prefer lightweight audio URLs from the server (avoids heavy JSON payloads)
                    const audioUrlsFromServer = Array.isArray(
                      (song as any).variant_audio_urls
                    )
                      ? ((song as any).variant_audio_urls as Array<
                          string | null
                        >)
                      : [];

                    if (audioUrlsFromServer.length > 0) {
                      return audioUrlsFromServer.map((audioUrl, index) => {
                        if (!audioUrl) return null;

                        const isSelected =
                          song.selected_variant !== undefined &&
                          song.selected_variant !== null &&
                          song.selected_variant === index;

                        return (
                          <div
                            key={`${song.id}-variant-${index}`}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-[96px]">
                              <span>Variant {index + 1}</span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              )}
                            </div>
                            <InlineAudioPlayer
                              audioUrl={audioUrl}
                              songTitle={`${song.title} - Variant ${index + 1}`}
                              songId={`${song.id}-v${index}`}
                              className="max-w-xs"
                            />
                            {!isSelected && audioUrlsFromServer.length > 1 && (
                              <button
                                onClick={(e) =>
                                  handleSwitchVariant(song, index, e)
                                }
                                className="ml-auto text-xs font-medium px-2 py-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-md transition-colors border border-yellow-200"
                                title={`Switch to Variant ${index + 1}`}
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        );
                      });
                    }

                    // Fallback: support older payloads where full variants were sent
                    const rawVariants = song.suno_variants;
                    const variantsArray: any[] = Array.isArray(rawVariants)
                      ? rawVariants
                      : rawVariants && typeof rawVariants === "object"
                        ? Object.values(rawVariants as any)
                        : [];

                    return variantsArray.length > 0 ? (
                      variantsArray.map((variant: any, index: number) => {
                        if (!variant) return null;
                        const audioUrl =
                          variant.sourceAudioUrl ||
                          variant.audioUrl ||
                          variant.streamAudioUrl;
                        if (!audioUrl) return null;

                        const isSelected =
                          song.selected_variant !== undefined &&
                          song.selected_variant !== null &&
                          song.selected_variant === index;

                        return (
                          <div
                            key={`${song.id}-variant-${index}`}
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-[96px]">
                              <span>Variant {index + 1}</span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              )}
                            </div>
                            <InlineAudioPlayer
                              audioUrl={audioUrl}
                              songTitle={`${song.title} - Variant ${index + 1}`}
                              songId={`${song.id}-v${index}`}
                              className="max-w-xs"
                            />
                            {!isSelected && variantsArray.length > 1 && (
                              <button
                                onClick={(e) =>
                                  handleSwitchVariant(song, index, e)
                                }
                                className="ml-auto text-xs font-medium px-2 py-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-md transition-colors border border-yellow-200"
                                title={`Switch to Variant ${index + 1}`}
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : song.song_url ? (
                      <InlineAudioPlayer
                        audioUrl={song.song_url}
                        songTitle={song.title}
                        songId={song.id}
                        className="max-w-xs"
                      />
                    ) : null;
                  })()}
                </div>

                {/* Footer: actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Show Lyrics CTA */}
                  <button
                    onClick={(e) => handleToggleShowLyrics(song, e)}
                    className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition-colors ${
                      song.show_lyrics
                        ? "text-green-700 hover:text-green-800 hover:bg-green-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {song.show_lyrics ? "Hide Lyrics" : "Show Lyrics"}
                  </button>

                  {/* Download Allowed Toggle */}
                  <button
                    onClick={(e) => handleToggleDownloadAllowed(song, e)}
                    className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition-colors ${
                      song.download_allowed
                        ? "text-green-700 hover:text-green-800 hover:bg-green-50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                    title={
                      song.download_allowed
                        ? "Disable download"
                        : "Enable download"
                    }
                  >
                    {song.download_allowed ? "Download On" : "Download Off"}
                  </button>

                  {/* Fix Lyrics Button - Only show if song has timestamp_lyrics */}
                  {(song.has_timestamp_lyrics ||
                    (song.timestamp_lyrics &&
                      song.timestamp_lyrics.length > 0)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFixLyrics(song);
                      }}
                      className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      title="Fix timestamp lyrics"
                    >
                      Fix Lyrics
                    </button>
                  )}

                  {/* Download Button - Only show if song has audio URL */}
                  {song.song_url && (
                    <button
                      onClick={(e) => handleDownload(song, e)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-900 text-xs sm:text-sm font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      title="Download song"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}

                  {/* Edit Customer Lyrics Button */}
                  <button
                    onClick={(e) => handleEditCustomerLyrics(song, e)}
                    className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition-colors text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                    title="Edit transliterated lyrics"
                  >
                    Edit Customer Lyrics
                  </button>

                  {/* Less Common Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsModalOpen(song.id);
                    }}
                    className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                    title="View less common details (lyrics, music style, persona info)"
                  >
                    Details
                  </button>

                  {/* Download Timestamp Lyrics Button - Show if song has timestamp lyrics */}
                  {song.has_timestamp_lyrics ||
                  (song.timestamp_lyrics && song.timestamp_lyrics.length > 0) ||
                  (song.timestamped_lyrics_variants &&
                    Object.keys(song.timestamped_lyrics_variants).length >
                      0) ? (
                    <button
                      onClick={(e) => handleDownloadTimestampLyrics(song, e)}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-900 text-xs sm:text-sm font-medium px-2 py-1 rounded-md hover:bg-purple-50 transition-colors"
                      title="Download timestamp lyrics"
                    >
                      <FileText className="h-4 w-4" />
                      Lyrics
                    </button>
                  ) : null}

                  {/* Likes count editor */}
                  <div
                    className="flex items-center gap-1 text-xs sm:text-sm text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Likes:</span>
                    <input
                      type="number"
                      min={0}
                      className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs sm:text-sm"
                      value={song.likes_count ?? 0}
                      onChange={(e) =>
                        handleLikesInputChange(song.id, e.target.value)
                      }
                    />
                    <button
                      onClick={(e) => handleLikesSave(song, e)}
                      className="px-2 py-0.5 rounded bg-yellow-500 text-white text-xs sm:text-sm hover:bg-yellow-600"
                    >
                      Save
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {songsWithPersonas.has(song.id) &&
                      songsWithPersonas.get(song.id)!.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {songsWithPersonas.get(song.id)!.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md bg-green-100 text-green-800"
                            >
                              v{(p.variantIndex ?? 0) + 1}
                            </span>
                          ))}
                        </div>
                      )}
                    <CreatePersonaButton
                      sourceType="song"
                      sourceId={song.id}
                      variantCount={(() => {
                        const fromCount =
                          typeof (song as any).variant_count === "number"
                            ? (song as any).variant_count
                            : null;
                        const fromUrls = Array.isArray(
                          (song as any).variant_audio_urls
                        )
                          ? ((song as any).variant_audio_urls as Array<any>)
                              .length
                          : null;
                        const rawVariants = song.suno_variants;
                        const variantsArray: any[] = Array.isArray(rawVariants)
                          ? rawVariants
                          : rawVariants && typeof rawVariants === "object"
                            ? Object.values(rawVariants as any)
                            : [];
                        return fromCount ?? fromUrls ?? variantsArray.length;
                      })()}
                      initialVariantIndex={song.selected_variant ?? 0}
                      className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 w-fit"
                      onCreated={(p) => {
                        setSongsWithPersonas((prev) => {
                          const next = new Map(prev);
                          const existing = next.get(song.id) || [];
                          // Avoid duplicates if possible (based on ID or variantIndex)
                          if (!existing.some((ep) => ep.id === p.id)) {
                            next.set(song.id, [
                              ...existing,
                              {
                                id: p.id,
                                variantIndex: p.variantIndex ?? null,
                              },
                            ]);
                          }
                          return next;
                        });
                      }}
                      onPersonaExists={(ps: any[]) => {
                        setSongsWithPersonas((prev) => {
                          const next = new Map(prev);
                          const existing = next.get(song.id) || [];
                          const news = ps
                            .filter(
                              (p) => !existing.some((ep) => ep.id === p.id)
                            )
                            .map((p) => ({
                              id: p.id,
                              variantIndex: p.variantIndex ?? null,
                            }));
                          if (news.length > 0) {
                            next.set(song.id, [...existing, ...news]);
                          }
                          return next;
                        });
                      }}
                    />
                  </div>

                  <DeleteSongButton
                    songId={song.id}
                    songTitle={song.title}
                    variant="dropdown"
                    onDelete={() => handleSongDelete(song.id)}
                  />
                </div>

                {/* Categories row - Editable */}
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      Categories:
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {(categoryAssignments[song.id] || song.categories || [])
                        .length > 0 ? (
                        (
                          categoryAssignments[song.id] ||
                          song.categories ||
                          []
                        ).map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No categories assigned
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryModalOpen(song.id);
                      }}
                      disabled={updatingCategories.has(song.id)}
                      className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Update categories"
                    >
                      {updatingCategories.has(song.id)
                        ? "Updating..."
                        : "Update Categories"}
                    </button>
                  </div>
                </div>

                {/* Languages row - Editable */}
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      Languages:
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {(languageAssignments[song.id] ||
                        (song.language ? song.language.split(", ").map(l => l.trim()) : []))
                        .length > 0 ? (
                        (
                          languageAssignments[song.id] ||
                          (song.language ? song.language.split(", ").map(l => l.trim()) : [])
                        ).map((lang, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {lang}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No languages assigned
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLanguageModalOpen(song.id);
                      }}
                      disabled={updatingLanguage.has(song.id)}
                      className="text-xs sm:text-sm font-medium px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Update languages"
                    >
                      {updatingLanguage.has(song.id)
                        ? "Updating..."
                        : "Update Languages"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Less Common Details Modal */}
      <LessCommonDetailsModal
        open={detailsModalOpen !== null}
        onClose={() => setDetailsModalOpen(null)}
        songId={detailsModalOpen || 0}
        songTitle={currentSongs.find(s => s.id === detailsModalOpen)?.title || "Unknown Song"}
        songType="song"
      />
    </>
  );
}
