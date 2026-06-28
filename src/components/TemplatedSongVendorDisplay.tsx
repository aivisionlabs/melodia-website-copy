"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useStreamingPlayback } from "@/hooks/use-streaming-playback";
import SongPlayerControls from "@/components/SongPlayerControls";
import { DownloadHeaderActions } from "@/components/DownloadHeaderActions";
import {
  getVariantDownloadAudioUrl,
  getVariantsList,
  isVariantPreparingDownload,
  normalizeVariantForPlayer,
  type NormalizedPlayerVariant,
} from "@/lib/utils/variant-utils";
import LyricsModal from "@/components/LyricsModal";
import FeedbackModal from "@/components/FeedbackModal";
import PositiveFeedbackModal from "@/components/PositiveFeedbackModal";
import FeedbackStatusSummary from "@/components/FeedbackStatusSummary";
import FeedbackTypePickerModal from "@/components/FeedbackTypePickerModal";
import { Button } from "@/components/ui/button";
import { trackCTAEvent } from "@/lib/analytics";

export interface TemplatedInstanceInfo {
  id: number;
  slug: string;
  status: string | null;
  song_title: string;
  recipient_name: string;
  replaced_lyrics: string | null;
  song_variants: unknown;
}

interface TemplatedSongVendorDisplayProps {
  instance: TemplatedInstanceInfo;
  orderToken?: string;
}

function mapInstanceToSong(
  instance: TemplatedInstanceInfo,
  selectedVariantIndex = 0,
) {
  const rawVariants = getVariantsList(instance.song_variants);
  const variants = rawVariants
    .map(normalizeVariantForPlayer)
    .filter((v): v is NormalizedPlayerVariant => !!v);
  const safeVariantIndex = Math.max(
    0,
    Math.min(selectedVariantIndex, Math.max(variants.length - 1, 0)),
  );
  const selected = variants[safeVariantIndex] ?? variants[0];

  return {
    id: String(instance.id),
    title: instance.recipient_name,
    artist: instance.song_title,
    slug: instance.slug,
    suno_variants: variants,
    lyrics: instance.replaced_lyrics?.trim() || null,
    audioUrl:
      selected?.variantStatus === "DOWNLOAD_READY"
        ? selected?.sourceAudioUrl ||
          selected?.audioUrl ||
          selected?.sourceStreamAudioUrl ||
          selected?.streamAudioUrl ||
          undefined
        : selected?.sourceStreamAudioUrl || selected?.streamAudioUrl || undefined,
    selected_variant: safeVariantIndex,
  };
}

