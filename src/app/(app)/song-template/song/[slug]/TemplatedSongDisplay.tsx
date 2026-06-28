"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import SongPlayerControls from "@/components/SongPlayerControls";
import { DownloadHeaderActions } from "@/components/DownloadHeaderActions";
import {
  getVariantDownloadAudioUrl,
  isVariantPreparingDownload,
} from "@/lib/utils/variant-utils";
import LyricsModal from "@/components/LyricsModal";
import FeedbackModal from "@/components/FeedbackModal";
import PositiveFeedbackModal from "@/components/PositiveFeedbackModal";
import FeedbackStatusSummary from "@/components/FeedbackStatusSummary";
import FeedbackTypePickerModal from "@/components/FeedbackTypePickerModal";
import { Button } from "@/components/ui/button";
import { trackCTAEvent } from "@/lib/analytics";
import Header from "@/components/Header";

interface TemplatedSongDisplayProps {
  song: any;
  selectedVariantIndex: number;
  totalVariants: number;
  onVariantChange: (index: number) => void;
  feedbackSummary: any;
  submitVariantFeedback: (
    decision: "liked" | "disliked",
    rating?: number,
    extras?: {
      reasons?: string[];
      other_text?: string;
      positive_aspects?: string[];
      positive_other_text?: string;
    },
  ) => Promise<void>;
  feedbackSubmitting: boolean;
}

