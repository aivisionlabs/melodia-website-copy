"use client";

import { SongStatusResponse } from "@/lib/types";
import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useStreamingPlayback } from "@/hooks/use-streaming-playback";
import { Heart } from "lucide-react";
import Image from "next/image";
import SongPlayerControls from "@/components/SongPlayerControls";
import VariantSwitcher from "@/components/VariantSwitcher";
import FeedbackModal from "@/components/FeedbackModal";
import PositiveFeedbackModal from "@/components/PositiveFeedbackModal";
import LyricsModal from "@/components/LyricsModal";
import SongCTAs from "@/components/SongCTAs";
import ApologyScreen from "@/components/ApologyScreen";
import { ConsumerVariationPanel } from "@/components/ConsumerVariationPanel";
import { DownloadHeaderActions } from "@/components/DownloadHeaderActions";
import {
  getVariantDownloadAudioUrl,
  isVariantPreparingDownload,
} from "@/lib/utils/variant-utils";
import FeedbackStatusSummary from "@/components/FeedbackStatusSummary";
import FeedbackTypePickerModal from "@/components/FeedbackTypePickerModal";
import Header from "@/components/Header";

interface SongOptionsDisplayProps {
  songStatus: SongStatusResponse;
  onBack?: () => void;
  initialVariantIndex?: number;
  /** When false, root uses content height instead of h-screen (e.g. when LoginPromptCard is below) */
  fullHeight?: boolean;
  /**
   * Custom header renderer. Receives the download actions element and returns the header node.
   * Defaults to the full Melodia <Header>. Pass a function to render an alternate header
   * (e.g. a minimal download-only bar) without introducing vendor-specific knowledge here.
   */
  renderHeader?: (downloadActions: React.ReactNode) => React.ReactNode;
  /** When true, suppresses router.push on variant switch / feedback rejection. */
  disableNavigation?: boolean;
  /** When false, suppresses the ApologyScreen when all variants are rejected. Default true. */
  allowRejection?: boolean;
  /** Called when all variants have been rejected (only fires when allowRejection is false). */
  onAllVariantsRejected?: () => void;
}