export function TemplatedSongVendorDisplay({
  instance,
  orderToken,
}: TemplatedSongVendorDisplayProps) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [showJoyfulAnimation, setShowJoyfulAnimation] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPositiveFeedbackModal, setShowPositiveFeedbackModal] =
    useState(false);
  const [showFeedbackTypePicker, setShowFeedbackTypePicker] = useState(false);
  const [feedbackReasons, setFeedbackReasons] = useState<
    { code: string; label: string }[]
  >([]);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const song = mapInstanceToSong(instance, variantIndex);
  const totalVariants = song.suno_variants.length;

  const { getPlaybackState, togglePlayback, seekTo: streamSeekTo, updateDuration, cleanup } =
    useStreamingPlayback({});

  const currentVariant = song.suno_variants[variantIndex] ?? song.suno_variants[0];
  const variantId = currentVariant?.id || `variant-${variantIndex}`;
  const playbackState = getPlaybackState(variantId);

  // Sync duration from variant metadata
  useEffect(() => {
    if (currentVariant?.duration && currentVariant.duration > 0) {
      updateDuration(variantId, currentVariant.duration);
    }
  }, [variantId, currentVariant?.duration, updateDuration]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const handlePlayPause = () => {
    const audioUrl = song.audioUrl;
    if (audioUrl) {
      togglePlayback(variantId, audioUrl);
    }
  };

  const handleSeek = (time: number) => {
    streamSeekTo(variantId, time);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(playbackState.currentTime + seconds, playbackState.duration));
    streamSeekTo(variantId, newTime);
  };

  // Load feedback reasons
  useEffect(() => {
    let cancelled = false;
    fetch("/api/song-feedback/reasons")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.reasons)) {
          setFeedbackReasons(data.reasons);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load feedback summary
  const fetchFeedbackSummary = async () => {
    try {
      const url = new URL(
        `/api/templated-songs/instances/${instance.slug}/feedback/summary`,
        window.location.origin,
      );
      if (orderToken) url.searchParams.set("order_token", orderToken);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) setFeedbackSummary(data);
    } catch {}
  };

  useEffect(() => { void fetchFeedbackSummary(); }, [instance.slug]);

  // Track variant listen on change
  const handleVariantChange = async (index: number) => {
    setVariantIndex(index);
    try {
      await fetch(`/api/templated-songs/instances/${instance.slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_index: index,
          event_type: "variant_listened",
          ...(orderToken ? { order_token: orderToken } : {}),
        }),
      });
    } catch {}
  };

  const submitVariantFeedback = async (
    decision: "liked" | "disliked",
    rating?: number,
    extras?: {
      reasons?: string[];
      other_text?: string;
      positive_aspects?: string[];
      positive_other_text?: string;
    },
  ) => {
    setFeedbackSubmitting(true);
    try {
      await fetch(`/api/templated-songs/instances/${instance.slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_index: variantIndex,
          event_type: rating !== undefined ? "variant_rated" : "variant_decision",
          decision,
          rating,
          ...extras,
          ...(orderToken ? { order_token: orderToken } : {}),
        }),
      });
      await fetchFeedbackSummary();
    } catch {} finally {
      setFeedbackSubmitting(false);
    }
  };

  const imageUrl =
    currentVariant?.sourceImageUrl ||
    currentVariant?.imageUrl ||
    "/images/melodia-logo-transparent.png";
  const title = song.title || currentVariant?.title || "Your Song";
  const variantDownloadTitle = `${title}-version-${variantIndex + 1}`;
  const downloadAudioUrl = currentVariant
    ? getVariantDownloadAudioUrl(currentVariant)
    : null;
  const preparingDownload = currentVariant
    ? isVariantPreparingDownload(currentVariant)
    : false;

  // Feedback state derivation
  const currentVariantEvents = Array.isArray(
    feedbackSummary?.eventsByVariant?.[variantIndex],
  )
    ? feedbackSummary.eventsByVariant[variantIndex]
    : [];
  const decisionFromState =
    variantIndex === 0
      ? feedbackSummary?.state?.variant_0_decision
      : variantIndex === 1
        ? feedbackSummary?.state?.variant_1_decision
        : null;
  const latestDecisionEvent = currentVariantEvents.find(
    (e: any) => e?.decision === "liked" || e?.decision === "disliked",
  ) ?? null;
  const currentDecision =
    latestDecisionEvent?.decision ?? decisionFromState ?? null;
  const currentPositiveAspects: string[] =
    latestDecisionEvent?.positive_aspects ?? [];
  const currentReasonCodes: string[] =
    latestDecisionEvent?.reason_codes ?? [];
  const reasonCodeToLabel = new Map(
    feedbackReasons.map((r) => [r.code, r.label]),
  );
  const currentReasonLabels = currentReasonCodes.map(
    (code) => reasonCodeToLabel.get(code) || code,
  );

  return (
    <div className="flex flex-col pb-24 md:pb-0">
      {/* Download actions row */}
      <div className="flex items-center justify-end mb-4">
        <DownloadHeaderActions
          downloadAudioUrl={downloadAudioUrl}
          songTitle={variantDownloadTitle}
          songId={song.id}
          preparingDownload={preparingDownload}
        />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="flex flex-col w-full max-w-sm justify-center items-center">
          <Image
            src={imageUrl}
            alt="Album Art"
            className="w-[50%] rounded-lg shadow-lg mb-6"
            width={200}
            height={200}
          />

          <h2 className="text-2xl font-bold text-text-teal">{title}</h2>
          <p className="text-md text-gray-500 mb-6">{song.artist}</p>

          {/* Variant picker tabs */}
          {totalVariants > 1 && (
            <div className="mb-4 w-full">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: Math.min(totalVariants, 2) }).map(
                  (_, index) => (
                    <Button
                      key={index}
                      onClick={() => handleVariantChange(index)}
                      variant="outline"
                      className={`h-10 rounded-full text-sm font-bold shadow-sm ${
                        variantIndex === index
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
              isPlaying: playbackState.isPlaying,
              currentTime: playbackState.currentTime,
              duration: playbackState.duration,
            }}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSkipBackward={() => handleSkip(-15)}
            onSkipForward={() => handleSkip(15)}
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
                feedbackStatus={currentDecision === "liked" ? "loved" : "not_liked"}
                positiveAspects={currentPositiveAspects}
                reasonLabels={currentReasonLabels}
                onUpdateFeedback={() => {
                  if (!feedbackSubmitting) setShowFeedbackTypePicker(true);
                }}
                updateDisabled={feedbackSubmitting}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    trackCTAEvent.ctaClick("vendor_template_song_not_so_much", "vendor_template_instance", "button");
                    setShowFeedbackModal(true);
                  }}
                  disabled={feedbackSubmitting}
                  variant="secondary"
                  className="h-12 rounded-full border border-gray-200 bg-white text-md font-bold shadow-sm"
                >
                  Not So Much
                </Button>
                <Button
                  onClick={() => {
                    trackCTAEvent.ctaClick("vendor_template_song_love_it", "vendor_template_instance", "button");
                    setShowPositiveFeedbackModal(true);
                  }}
                  disabled={feedbackSubmitting}
                  className="h-12 rounded-full bg-[#EF476F] text-md font-bold text-white shadow-sm hover:bg-[#EF476F]/90"
                >
                  Love This Song!
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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
          const trimmed = reason.trim();
          if (!trimmed) return;
          if (trimmed === "Other" && !otherText.trim()) return;
          trackCTAEvent.formSubmit("vendor_template_song_negative_feedback", "feedback_modal");
          void submitVariantFeedback("disliked", undefined, {
            reasons: [trimmed],
            other_text: trimmed === "Other" ? otherText.trim() : undefined,
          });
          setShowFeedbackModal(false);
        }}
        onClose={() => setShowFeedbackModal(false)}
      />

      <PositiveFeedbackModal
        show={showPositiveFeedbackModal}
        isSubmitting={feedbackSubmitting}
        onSubmit={(aspects, otherText) => {
          if (aspects.length === 0) return;
          trackCTAEvent.formSubmit("vendor_template_song_positive_feedback", "feedback_modal");
          void submitVariantFeedback("liked", undefined, {
            positive_aspects: aspects,
            positive_other_text: otherText.trim() || undefined,
          });
          setShowPositiveFeedbackModal(false);
          setShowJoyfulAnimation(true);
          setTimeout(() => setShowJoyfulAnimation(false), 1000);
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

      <style jsx>{`
        @keyframes love-pop {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.1); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .love-pop { animation: love-pop 700ms ease-out forwards; }
      `}</style>
    </div>
  );
}