export default function TemplatedSongDisplay({
  song,
  selectedVariantIndex,
  totalVariants,
  onVariantChange,
  feedbackSummary,
  submitVariantFeedback,
  feedbackSubmitting,
}: TemplatedSongDisplayProps) {
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [showJoyfulAnimation, setShowJoyfulAnimation] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPositiveFeedbackModal, setShowPositiveFeedbackModal] =
    useState(false);
  const [showFeedbackTypePicker, setShowFeedbackTypePicker] = useState(false);
  const [feedbackReasons, setFeedbackReasons] = useState<
    { code: string; label: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const loadReasons = async () => {
      try {
        const res = await fetch("/api/song-feedback/reasons");
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.reasons)) {
          setFeedbackReasons(data.reasons);
        }
      } catch {
        // keep empty; modal still shows "Other" only if API fails
      }
    };
    void loadReasons();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    skipTime,
    seekTo,
    audioRef,
  } = useAudioPlayer({
    audioUrl: song.audioUrl,
    songTitle: song.title,
    songId: song.id,
    songSlug: song.slug,
  });

  const handlePlayPause = () => {
    togglePlay();
  };

  const handleSeek = (time: number) => {
    seekTo(time);
  };

  const handleSkipBackward = () => {
    skipTime(-15);
  };

  const handleSkipForward = () => {
    skipTime(15);
  };

  const handleLoveIt = () => {
    trackCTAEvent.ctaClick(
      "templated_song_love_this_song",
      "song_template_instance",
      "button",
    );
    setShowPositiveFeedbackModal(true);
  };

  const handlePositiveFeedbackSubmit = async (
    aspects: string[],
    otherText: string,
  ) => {
    if (feedbackSubmitting || aspects.length === 0) return;

    trackCTAEvent.formSubmit(
      "templated_song_positive_feedback",
      "feedback_modal",
    );
    await submitVariantFeedback("liked", undefined, {
      positive_aspects: aspects,
      positive_other_text: otherText.trim() || undefined,
    });
    setShowPositiveFeedbackModal(false);
    setShowJoyfulAnimation(true);
    setTimeout(() => {
      setShowJoyfulAnimation(false);
    }, 1000);
  };

  const handleNotSoMuch = () => {
    trackCTAEvent.ctaClick(
      "templated_song_not_so_much",
      "song_template_instance",
      "button",
    );
    setShowFeedbackModal(true);
  };

  const handleOpenFeedbackTypePicker = () => {
    if (feedbackSubmitting) return;
    setShowFeedbackTypePicker(true);
  };

  const handleFeedbackModalSubmit = async (
    reason: string,
    otherText: string,
  ) => {
    if (feedbackSubmitting) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    if (trimmed === "Other" && !otherText.trim()) return;

    trackCTAEvent.formSubmit(
      "templated_song_negative_feedback",
      "feedback_modal",
    );
    await submitVariantFeedback("disliked", undefined, {
      reasons: [trimmed],
      other_text: trimmed === "Other" ? otherText.trim() : undefined,
    });
    setShowFeedbackModal(false);
  };

  const currentVariant =
    song.suno_variants?.[selectedVariantIndex] || song.suno_variants?.[0];
  const imageUrl =
    currentVariant?.sourceImageUrl ||
    currentVariant?.imageUrl ||
    "/images/melodia-logo-transparent.png";
  const title = song.title || currentVariant?.title || "Your Song";
  const variantDownloadTitle = `${title || "song"}-version-${selectedVariantIndex + 1}`;
  const downloadAudioUrl = currentVariant
    ? getVariantDownloadAudioUrl(currentVariant)
    : null;
  const preparingDownload = currentVariant
    ? isVariantPreparingDownload(currentVariant)
    : false;
  const headerDownloadActions = (
    <DownloadHeaderActions
      downloadAudioUrl={downloadAudioUrl}
      songTitle={variantDownloadTitle}
      songId={String(song.id)}
      preparingDownload={preparingDownload}
    />
  );

  const currentVariantEvents = Array.isArray(
    feedbackSummary?.eventsByVariant?.[selectedVariantIndex],
  )
    ? feedbackSummary.eventsByVariant[selectedVariantIndex]
    : [];
  const decisionFromState =
    selectedVariantIndex === 0
      ? feedbackSummary?.state?.variant_0_decision
      : selectedVariantIndex === 1
        ? feedbackSummary?.state?.variant_1_decision
        : null;
  const latestCurrentVariantDecisionEvent =
    currentVariantEvents.find(
      (event: any) =>
        event?.decision === "liked" || event?.decision === "disliked",
    ) ?? null;
  const currentDecision =
    latestCurrentVariantDecisionEvent?.decision ?? decisionFromState ?? null;
  const currentPositiveAspects: string[] =
    latestCurrentVariantDecisionEvent?.positive_aspects ?? [];
  const currentReasonCodes: string[] =
    latestCurrentVariantDecisionEvent?.reason_codes ?? [];
  const reasonCodeToLabel = new Map(
    feedbackReasons.map((reason) => [reason.code, reason.label]),
  );
  const currentReasonLabels = currentReasonCodes.map(
    (code) => reasonCodeToLabel.get(code) || code,
  );

  const variant0Reviewed = !!feedbackSummary?.state?.variant_0_decision;
  const variant1Reviewed = !!feedbackSummary?.state?.variant_1_decision;
  const reviewedVariantsCount =
    Number(variant0Reviewed) + Number(variant1Reviewed);
  const bothVariantsReviewed = !!feedbackSummary?.state?.both_variants_reviewed;

  return (
    <div className="flex flex-col bg-[#FEFBF7] text-[#5C4B52] min-h-screen pb-24 md:pb-0">
      <audio
        ref={audioRef}
        src={song.audioUrl}
        preload="auto"
        playsInline
      />

      <Header
        showCreateSongCTA={false}
        rightActions={headerDownloadActions}
      />

      <main className="flex-grow flex flex-col items-center pt-4 px-6 text-center">
        <div className="flex flex-col w-full max-w-sm justify-center items-center">
          <Image
            src={imageUrl}
            alt="Album Art"
            className="w-[50%] rounded-lg shadow-lg mb-6"
            width={200}
            height={200}
          />

          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-md text-gray-500 mb-6">Melodia</p>

          {totalVariants > 1 && (
            <div className="mb-4 w-full">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: Math.min(totalVariants, 2) }).map(
                  (_, index) => (
                    <Button
                      key={index}
                      onClick={() => onVariantChange(index)}
                      variant="outline"
                      className={`h-10 rounded-full text-sm font-bold shadow-sm ${
                        selectedVariantIndex === index
                          ? "border-[#EF476F] bg-[#EF476F]/10 text-[#EF476F]"
                          : "border-gray-200 bg-white text-text hover:bg-gray-50"
                      }`}
                    >
                      Song Option {index + 1}
                    </Button>
                  ),
                )}
              </div>
            </div>
          )}

          {song.lyrics && (
            <button
              onClick={() => setShowLyricsModal(true)}
              className="text-sm text-[#EF476F] hover:text-[#EF476F]/80 underline mt-2 mb-6 transition-colors"
            >
              View Lyrics
            </button>
          )}

          <SongPlayerControls
            playbackState={{
              isPlaying,
              currentTime,
              duration,
            }}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSkipBackward={handleSkipBackward}
            onSkipForward={handleSkipForward}
          />

          {showJoyfulAnimation && (
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-40">
              <div className="love-pop bg-white/0 rounded-full p-4">
                <Heart
                  className="w-16 h-16 text-[#EF476F] drop-shadow-md"
                  fill="#EF476F"
                />
              </div>
            </div>
          )}

          <div className="w-full mt-2">
            {currentDecision ? (
              <FeedbackStatusSummary
                feedbackStatus={
                  currentDecision === "liked" ? "loved" : "not_liked"
                }
                positiveAspects={currentPositiveAspects}
                reasonLabels={currentReasonLabels}
                onUpdateFeedback={handleOpenFeedbackTypePicker}
                updateDisabled={feedbackSubmitting}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleNotSoMuch}
                  disabled={feedbackSubmitting}
                  variant="secondary"
                  className="h-12 rounded-full border border-gray-200 bg-white text-md font-bold shadow-sm"
                >
                  Not So Much
                </Button>
                <Button
                  onClick={handleLoveIt}
                  disabled={feedbackSubmitting}
                  className="h-12 rounded-full bg-[#EF476F] text-md font-bold text-white shadow-sm hover:bg-[#EF476F]/90"
                >
                  Love This Song!
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <LyricsModal
        show={showLyricsModal}
        title={title}
        lyricsText={song.lyrics}
        isLoadingLyrics={false}
        onClose={() => setShowLyricsModal(false)}
      />

      <FeedbackModal
        show={showFeedbackModal}
        reasons={feedbackReasons}
        onSubmit={(reason, otherText) => {
          void handleFeedbackModalSubmit(reason, otherText);
        }}
        onClose={() => setShowFeedbackModal(false)}
      />

      <PositiveFeedbackModal
        show={showPositiveFeedbackModal}
        isSubmitting={feedbackSubmitting}
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
          handleNotSoMuch();
        }}
        onChooseLovedThis={() => {
          setShowFeedbackTypePicker(false);
          handleLoveIt();
        }}
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
