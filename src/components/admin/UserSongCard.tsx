"use client";

import InlineAudioPlayer from "@/components/InlineAudioPlayer";
import {
  Calendar,
  CreditCard,
  Gift,
  Globe,
  Library,
  Music,
  User,
  MessageSquare,
  Star,
  CheckCircle,
  XCircle,
  Play,
  FileText,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CategorySelectionModal from "./CategorySelectionModal";
import CreatePersonaButton from "./CreatePersonaButton";
import LessCommonDetailsModal from "./LessCommonDetailsModal";
import AdminUserSongLyricsModal from "./AdminUserSongLyricsModal";
import {
  downloadTextFile,
  downloadTimestampLyrics,
} from "@/lib/utils/download-utils";

interface UserSongCardProps {
  song: {
    id: number;
    slug: string;
    title: string;
    status: string;
    created_at: Date | string;
    recipient_details: string;
    occasion: string | null;
    languages: string;
    user: {
      id: number;
      name: string;
      email: string;
    } | null;
    is_anonymous: boolean;
    variant_count: number;
    music_style: string | null;
    selected_variant?: number | null;
    variant_audio_urls?: Array<string | null>;
    is_converted_to_library?: boolean;
    play_count?: number;
    payment_id: string | null;
    order_id: string | null;
    feedback?: Array<{
      id: number;
      variant_index: number;
      accepted: boolean;
      rating: number | null;
      reason_labels: string[];
      other_text: string | null;
      selected: boolean;
      created_at: Date | string;
    }>;
  };
}

// Simple time ago formatter
function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = typeof date === "string" ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`;
}

type Category = {
  id: number;
  name: string;
  slug: string;
  sequence: number;
  count: number;
};

export default function UserSongCard({ song }: UserSongCardProps) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [downloadingSunoLyrics, setDownloadingSunoLyrics] = useState(false);
  const [adminRetrying, setAdminRetrying] = useState(false);
  const [editLyricsOpen, setEditLyricsOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [defaultVariantIndex, setDefaultVariantIndex] = useState(0);
  const [songVariants, setSongVariants] = useState<any[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [personas, setPersonas] = useState<Array<{ id: number; variantIndex: number | null }>>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const createdDate =
    typeof song.created_at === "string"
      ? new Date(song.created_at)
      : song.created_at;

  // Initialize from server-provided data only (no auto-fetch)
  useEffect(() => {
    if (song.slug) {
      // If server already provided audio URLs for variants, use them.
      if (
        Array.isArray(song.variant_audio_urls) &&
        song.variant_audio_urls.length > 0
      ) {
        const expectedVariantCount = Math.max(
          typeof song.variant_count === "number" ? song.variant_count : 0,
          song.variant_audio_urls.length,
          2
        );
        const variantsFromServer: Array<{
          index: number;
          audioUrl: string | null;
          isSelected: boolean;
        }> = [];
        for (let index = 0; index < expectedVariantCount; index++) {
          const audioUrl = song.variant_audio_urls[index] ?? null;
          variantsFromServer.push({
            index,
            audioUrl,
            isSelected: song.selected_variant === index,
          });
        }
        setSongVariants(variantsFromServer);
        setVariantsLoaded(true);
      }
    }
  }, [
    song.slug,
    song.selected_variant,
    song.variant_count,
    song.variant_audio_urls,
  ]);

  // Load variants on demand
  const loadVariants = async () => {
    if (!song.slug || loadingVariants || variantsLoaded) return;

    setLoadingVariants(true);
    try {
      const response = await fetch(`/api/my-songs/${song.slug}`);
      const data = await response.json();
      if (data.success && data.song) {
        // Extract variants from suno_variants
        const rawVariants = data.song.suno_variants || [];
        const normalizedVariants = Array.isArray(rawVariants)
          ? rawVariants
          : Object.values(rawVariants).filter(Boolean);

        // Ensure we show all variants based on variant_count or a sensible minimum
        const expectedVariantCount = Math.max(
          typeof song.variant_count === "number" ? song.variant_count : 0,
          normalizedVariants.length,
          2
        );
        const variantsWithAudio = [];

        for (let index = 0; index < expectedVariantCount; index++) {
          const variant = normalizedVariants[index] || {};
          variantsWithAudio.push({
            ...variant,
            index,
            audioUrl:
              variant.sourceAudioUrl ||
              variant.audioUrl ||
              variant.streamAudioUrl ||
              null,
            isSelected: song.selected_variant === index,
          });
        }

        setSongVariants(variantsWithAudio);
        setVariantsLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
    } finally {
      setLoadingVariants(false);
    }
  };

  const timeAgo = formatTimeAgo(createdDate);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fetch categories when modal opens
  useEffect(() => {
    if (
      showCategoryModal &&
      availableCategories.length === 0 &&
      !loadingCategories
    ) {
      setLoadingCategories(true);
      fetch("/api/admin/categories")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAvailableCategories(data.categories || []);
          }
        })
        .catch((error) => {
          console.error("Error fetching categories:", error);
        })
        .finally(() => {
          setLoadingCategories(false);
        });
    }
  }, [showCategoryModal, availableCategories.length, loadingCategories]);

  const handleConvertClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isConverting) return;

    // Fetch song data with variants
    try {
      const response = await fetch(`/api/my-songs/${song.slug}`);
      const data = await response.json();

      if (data.success && data.song) {
        const songVariants = data.song.suno_variants || [];
        const normalizedVariants = Array.isArray(songVariants)
          ? songVariants
          : Object.values(songVariants).filter(Boolean);

        setVariants(normalizedVariants);
        setDefaultVariantIndex(data.song.selected_variant ?? 0);
      }
    } catch (error) {
      console.error("Error fetching song variants:", error);
    }

    setShowCategoryModal(true);
  };

  const handleCategorySave = async (
    selectedCategoryNames: string[],
    selectedLanguages: string[] = []
  ) => {
    setShowCategoryModal(false);

    try {
      setIsConverting(true);

      // Convert category names to IDs
      const categoryIds = availableCategories
        .filter((cat) => selectedCategoryNames.includes(cat.name))
        .map((cat) => cat.id);

      // Convert languages array to comma-separated string
      const languageString =
        selectedLanguages.length > 0 ? selectedLanguages.join(", ") : null;

      const response = await fetch("/api/admin/convert-to-library-song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userSongId: song.id,
          categoryIds: categoryIds,
          selectedVariantIndex: defaultVariantIndex,
          language: languageString,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert song");
      }

      // Redirect to library song
      if (data.song?.slug) {
        router.push(`/song/${data.song.slug}`);
      }
    } catch (error) {
      console.error("Error converting song:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to convert song to library"
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadTimestampLyrics = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(
        `/api/admin/user-songs/${song.id}/timestamp-lyrics`
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

  const handleAdminRetryGeneration = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adminRetrying) return;
    setAdminRetrying(true);
    try {
      const response = await fetch(`/api/admin/user-songs/${song.id}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to restart generation");
      }
      alert(
        "Generation restarted with the same lyrics. Status will show processing; watch this card or song-options page.",
      );
      router.refresh();
    } catch (error) {
      console.error("Admin retry generation error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to restart generation. Check console.",
      );
    } finally {
      setAdminRetrying(false);
    }
  };

  const handleDownloadSunoApiLyrics = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloadingSunoLyrics) return;

    try {
      setDownloadingSunoLyrics(true);
      const response = await fetch(
        `/api/admin/user-songs/${song.id}/suno-response`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch Suno API response");
      }

      if (
        !data.lyricsText ||
        typeof data.lyricsText !== "string" ||
        data.lyricsText.trim().length === 0
      ) {
        const variantsInfo =
          typeof data.variantCount === "number"
            ? ` (variants: ${data.variantCount}, lyrics found: ${data.lyricsFoundCount ?? 0})`
            : "";
        alert(`No lyrics found in Suno response${variantsInfo}`);
        return;
      }

      const sanitizedTitle = (song.title || "song")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${sanitizedTitle}_suno_api_lyrics`;

      downloadTextFile(data.lyricsText, filename);
    } catch (error) {
      console.error("Error downloading Suno API lyrics:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to download Suno API lyrics"
      );
    } finally {
      setDownloadingSunoLyrics(false);
    }
  };

  const statusLower = (song.status || "").toLowerCase();
  const canEditLyricsForGeneration =
    statusLower === "failed" || statusLower === "processing";

  return (
    <>
      <AdminUserSongLyricsModal
        open={editLyricsOpen}
        onClose={() => setEditLyricsOpen(false)}
        userSongId={song.id}
        songTitle={song.title}
        songStatus={song.status || "unknown"}
        onSaved={() => router.refresh()}
      />
      <div className="block border border-gray-200 rounded-lg p-3 bg-white hover:border-yellow-600 hover:shadow-md transition-all duration-300 max-w-4xl">
        <div className="flex flex-col gap-3">
          {/* Top Section - Title and Basic Info */}
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Music className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/my-songs/${song.slug}`}
                className="text-sm font-semibold text-gray-900 truncate mb-1 block hover:text-yellow-600 transition-colors"
              >
                {song.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                {song.recipient_details && (
                  <span className="flex items-center gap-0.5">
                    <Gift className="w-2.5 h-2.5" />
                    <span className="truncate">{song.recipient_details}</span>
                  </span>
                )}
                {song.occasion && (
                  <span className="text-gray-500">• {song.occasion}</span>
                )}
                {song.music_style && (
                  <span className="flex items-center gap-0.5 text-gray-500">
                    <Music className="w-2.5 h-2.5" />
                    {song.music_style}
                  </span>
                )}
                {song.languages && (
                  <span className="flex items-center gap-0.5 text-gray-500">
                    <Globe className="w-2.5 h-2.5" />
                    {song.languages}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-gray-500">
                  <Calendar className="w-2.5 h-2.5" />
                  {timeAgo}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(song.status)}`}
              >
                {song.status || "Unknown"}
              </span>
              <div className="flex flex-col items-end gap-1">
                {song.variant_count > 0 && (
                  <span className="text-xs text-gray-500">
                    {song.variant_count} variant
                    {song.variant_count !== 1 ? "s" : ""}
                  </span>
                )}
                {song.is_converted_to_library &&
                  song.play_count !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Play className="w-3 h-3" />
                      {song.play_count} play{song.play_count !== 1 ? "s" : ""}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Load Variants Button - Show when variants exist but haven't been loaded */}
          {song.variant_count > 0 && !variantsLoaded && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadVariants();
                }}
                disabled={loadingVariants}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingVariants ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Load Variants ({song.variant_count})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Audio Players for All Variants */}
          {songVariants.length > 0 && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {songVariants.map((variant, index) => {
                return (
                  <div
                    key={`variant-${index}`}
                    className="flex items-center gap-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-[80px] flex-shrink-0">
                      <span className="font-medium">Variant {index + 1}</span>
                      {variant.isSelected && (
                        <span className="text-green-600 font-semibold">✓</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {variant.audioUrl ? (
                        <InlineAudioPlayer
                          audioUrl={variant.audioUrl}
                          songTitle={`${song.title} - Variant ${index + 1}`}
                          songId={`${song.id}-v${index}`}
                          songSlug={song.slug}
                          skipPlayTracking={true}
                          className="max-w-full"
                        />
                      ) : (
                        <div className="text-xs text-gray-400 italic py-2">
                          Audio not available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {canEditLyricsForGeneration && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditLyricsOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors border border-amber-200"
                title="Update lyrics before retrying Suno"
              >
                <FileText className="w-3 h-3" />
                Edit lyrics
              </button>
            )}

            {statusLower === "failed" && (
              <button
                type="button"
                onClick={handleAdminRetryGeneration}
                disabled={adminRetrying}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Restart Suno generation (same request & lyrics)"
              >
                {adminRetrying ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Retrying…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Retry generation
                  </>
                )}
              </button>
            )}

            {song.status === "completed" && !song.is_converted_to_library && (
              <button
                onClick={handleConvertClick}
                disabled={isConverting}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Convert to Library Song"
              >
                <Library className="w-3 h-3" />
                {isConverting ? "Converting..." : "Convert"}
              </button>
            )}

            {song.status === "completed" && song.is_converted_to_library && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">
                <Library className="w-3 h-3" />
                In Library
              </span>
            )}

            {/* Create Persona button for completed user songs */}
            {song.status === "completed" && (
              <div className="flex flex-col gap-2">
                {personas.length > 0 ? (
                  <div className="flex items-center gap-2 px-2 py-1 bg-purple-50 rounded border border-purple-100">
                    <span className="text-xs font-medium text-purple-700">Persona Already Created</span>
                    <div className="flex flex-wrap gap-1">
                      {personas.map((p, idx) => (
                        <span key={idx} className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-purple-400 rounded-full" title={`Variant ${p.variantIndex !== null ? p.variantIndex + 1 : '?'}`}>
                          {p.variantIndex !== null ? p.variantIndex + 1 : '1'}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <CreatePersonaButton
                    sourceType="user_song"
                    sourceId={song.id}
                    variantCount={song.variant_count}
                    initialVariantIndex={song.selected_variant ?? 0}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded w-fit transition-colors"
                    onCreated={(p) => {
                      setPersonas(prev => {
                        if (!prev.some(ep => ep.id === p.id)) {
                          return [...prev, { id: p.id, variantIndex: p.variantIndex ?? null }];
                        }
                        return prev;
                      });
                    }}
                    onPersonaExists={(ps: any[]) => {
                      setPersonas(prev => {
                        const news = ps.filter(p => !prev.some(ep => ep.id === p.id))
                                       .map(p => ({ id: p.id, variantIndex: p.variantIndex ?? null }));
                        if (news.length > 0) {
                          return [...prev, ...news];
                        }
                        return prev;
                      });
                    }}
                  />
                )}
              </div>
            )}

            {/* Download Timestamp Lyrics Button - Show for completed songs */}
            {song.status === "completed" && (
              <button
                onClick={handleDownloadTimestampLyrics}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
                title="Download timestamp lyrics"
              >
                <FileText className="w-3 h-3" />
                Lyrics
              </button>
            )}

            {/* Download API Lyrics (raw response lyrics) - User songs only */}
            {song.status === "completed" && (
              <button
                onClick={handleDownloadSunoApiLyrics}
                disabled={downloadingSunoLyrics}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download lyrics found in Suno record-info response"
              >
                <FileText className="w-3 h-3" />
                {downloadingSunoLyrics ? "Suno..." : "Suno Lyrics"}
              </button>
            )}

            {/* Less Common Details Button */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              title="View less common details (lyrics, music style, persona info)"
            >
              <FileText className="w-3 h-3" />
              Details
            </button>

            {song.user ? (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <User className="w-3 h-3" />
                <span className="truncate">{song.user.name}</span>
              </div>
            ) : song.is_anonymous ? (
              <span className="text-xs text-gray-500 italic">Anonymous</span>
            ) : null}
          </div>

          {/* Payment Information */}
          {(song.payment_id || song.order_id) && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                <CreditCard className="w-3 h-3" />
                <span className="font-medium">Payment</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {song.order_id && (
                  <span>
                    <span className="font-medium">Order:</span>{" "}
                    <span className="font-mono text-[10px]">
                      {song.order_id}
                    </span>
                  </span>
                )}
                {song.payment_id && (
                  <span>
                    <span className="font-medium">Pay:</span>{" "}
                    <span className="font-mono text-[10px]">
                      {song.payment_id}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User Feedback */}
          {song.feedback && song.feedback.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1.5">
                <MessageSquare className="w-3 h-3" />
                <span className="font-medium">
                  Feedback ({song.feedback.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {song.feedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="text-xs bg-gray-50 rounded p-1.5 border border-gray-200"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-700 text-[11px]">
                        V{fb.variant_index + 1}
                      </span>
                      {fb.accepted ? (
                        <span className="flex items-center gap-0.5 text-green-700">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span className="text-[11px]">Accepted</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-red-700">
                          <XCircle className="w-2.5 h-2.5" />
                          <span className="text-[11px]">Rejected</span>
                        </span>
                      )}
                      {fb.rating && (
                        <span className="flex items-center gap-0.5 text-yellow-600">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span className="text-[11px]">{fb.rating}/5</span>
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {formatTimeAgo(fb.created_at)}
                      </span>
                    </div>
                    {fb.reason_labels.length > 0 && (
                      <div className="mt-1 text-[11px]">
                        <span className="text-gray-600 font-medium">
                          Reasons:{" "}
                        </span>
                        <span className="text-gray-500">
                          {fb.reason_labels.join(", ")}
                        </span>
                      </div>
                    )}
                    {fb.other_text && (
                      <div className="mt-1 text-[11px] text-gray-600 italic">
                        &quot;{fb.other_text}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CategorySelectionModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleCategorySave}
        availableCategories={availableCategories}
        selectedCategories={[]}
        selectedLanguages={[]}
        songTitle={song.title}
      />

      <LessCommonDetailsModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        songId={song.id}
        songTitle={song.title}
        songType="user_song"
      />
    </>
  );
}
