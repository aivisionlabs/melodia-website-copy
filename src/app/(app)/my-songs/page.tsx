"use client";

import { DownloadButton } from "@/components/DownloadButton";
import { getVariantDownloadAudioUrl } from "@/lib/utils/variant-utils";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { LoginPromptCard } from "@/components/LoginPromptCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamingPlayback } from "@/hooks/use-streaming-playback";
import { useToastHelpers } from "@/hooks/use-toast";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import { CheckCircle2, Heart, Music, Pause, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

interface SongVariant {
  id: string;
  index: number;
  title: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  sourceAudioUrl?: string;
  imageUrl?: string;
  duration: number;
  accepted: boolean;
  rating: number | null;
  reviewedAt: string | null;
  latestDecision?: "liked" | "disliked" | null;
  positiveAspects?: string[] | null;
  reasonCodes?: string[] | null;
}

interface MySongItem {
  id: number | null;
  slug: string | null;
  status: string;
  created_at: string;
  title: string;
  request_id: number;
  variants: SongVariant[];
  hasAcceptedVariant: boolean;
  totalVariants: number;
  type?: "song" | "pending_song" | "templated_instance";
  payment_id?: number | null;
  bothVariantsReviewed?: boolean;
  reviewedVariantsCount?: number;
}

interface InProgressRequest {
  id: number;
  request_id: number;
  title: string;
  status: string;
  created_at: string;
  recipient_details: string;
  occasion: string | null;
  has_lyrics: boolean;
  lyrics_status: string | null;
  lyrics_version: number | null;
  package_id: number | null;
  package_slug?: string | null;
  expert_created?: boolean;
  payment_completed?: boolean;
}

export default function MySongsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToastHelpers();
  const [songs, setSongs] = useState<MySongItem[]>([]);
  const [inProgressRequests, setInProgressRequests] = useState<
    InProgressRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSongId, setGeneratingSongId] = useState<number | null>(null);

  // Initialize streaming playback hook
  const { getPlaybackState, togglePlayback, updateDuration, cleanup } =
    useStreamingPlayback({
      onDurationAvailable: (variantId, duration) => {
        console.log(
          `Duration available for variant ${variantId}: ${duration}s`,
        );
      },
    });

  // Track if we have a valid session (authenticated or anonymous)
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const ensureAnonymousSession = useCallback(async () => {
    if (isAuthenticated) return;

    const storedId = localStorage.getItem("anonymous_user_id");
    const headers: HeadersInit = {};
    if (storedId) {
      headers["X-Restore-Anonymous-Id"] = storedId;
    }

    await fetch("/api/users/anonymous", {
      credentials: "include",
      headers,
    });
  }, [isAuthenticated]);

  // Load songs function
  const loadSongs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated) {
        await ensureAnonymousSession();
      }

      const storedId = localStorage.getItem("anonymous_user_id");
      const headers: HeadersInit = {};
      if (storedId) {
        headers["X-Restore-Anonymous-Id"] = storedId;
      }

      const res = await fetch("/api/my-songs", {
        cache: "no-store",
        credentials: "include",
        headers,
      });
      const data = await res.json();

      // If 401 (authentication required), no session exists at all
      if (res.status === 401) {
        setSongs([]);
        setInProgressRequests([]);
        setError(null);
        setHasSession(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to load songs");
      }

      // If we got here, we have a valid session (authenticated or anonymous)
      setHasSession(true);
      setSongs(data.songs || []);
      setInProgressRequests(data.inProgressRequests || []);

      if (!isAuthenticated && data.anonymousUserId) {
        localStorage.setItem("anonymous_user_id", data.anonymousUserId);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load songs");
      setSongs([]); // Clear songs on error
      setInProgressRequests([]); // Clear in-progress requests on error
      // If it's a network error, we can't determine session status
      if (!hasSession) {
        setHasSession(false);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureAnonymousSession, isAuthenticated]);

  // Handler for generating song from pending song request
  const handleGenerateSong = useCallback(
    async (requestId: number, paymentId: number | null) => {
      if (!paymentId) {
        toast.error(
          "Payment Error",
          "Payment ID not found. Please contact support.",
        );
        return;
      }

      setGeneratingSongId(requestId);
      try {
        const response = await fetch("/api/payments/success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId,
            requestId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to generate song");
        }

        if (data.songId) {
          toast.success(
            "Song Generation Started!",
            "Your song is being created. Redirecting...",
          );
          queueMySongsNudge(requestId, "song_generated");
          // Reload songs to show the new song
          await loadSongs();
          // Redirect to song page after a short delay
          setTimeout(() => {
            router.push(`/song-options/${data.songId}`);
          }, 1000);
        } else if (data.isPrimeCustomer) {
          toast.success(
            "Payment Processed",
            "Team will handle your Prime request manually.",
          );
          // Reload songs
          await loadSongs();
        } else {
          toast.success(
            "Song Generation Started!",
            "Your song is being created.",
          );
          // Reload songs
          await loadSongs();
        }
      } catch (error) {
        console.error("Error generating song:", error);
        toast.error(
          "Song Generation Error",
          error instanceof Error
            ? error.message
            : "Failed to start song generation. Please try again.",
        );
      } finally {
        setGeneratingSongId(null);
      }
    },
    [toast, router, loadSongs],
  );

  // Update durations when songs load
  useEffect(() => {
    songs.forEach((song) => {
      song.variants.forEach((variant) => {
        if (variant.duration && variant.duration > 0) {
          const currentState = getPlaybackState(variant.id);
          if (currentState.duration !== variant.duration) {
            updateDuration(variant.id, variant.duration);
          }
        }
      });
    });
  }, [songs, getPlaybackState, updateDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Load songs on mount
  useEffect(() => {
    // Only load songs if auth is initialized (not loading)
    // This allows both authenticated and anonymous users to load their songs
    if (!authLoading) {
      loadSongs();
    }
  }, [loadSongs, authLoading]);

  // Reload songs when user logs in (but don't clear on logout - anonymous users might have songs)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Reload songs when user logs back in
      loadSongs();
    }
  }, [isAuthenticated, authLoading, loadSongs]);

  const getReviewStatus = (song: MySongItem) => {
    const reviewedCount =
      song.reviewedVariantsCount ??
      song.variants.filter((variant) => !!variant.reviewedAt).length;

    if (song.bothVariantsReviewed) {
      return {
        badge: "Reviewed",
        badgeClass:
          "bg-primary-yellow/20 text-text-teal border-primary-yellow/40",
        ctaLabel: "Listen",
        helper: "Both versions reviewed.",
      };
    }

    if (reviewedCount > 0) {
      return {
        badge: `${reviewedCount} of ${Math.max(song.totalVariants, 2)} reviewed`,
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        ctaLabel: "Review Other Version",
        helper: "Keep reviewing both versions.",
      };
    }

    return {
      badge: "Needs Review",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      ctaLabel: "Resume Review",
      helper: "Share what you loved (or not) for each version.",
    };
  };

  const getLatestFeedbackDetail = (song: MySongItem) => {
    const reviewedVariants = song.variants
      .filter((variant) => !!variant.reviewedAt)
      .sort(
        (a, b) =>
          new Date(b.reviewedAt || "").getTime() -
          new Date(a.reviewedAt || "").getTime(),
      );
    const latest = reviewedVariants[0];
    if (!latest) return null;

    if (latest.latestDecision === "liked" && latest.positiveAspects?.length) {
      return `Liked: ${latest.positiveAspects.join(", ")}`;
    }
    if (latest.latestDecision === "disliked" && latest.reasonCodes?.length) {
      return `Issue: ${latest.reasonCodes.join(", ")}`;
    }
    if (latest.latestDecision === "liked") return "Loved this version";
    if (latest.latestDecision === "disliked") return "Not liked";
    return null;
  };

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <div className="hidden md:block">
          <Header showCreateSongCTA />
        </div>
        <div className="flex flex-grow items-center justify-center">
          <p className="font-body text-text-teal/80">Loading your songs…</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Show login prompt if no session exists at all (401 from API)
  // This happens when user has neither authenticated session nor anonymous cookie
  if (hasSession === false && !isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <div className="hidden md:block">
          <Header showCreateSongCTA />
        </div>
        <main className="flex-grow flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-2xl">
            <LoginPromptCard />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <div className="hidden md:block">
          <Header showCreateSongCTA />
        </div>
        <div className="flex flex-grow items-center justify-center px-6">
          <div className="text-center">
            <p className="font-body text-text-teal mb-4">{error}</p>
            <Button
              size="lg"
              onClick={() => router.refresh()}
              className="bg-gradient-to-r from-accent-coral to-accent-coral/80 text-white hover:from-accent-coral/90 hover:to-accent-coral/70"
            >
              Try again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
      <Header showCreateSongCTA />

      <main className="flex-grow flex flex-col items-center justify-start px-6 py-8">
        <div className="w-full max-w-4xl">
          {/* In Progress Requests Section */}
          {inProgressRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-text-teal mb-4">
                In Progress Requests
              </h2>
              <div className="space-y-4">
                {inProgressRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-text-teal/20 rounded-lg p-4 sm:p-6 bg-white/90 hover:border-primary-yellow hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-body text-base sm:text-lg text-text-teal font-semibold">
                            {request.title}
                          </h3>
                        </div>
                        <p className="font-body text-sm text-text-teal/60 mb-2">
                          Status: {request.status}
                          {request.occasion && ` • ${request.occasion}`}
                        </p>
                        {request.has_lyrics && (
                          <p className="font-body text-xs text-text-teal/50">
                            Lyrics: {request.lyrics_status || "draft"} (v
                            {request.lyrics_version || 1})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {request.payment_completed && request.expert_created ? (
                        <a
                          href="https://wa.me/917483464565?text=Hi!%20I%20have%20completed%20payment%20for%20my%20song%20request%20and%20need%20support."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#20BA5A] text-white font-semibold hover:from-[#20BA5A] hover:to-[#25D366] transition-colors text-sm"
                        >
                          <FaWhatsapp className="w-4 h-4" />
                          Contact for Support
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (request.expert_created) {
                              router.push(
                                `/payment?requestId=${request.request_id}`,
                              );
                            } else {
                              router.push(
                                `/generate-lyrics/${request.request_id}`,
                              );
                            }
                          }}
                          className={
                            request.expert_created
                              ? "bg-gradient-to-r from-accent-coral to-accent-coral/80 text-white hover:from-accent-coral/90 hover:to-accent-coral/70"
                              : request.has_lyrics
                                ? "bg-gradient-to-r from-accent-coral to-accent-coral/80 text-white hover:from-accent-coral/90 hover:to-accent-coral/70"
                                : "bg-gradient-to-r from-primary-yellow to-primary-yellow/80 text-text-teal hover:from-primary-yellow/90 hover:to-primary-yellow/70"
                          }
                        >
                          {request.expert_created
                            ? "Proceed to Payment"
                            : request.has_lyrics
                              ? "View Lyrics"
                              : "Generate Lyrics"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Songs Section */}
          {songs.length === 0 && inProgressRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-body text-text-teal/80 mb-6">No songs yet.</p>
              <Button
                size="lg"
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-accent-coral to-accent-coral/80 text-white hover:from-accent-coral/90 hover:to-accent-coral/70"
              >
                Create your first song
              </Button>
            </div>
          ) : songs.length > 0 ? (
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-text-teal mb-6">
                Completed Songs
              </h2>
              <div className="space-y-6">
                {songs.map((s) => (
                  <div
                    key={s.id ? `${s.type}-${s.id}` : `pending-${s.request_id}`}
                    className="border border-text-teal/20 rounded-lg p-4 sm:p-6 bg-white/90 hover:border-primary-yellow hover:shadow-lg transition-all duration-300"
                  >
                    {/* Song Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {s.slug ? (
                            <h3 className="font-body text-base sm:text-lg text-text-teal font-semibold cursor-pointer hover:text-primary-yellow transition-colors">
                              {s.title}
                            </h3>
                          ) : (
                            <h3 className="font-body text-base sm:text-lg text-text-teal font-semibold">
                              {s.title}
                            </h3>
                          )}
                          {s.hasAcceptedVariant && (
                            <CheckCircle2
                              className="w-4 h-4 text-green-500"
                              aria-label="Accepted variant"
                            />
                          )}
                        </div>
                        <p className="font-body text-sm text-text-teal/60">
                          Status:{" "}
                          {s.status === "pending_generation"
                            ? "Payment Complete - Ready to Generate"
                            : s.status}{" "}
                          • {s.totalVariants} variant
                          {s.totalVariants !== 1 ? "s" : ""}
                        </p>
                        {s.type !== "pending_song" && s.totalVariants > 0 && (
                          <div className="mt-3 rounded-lg border border-text-teal/10 bg-secondary-cream/50 p-3">
                            {(() => {
                              const status = getReviewStatus(s);
                              const detail = getLatestFeedbackDetail(s);
                              const targetPath =
                                s.type === "templated_instance" && s.slug
                                  ? `/song-template/song/${s.slug}`
                                  : s.id
                                    ? `/song-options/${s.id}`
                                    : null;
                              return (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}
                                    >
                                      {status.badge}
                                    </span>
                                    <p className="mt-1 text-xs text-text-teal/70">
                                      {status.helper}
                                    </p>
                                    {detail && (
                                      <p className="mt-1 text-xs text-text-teal/60">
                                        {detail}
                                      </p>
                                    )}
                                  </div>
                                  {targetPath && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-text-teal/30 text-text-teal hover:bg-text-teal/5"
                                      onClick={() => router.push(targetPath)}
                                    >
                                      {status.ctaLabel}
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Generate Song Button for Pending Songs */}
                    {s.type === "pending_song" && (
                      <div className="mb-4">
                        <Button
                          onClick={() =>
                            handleGenerateSong(
                              s.request_id,
                              s.payment_id || null,
                            )
                          }
                          disabled={generatingSongId === s.request_id}
                          className="w-full sm:w-auto bg-gradient-to-r from-accent-coral to-accent-coral/80 text-white hover:from-accent-coral/90 hover:to-accent-coral/70 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingSongId === s.request_id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Generating Song...
                            </>
                          ) : (
                            <>
                              <Music className="w-4 h-4 mr-2" />
                              Generate Song
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Variants List */}
                    {s.variants && s.variants.length > 0 && (
                      <div className="space-y-2">
                        {s.variants.map((variant) => {
                          if (!variant) return null;
                          const playbackState = getPlaybackState(variant.id);
                          const hasAudioUrl = !!(
                            variant.sourceAudioUrl ||
                            variant.sourceAudioUrl ||
                            variant.audioUrl ||
                            variant.streamAudioUrl
                          );

                          return (
                            <div
                              key={variant.id}
                              className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer
                            ${
                              variant.accepted
                                ? "border-green-200 bg-green-50/50"
                                : variant.reviewedAt && !variant.accepted
                                  ? "border-red-200 bg-red-50/50"
                                  : "border-text-teal/10 bg-white"
                            }
                            ${
                              variant.accepted
                                ? "hover:border-primary-yellow hover:shadow-md"
                                : "hover:border-text-teal/30 hover:shadow-sm"
                            }
                          `}
                              onClick={() => {
                                if (s.type === "templated_instance" && s.slug) {
                                  router.push(
                                    `/song-template/song/${s.slug}?song-variant=${variant.index}`,
                                  );
                                  return;
                                }
                                if (s.id) {
                                  router.push(
                                    `/song-options/${s.id}?song-variant=${variant.index}`,
                                  );
                                }
                              }}
                              aria-label={`Variant ${variant.index + 1}: ${variant.title}`}
                            >
                              {/* Variant Icon/Indicator */}
                              <div className="flex-shrink-0">
                                {variant.accepted ? (
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                    <Heart className="w-4 h-4 text-white fill-white" />
                                  </div>
                                ) : variant.reviewedAt && !variant.accepted ? (
                                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <X className="w-4 h-4 text-red-600" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-text-teal/10 flex items-center justify-center">
                                    <Music className="w-4 h-4 text-text-teal/60" />
                                  </div>
                                )}
                              </div>

                              {/* Variant Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-body text-sm font-medium text-text-teal truncate">
                                    Variant {variant.index + 1}
                                  </p>
                                  {variant.rating && (
                                    <span className="text-xs font-body text-text-teal/60">
                                      ⭐ {variant.rating}/5
                                    </span>
                                  )}
                                </div>
                                {variant.accepted && (
                                  <p className="text-xs font-body text-green-600 mt-1">
                                    Accepted
                                  </p>
                                )}
                                {variant.reviewedAt && !variant.accepted && (
                                  <p className="text-xs font-body text-red-600 mt-1">
                                    Not preferred
                                  </p>
                                )}
                                {!variant.reviewedAt && (
                                  <p className="text-xs font-body text-text-teal/40 mt-1">
                                    Not reviewed
                                  </p>
                                )}
                              </div>

                              {/* Play/Pause Button */}
                              {hasAudioUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const audioUrl =
                                      variant.sourceAudioUrl ||
                                      variant.streamAudioUrl ||
                                      variant.audioUrl;
                                    if (audioUrl) {
                                      togglePlayback(variant.id, audioUrl);
                                    }
                                  }}
                                  disabled={
                                    playbackState.isLoading || !hasAudioUrl
                                  }
                                  className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-yellow hover:bg-primary-yellow/80 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                  aria-label={
                                    playbackState.isPlaying ? "Pause" : "Play"
                                  }
                                  title={
                                    playbackState.isPlaying ? "Pause" : "Play"
                                  }
                                >
                                  {playbackState.isLoading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  ) : playbackState.isPlaying ? (
                                    <Pause className="w-4 h-4 text-text-teal fill-text-teal" />
                                  ) : (
                                    <Play className="w-4 h-4 text-text-teal fill-text-teal ml-0.5" />
                                  )}
                                </button>
                              )}

                              {/* Download Button */}
                              {getVariantDownloadAudioUrl(variant) && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-shrink-0"
                                >
                                  <DownloadButton
                                    audioUrl={
                                      getVariantDownloadAudioUrl(variant)!
                                    }
                                    showIconOnly={true}
                                    songTitle={`${s.title}-version-${variant.index + 1}`}
                                    songId={s.id?.toString() || ""}
                                  />
                                </div>
                              )}

                              {/* Duration */}
                              {variant.duration > 0 && (
                                <div className="flex-shrink-0 text-xs font-body text-text-teal/60 min-w-[3rem] text-right">
                                  {playbackState.duration > 0 ? (
                                    <>
                                      {Math.floor(
                                        playbackState.currentTime / 60,
                                      )}
                                      :
                                      {String(
                                        Math.floor(
                                          playbackState.currentTime % 60,
                                        ),
                                      ).padStart(2, "0")}
                                      {" / "}
                                      {Math.floor(playbackState.duration / 60)}:
                                      {String(
                                        Math.floor(playbackState.duration % 60),
                                      ).padStart(2, "0")}
                                    </>
                                  ) : (
                                    <>
                                      {Math.floor(variant.duration / 60)}:
                                      {String(
                                        Math.floor(variant.duration % 60),
                                      ).padStart(2, "0")}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Show login prompt for anonymous users */}
          {!isAuthenticated && hasSession === true && (
            <div className="mt-8">
              <LoginPromptCard />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