export default function SongOptionsDisplay({
  songStatus,
  onBack,
  initialVariantIndex = 0,
  fullHeight = true,
  renderHeader,
  disableNavigation = false,
  allowRejection = true,
  onAllVariantsRejected,
}: SongOptionsDisplayProps) {
  const router = useRouter();
  const [currentVariantIndex, setCurrentVariantIndex] =
    useState<number>(initialVariantIndex);
  const [variantFeedback, setVariantFeedback] = useState<Record<number, any[]>>(
    {},
  );
  const [hasFetchedFeedback, setHasFetchedFeedback] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPositiveFeedbackModal, setShowPositiveFeedbackModal] =
    useState(false);
  const [showFeedbackTypePicker, setShowFeedbackTypePicker] = useState(false);
  const [reasons, setReasons] = useState<{ code: string; label: string }[]>([]);
  const [songLoved, setSongLoved] = useState<boolean>(false);
  const [showJoyfulAnimation, setShowJoyfulAnimation] =
    useState<boolean>(false);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [showAllVariantsRejected, setShowAllVariantsRejected] =
    useState<boolean>(false);
  const [rejectionVariationsRemaining, setRejectionVariationsRemaining] =
    useState<number | null>(null);

  const { getPlaybackState, togglePlayback, updateDuration, cleanup, seekTo } =
    useStreamingPlayback({
      onDurationAvailable: (variantId, duration) => {
        console.log(
          `Duration available for variant ${variantId}: ${duration}s`,
        );
      },
    });

  const currentVariant = songStatus.variants?.[currentVariantIndex];
  const playbackState = currentVariant
    ? getPlaybackState(currentVariant.id)
    : null;

  useEffect(() => {
    if (Array.isArray(songStatus.variants)) {
      songStatus.variants.forEach((variant) => {
        if (variant.duration && variant.duration > 0) {
          const currentState = getPlaybackState(variant.id);
          if (currentState.duration !== variant.duration) {
            updateDuration(variant.id, variant.duration);
          }
        }
      });
    }
  }, [songStatus.variants, getPlaybackState, updateDuration]);

  // Fetch feedback data for the song
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!songStatus.songId || hasFetchedFeedback) return;

      try {
        const response = await fetch(`/api/song-feedback/${songStatus.songId}`);
        const data = await response.json();
        if (data.success && data.feedbackByVariant) {
          setVariantFeedback(data.feedbackByVariant);
          setHasFetchedFeedback(true);
        }
      } catch (error) {
        console.error("Failed to fetch feedback:", error);
      }
    };

    fetchFeedback();
  }, [songStatus.songId, hasFetchedFeedback]);

  // If the user already rejected every variant (e.g. page reload), show the post-rejection flow.
  useEffect(() => {
    if (!hasFetchedFeedback || !allowRejection || !songStatus.variants?.length) {
      return;
    }

    const allRejected = songStatus.variants.every((_, index) => {
      const feedback = variantFeedback[index];
      if (!feedback?.length) return false;
      return feedback.every((entry: { accepted?: boolean }) => entry.accepted === false);
    });

    if (allRejected) {
      setShowAllVariantsRejected(true);
    }
  }, [
    hasFetchedFeedback,
    variantFeedback,
    songStatus.variants,
    allowRejection,
  ]);

  // Refresh variation allowance when entering the all-rejected flow (polling may have stopped).
  useEffect(() => {
    if (!showAllVariantsRejected || !allowRejection || !songStatus.songId) {
      return;
    }

    let cancelled = false;
    const refreshVariationAllowance = async () => {
      try {
        const response = await fetch(`/api/song-status/${songStatus.songId}`);
        const data = await response.json();
        if (!cancelled && response.ok) {
          setRejectionVariationsRemaining(
            typeof data.variationsRemaining === "number"
              ? data.variationsRemaining
              : 0,
          );
        }
      } catch {
        if (!cancelled) {
          setRejectionVariationsRemaining(songStatus.variationsRemaining ?? 0);
        }
      }
    };

    void refreshVariationAllowance();
    return () => {
      cancelled = true;
    };
  }, [
    showAllVariantsRejected,
    allowRejection,
    songStatus.songId,
    songStatus.variationsRemaining,
  ]);

  // Check if current variant has been accepted and show download CTA accordingly
  useEffect(() => {
    if (hasFetchedFeedback) {
      const currentVariantFeedback = variantFeedback[currentVariantIndex];
      if (currentVariantFeedback && currentVariantFeedback.length > 0) {
        // Check if any feedback entry has accepted=true
        const hasAcceptedFeedback = currentVariantFeedback.some(
          (feedback: any) => feedback.accepted === true,
        );
        setSongLoved(hasAcceptedFeedback);
      } else {
        // No feedback for this variant, reset to show love/meh buttons
        setSongLoved(false);
      }
    }
  }, [variantFeedback, currentVariantIndex, hasFetchedFeedback]);

  // Update current variant index when initialVariantIndex changes
  useEffect(() => {
    if (initialVariantIndex !== undefined && initialVariantIndex >= 0) {
      // Validate variant index is within bounds
      const maxVariantIndex = songStatus.variants
        ? songStatus.variants.length - 1
        : 0;
      const safeVariantIndex = Math.max(
        0,
        Math.min(initialVariantIndex, maxVariantIndex),
      );
      setCurrentVariantIndex(safeVariantIndex);
    }
  }, [initialVariantIndex, songStatus.variants]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    let cancelled = false;
    const loadReasons = async () => {
      try {
        const res = await fetch("/api/song-feedback/reasons");
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.reasons)) {
          setReasons(data.reasons);
        }
      } catch {}
    };
    loadReasons();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlayPause = () => {
    if (currentVariant?.id) {
      const audioUrl =
        currentVariant.variantStatus === "DOWNLOAD_READY"
          ? currentVariant.sourceAudioUrl || currentVariant.audioUrl || currentVariant.sourceStreamAudioUrl || currentVariant.streamAudioUrl
          : currentVariant.sourceStreamAudioUrl || currentVariant.streamAudioUrl;
      if (audioUrl) {
        const isCurrentlyPlaying = playbackState?.isPlaying;
        if (!isCurrentlyPlaying && songStatus.songId !== undefined) {
          trackFunnelEvent.songVariantPlay(
            songStatus.songId.toString(),
            currentVariantIndex,
          );
        }
        togglePlayback(currentVariant.id, audioUrl);
      }
    }
  };

  const handleSeek = (time: number) => {
    if (currentVariant?.id) {
      seekTo(currentVariant.id, time);
    }
  };

  const skipTime = (seconds: number) => {
    if (playbackState && currentVariant?.id) {
      const newTime = Math.max(
        0,
        Math.min(
          playbackState.currentTime + seconds,
          playbackState.duration || Infinity,
        ),
      );
      handleSeek(newTime);
    }
  };

  const handleSkipBackward = () => {
    skipTime(-15);
  };

  const handleSkipForward = () => {
    skipTime(15);
  };

  const handleLoveIt = async () => {
    setShowPositiveFeedbackModal(true);
  };

  const handlePositiveFeedbackSubmit = async (
    aspects: string[],
    otherText: string,
  ) => {
    if (aspects.length === 0) return;
    setShowJoyfulAnimation(true);

    setTimeout(() => {
      setShowJoyfulAnimation(false);
      setSongLoved(true);
    }, 1000);

    try {
      await fetch("/api/song-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: songStatus.songId!,
          variantIndex: currentVariantIndex,
          accepted: true,
          positive_aspects: aspects,
          positive_other_text: otherText.trim() || undefined,
        }),
      });
    } catch (error) {
      console.error("Failed to submit 'love it' feedback", error);
    }

    // Refresh feedback data
    if (songStatus.songId) {
      try {
        const response = await fetch(`/api/song-feedback/${songStatus.songId}`);
        const data = await response.json();
        if (data.success && data.feedbackByVariant) {
          setVariantFeedback(data.feedbackByVariant);
        }
      } catch (error) {
        console.error("Failed to refresh feedback:", error);
      }
    }

    if (songStatus.songId !== undefined) {
      trackFunnelEvent.songVariantSelect(
        songStatus.songId.toString(),
        currentVariantIndex,
      );
    }
    setShowPositiveFeedbackModal(false);
  };

  const fetchLyrics = async () => {
    if (!songStatus.songRequestId) {
      console.error("No song request ID available to fetch lyrics");
      return;
    }

    setIsLoadingLyrics(true);
    try {
      const response = await fetch(
        `/api/fetch-lyrics?requestId=${songStatus.songRequestId}`,
      );
      const data = await response.json();

      if (data.success && data.data?.lyricsDraft) {
        // Prefer customer_lyrics (transliterated) over generatedText for display
        setLyricsText(
          data.data.lyricsDraft.customerLyrics ||
            data.data.lyricsDraft.generatedText ||
            null,
        );
      } else {
        console.error("Failed to fetch lyrics:", data);
        setLyricsText(null);
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyricsText(null);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const handleViewSongWithLyrics = () => {
    if (songStatus.slug) {
      setShowLyricsModal(true);
      if (!lyricsText && songStatus.songRequestId) {
        fetchLyrics();
      }
    } else if (songStatus.songRequestId) {
      setShowLyricsModal(true);
      if (!lyricsText) {
        fetchLyrics();
      }
    }
  };

  const bothVariantsHaveFeedback =
    songStatus.variants &&
    songStatus.variants.length >= 2 &&
    variantFeedback[0] &&
    variantFeedback[0].length > 0 &&
    variantFeedback[1] &&
    variantFeedback[1].length > 0;

  const handleMeh = () => {
    if (bothVariantsHaveFeedback) {
      handleSubmitFeedbackWithoutReason();
    } else {
      setShowFeedbackModal(true);
    }
  };

  const handleOpenFeedbackTypePicker = () => {
    setShowFeedbackTypePicker(true);
  };

  const handleVariantChange = (newIndex: number) => {
    // Pause currently playing variant (if any)
    if (
      songStatus.variants &&
      songStatus.variants[currentVariantIndex] &&
      songStatus.variants[currentVariantIndex].id
    ) {
      const prevVariant = songStatus.variants[currentVariantIndex];
      const prevPlaybackState = getPlaybackState(prevVariant.id);
      if (prevPlaybackState.isPlaying) {
        const prevAudioUrl =
          prevVariant.variantStatus === "DOWNLOAD_READY"
            ? prevVariant.sourceAudioUrl || prevVariant.audioUrl || prevVariant.sourceStreamAudioUrl || prevVariant.streamAudioUrl
            : prevVariant.sourceStreamAudioUrl || prevVariant.streamAudioUrl;
        if (prevAudioUrl) {
          // togglePlayback will pause because it's currently playing
          togglePlayback(prevVariant.id, prevAudioUrl);
        }
      }
    }

    if (songStatus.songId !== undefined) {
      trackFunnelEvent.songVariantSwitch(
        songStatus.songId.toString(),
        currentVariantIndex,
        newIndex,
      );
    }

    setCurrentVariantIndex(newIndex);
    if (!disableNavigation && songStatus.songId !== undefined) {
      router.push(`/song-options/${songStatus.songId}?song-variant=${newIndex}`);
    }
  };

  const handleSubmitFeedbackWithoutReason = async () => {
    if (songStatus.songId !== undefined) {
      trackFunnelEvent.songVariantReject(
        songStatus.songId.toString(),
        currentVariantIndex,
      );
    }

    try {
      await fetch("/api/song-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: songStatus.songId!,
          variantIndex: currentVariantIndex,
          accepted: false,
          reasons: [],
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback", error);
    }

    if (songStatus.songId) {
      try {
        const response = await fetch(`/api/song-feedback/${songStatus.songId}`);
        const data = await response.json();
        if (data.success && data.feedbackByVariant) {
          setVariantFeedback(data.feedbackByVariant);
        }
      } catch (error) {
        console.error("Failed to refresh feedback:", error);
      }
    }

    setShowAllVariantsRejected(true);
    if (!allowRejection) onAllVariantsRejected?.();
  };

  const handleSubmitFeedback = async (reason: string, otherText: string) => {
    if (songStatus.songId !== undefined) {
      trackFunnelEvent.songVariantReject(
        songStatus.songId.toString(),
        currentVariantIndex,
        reason || undefined,
      );
    }

    try {
      await fetch("/api/song-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: songStatus.songId!,
          variantIndex: currentVariantIndex,
          accepted: false,
          reasons: reason ? [reason] : [],
          otherText: reason === "Other" ? otherText : undefined,
        }),
      });
    } catch (error) {
      console.error("Failed to submit 'meh' feedback", error);
    }

    if (songStatus.songId) {
      try {
        const response = await fetch(`/api/song-feedback/${songStatus.songId}`);
        const data = await response.json();
        if (data.success && data.feedbackByVariant) {
          setVariantFeedback(data.feedbackByVariant);
        }
      } catch (error) {
        console.error("Failed to refresh feedback:", error);
      }
    }

    setShowFeedbackModal(false);
    if (
      songStatus.variants &&
      currentVariantIndex < songStatus.variants.length - 1
    ) {
      const nextVariantIndex = currentVariantIndex + 1;
      setCurrentVariantIndex(nextVariantIndex);
      if (!disableNavigation && songStatus.songId !== undefined) {
        router.push(
          `/song-options/${songStatus.songId}?song-variant=${nextVariantIndex}`,
        );
      }
    } else {
      setShowAllVariantsRejected(true);
      if (!allowRejection) onAllVariantsRejected?.();
    }
  };

  if (showAllVariantsRejected && allowRejection) {
    const variationsRemaining =
      rejectionVariationsRemaining ?? songStatus.variationsRemaining ?? 0;

    if (variationsRemaining > 0 && songStatus.songId) {
      const rejectionReasons = Array.from(
        new Set(
          Object.values(variantFeedback)
            .flat()
            .filter((entry: any) => entry.accepted === false)
            .flatMap((entry: any) => entry.reason_codes ?? []),
        ),
      );

      return (
        <ConsumerVariationPanel
          songId={songStatus.songId}
          variationsRemaining={variationsRemaining}
          occasion={songStatus.occasion ?? null}
          languages={songStatus.languages ?? null}
          recipientName={songStatus.recipientName ?? null}
          rejectionReasons={rejectionReasons}
          onBack={onBack}
        />
      );
    }
    // No variations left — stay on the song-options screen
    if (showAllVariantsRejected) setShowAllVariantsRejected(false);
  }

  if (!currentVariant) {
    return <div>Loading song...</div>;
  }

  // Get feedback status for current variant
  const currentVariantFeedback = variantFeedback[currentVariantIndex];
  const hasFeedback =
    currentVariantFeedback && currentVariantFeedback.length > 0;

  // Get the most recent feedback entry for this variant
  const latestFeedback =
    hasFeedback && currentVariantFeedback.length > 0
      ? currentVariantFeedback[0]
      : null;
  const feedbackStatus = hasFeedback
    ? latestFeedback?.accepted
      ? "loved"
      : "not_liked"
    : null;

  // Map reason codes to labels for negative feedback
  const getReasonLabels = (
    reasonCodes: string[] | null | undefined,
  ): string[] => {
    if (!reasonCodes || reasonCodes.length === 0) return [];
    const codeToLabel = new Map(reasons.map((r) => [r.code, r.label]));
    return reasonCodes
      .map((code) => codeToLabel.get(code) || code)
      .filter(Boolean);
  };

  const reasonLabels =
    latestFeedback && !latestFeedback.accepted
      ? getReasonLabels(latestFeedback.reason_codes)
      : [];
  const positiveAspects = latestFeedback?.positive_aspects ?? [];
  const variantDownloadTitle = `${
    songStatus.lyricsDraftTitle || currentVariant.title || "song"
  }-version-${currentVariantIndex + 1}`;
  const downloadAudioUrl = getVariantDownloadAudioUrl(currentVariant);
  const preparingDownload = isVariantPreparingDownload(currentVariant);
  const headerDownloadActions = (
    <DownloadHeaderActions
      downloadAudioUrl={downloadAudioUrl}
      songTitle={variantDownloadTitle}
      songId={songStatus.songId?.toString() || ""}
      preparingDownload={preparingDownload}
    />
  );

  return (
    <div
      className={`flex flex-col bg-[#FEFBF7] text-[#5C4B52] ${fullHeight ? "h-screen" : "flex-1 min-h-0"}`}
    >
      {renderHeader ? (
        renderHeader(headerDownloadActions)
      ) : (
        <Header
          showCreateSongCTA={false}
          rightActions={headerDownloadActions}
        />
      )}

      <main className="flex-grow flex flex-col items-center pt-4 px-6 text-center">
        <div className="flex flex-col w-full max-w-sm justify-center items-center">
          <Image
            src={
              currentVariant.sourceImageUrl ||
              currentVariant.imageUrl ||
              "/images/melodia-logo-transparent.png"
            }
            alt="Album Art"
            className="w-[50%] rounded-lg shadow-lg mb-6"
            width={200}
            height={200}
          />

          <h2 className="text-2xl font-bold">
            {songStatus.lyricsDraftTitle || currentVariant.title}
          </h2>
          <p className="text-md text-gray-500 mb-6">Melodia</p>

          <VariantSwitcher
            currentVariantIndex={currentVariantIndex}
            totalVariants={songStatus.variants?.length || 0}
            onVariantChange={handleVariantChange}
          />

          {(songStatus.slug || songStatus.songRequestId) && (
            <button
              onClick={handleViewSongWithLyrics}
              className="text-sm text-[#EF476F] hover:text-[#EF476F]/80 underline mt-2 transition-colors"
            >
              View Lyrics
            </button>
          )}

          <SongPlayerControls
            playbackState={playbackState}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSkipBackward={handleSkipBackward}
            onSkipForward={handleSkipForward}
          />

          {showJoyfulAnimation && (
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
              <div className="love-pop bg-white/0 rounded-full p-4">
                <Heart
                  className="w-16 h-16 text-[#EF476F] drop-shadow-md"
                  fill="#EF476F"
                />
              </div>
            </div>
          )}

          <SongCTAs
            songLoved={songLoved}
            onLoveIt={handleLoveIt}
            onMeh={handleMeh}
            hasFeedback={hasFeedback}
          />

          {hasFeedback && feedbackStatus && (
            <FeedbackStatusSummary
              feedbackStatus={feedbackStatus}
              positiveAspects={positiveAspects}
              reasonLabels={reasonLabels}
              otherText={latestFeedback?.other_text ?? null}
              onUpdateFeedback={handleOpenFeedbackTypePicker}
            />
          )}
        </div>
      </main>

      <FeedbackModal
        show={showFeedbackModal}
        reasons={reasons}
        onSubmit={handleSubmitFeedback}
        onClose={() => setShowFeedbackModal(false)}
      />

      <PositiveFeedbackModal
        show={showPositiveFeedbackModal}
        onSubmit={(aspects, otherText) => {
          void handlePositiveFeedbackSubmit(aspects, otherText);
        }}
        onClose={() => setShowPositiveFeedbackModal(false)}
      />

      <FeedbackTypePickerModal
        show={showFeedbackTypePicker}
        onClose={() => setShowFeedbackTypePicker(false)}
        onChooseNotSoMuch={() => {
          setShowFeedbackTypePicker(false);
          setShowFeedbackModal(true);
        }}
        onChooseLovedThis={() => {
          setShowFeedbackTypePicker(false);
          setShowPositiveFeedbackModal(true);
        }}
      />

      <LyricsModal
        show={showLyricsModal}
        title={songStatus.lyricsDraftTitle || currentVariant?.title || "Lyrics"}
        lyricsText={lyricsText}
        isLoadingLyrics={isLoadingLyrics}
        onClose={() => setShowLyricsModal(false)}
      />
      <style jsx>{`
        @keyframes love-pop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          40% {
            transform: scale(1.1);
            opacity: 1;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .love-pop {
          animation: love-pop 700ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
