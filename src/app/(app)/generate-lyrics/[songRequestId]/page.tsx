"use client";

import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import { useToastHelpers } from "@/hooks/use-toast";
import { trackFunnelEvent, trackPaymentEvent } from "@/lib/analytics";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import { getPaymentErrorLogDetails } from "@/lib/payments/error-utils";
import type { PaymentOrderResponse, PaymentResponse } from "@/types/payment";
import { paymentOrderAmountInr } from "@/types/payment";
import {
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  Music,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLyricsGeneration } from "@/hooks/useLyricsGeneration";
import { useLyricsData } from "@/hooks/useLyricsData";
import { useLyricsVersions } from "@/hooks/useLyricsVersions";
import MusicStyleDisplay from "@/components/lyrics/MusicStyleDisplay";
import ApprovalConfirmDialog from "@/components/lyrics/ApprovalConfirmDialog";
import { SongLoadingSkeleton } from "@/components/SongLoadingSkeleton";
import { MIN_CUSTOM_LYRICS_LENGTH } from "@/lib/constants/lyrics";
import { CreatePageSteps } from "@/app/(app)/create/_components/create-page-steps";

interface PageProps {
  params: Promise<{ songRequestId: string }>;
}

type RequestLyricsInputMode = "story" | "lyrics";

export default function GenerateLyricsPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { songRequestId: songRequestIdParam } = resolvedParams;
  const toast = useToastHelpers();
  const songRequestId = parseInt(songRequestIdParam, 10);
  const isValidId = !isNaN(songRequestId) && songRequestId > 0;

  // UI State
  const [editedLyrics, setEditedLyrics] = useState("");
  const [lyricsModified, setLyricsModified] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const hasAutoStartedRef = useRef(false);
  const skipLyricsForConciergeRef = useRef(false);
  const [requestLyricsInputMode, setRequestLyricsInputMode] =
    useState<RequestLyricsInputMode | null>(null);
  const [requestInputLyrics, setRequestInputLyrics] = useState("");
  const [requestMetaLoading, setRequestMetaLoading] = useState(true);
  /** True once payment is captured — drives post-payment progress + CTA wording. */
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  /** Package price (INR) for direct checkout after lyrics approval (599 flow) */
  const [packagePriceForCheckout, setPackagePriceForCheckout] = useState<
    number | null
  >(null);
  const [checkoutPackageName, setCheckoutPackageName] =
    useState("Personalized Song");
  /** From song request — shown when draft has no generated music_style yet */
  const [requestMusicStyleChips, setRequestMusicStyleChips] = useState<
    string[] | null
  >(null);
  const [requestMusicStyleNotes, setRequestMusicStyleNotes] = useState<
    string | null
  >(null);
  const [requestLanguages, setRequestLanguages] = useState<string | null>(null);
  const [requestSource, setRequestSource] = useState<string | null>(null);
  const [namedropTemplateId, setNamedropTemplateId] = useState<number | null>(
    null,
  );
  const [musicStyleSectionOpen, setMusicStyleSectionOpen] = useState(false);

  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();

  // Hooks
  const lyricsData = useLyricsData({
    songRequestId: isValidId ? songRequestId : 0,
    enabled: isValidId,
  });

  const versions = useLyricsVersions({
    songRequestId: isValidId ? songRequestId : 0,
    enabled: isValidId && !!lyricsData.lyricsDraftId,
  });

  const generation = useLyricsGeneration({
    songRequestId: isValidId ? songRequestId : 0,
    onSuccess: (data) => {
      lyricsData.setLyrics(data.lyrics);
      lyricsData.setTitle(data.title);
      lyricsData.setLyricsDraftId(data.lyricsDraftId);
      lyricsData.setLyricsStatus(data.status);
      if (typeof data.isCustomLyrics === "boolean") {
        lyricsData.setIsCustomLyrics(data.isCustomLyrics);
      }
      if (data.musicStyle !== undefined) {
        lyricsData.setMusicStyle(data.musicStyle || null);
      }
      if (data.version) {
        lyricsData.setCurrentVersion(data.version);
      }
      versions.setSelectedVersionId(data.lyricsDraftId);
      versions.refreshTabs();
      versions.checkVersionsCount();
      lyricsData.refreshEditsRemaining();
    },
  });

  /**
   * Routes after lyrics approval based on what `approveLyricsAction` returns:
   * - Pay-first /create flow: payment already exists → server creates the song and
   *   returns `/song-options/...`; we navigate straight there.
   * - Legacy pre-payment flow: returns `/payment?requestId=...` → open Cashfree/Razorpay
   *   immediately; cancel or browser back → `/payment` (returnUrl) with full review.
   */
  const proceedToPaymentAfterApproval = useCallback(
    async (redirectTo: string) => {
      // Pay-first flow: payment already captured, the server created the song and
      // returned /song-options. Use a *hard* navigation so the page — and the payment
      // SDK's cross-origin iframe loaded by usePaymentCheckout — is fully torn down.
      // A client-side router transition can trip a cross-origin SecurityError when
      // React unmounts while that iframe is present.
      if (paymentCompleted || redirectTo.includes("/song-options")) {
        window.location.assign(redirectTo);
        return;
      }

      const paymentMatch = redirectTo.match(/\/payment\?requestId=(\d+)/);
      if (!paymentMatch) {
        router.push(redirectTo);
        return;
      }

      const reqId = parseInt(paymentMatch[1], 10);
      const pkgNameForTrack = checkoutPackageName;

      if (!scriptLoaded || scriptError) {
        router.push(`/payment?requestId=${reqId}`);
        return;
      }

      try {
        const response = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songRequestId: reqId,
          }),
        });

        const orderData: PaymentOrderResponse = await response.json();

        if (!response.ok || !orderData.success) {
          router.push(`/payment?requestId=${reqId}`);
          return;
        }

        const price = paymentOrderAmountInr(orderData);

        trackPaymentEvent.paymentInitiated(
          reqId,
          price,
          orderData.provider || "unknown",
          pkgNameForTrack,
        );

        if (typeof window !== "undefined") {
          window.history.replaceState(
            window.history.state,
            "",
            `/payment?requestId=${reqId}`,
          );
        }

        openCheckout({
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          orderId: orderData.orderId,
          name: "Melodia",
          description: "Personalized Song Generation",
          handler: async (paymentResponse: PaymentResponse) => {
            try {
              await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  payment_id: paymentResponse.paymentId,
                  order_id: paymentResponse.orderId,
                  signature: paymentResponse.signature,
                }),
              });
            } catch {
              // payment page can verify on load
            }
            window.location.replace(`/payment?requestId=${reqId}`);
          },
          onCancel: () => {
            trackPaymentEvent.paymentCancelled(reqId, price);
            router.push(`/payment?requestId=${reqId}`);
          },
          theme: { color: "#EF476F" },
          providerData: orderData.providerData,
        });
      } catch (e) {
        console.error(
          "Direct checkout after lyrics approval:",
          getPaymentErrorLogDetails(e, "Direct checkout failed"),
        );
        router.push(`/payment?requestId=${reqId}`);
      }
    },
    [
      router,
      scriptLoaded,
      scriptError,
      openCheckout,
      checkoutPackageName,
      paymentCompleted,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const loadRequestMeta = async () => {
      if (!isValidId) {
        setRequestMetaLoading(false);
        return;
      }
      try {
        setRequestMetaLoading(true);
        const res = await fetch(`/api/song-requests/${songRequestId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch request metadata");
        }
        const data = await res.json();
        if (cancelled) return;

        const existingSong = data?.data?.song;
        if (
          existingSong?.id &&
          existingSong.status !== "failed" &&
          existingSong.status !== "cancelled"
        ) {
          router.replace("/my-songs");
          return;
        }

        const songRequest = data?.data?.songRequest;
        if (songRequest?.package?.expert_created === true) {
          skipLyricsForConciergeRef.current = true;
          router.replace(`/payment?requestId=${songRequestId}`);
          return;
        }
        const pkg = songRequest?.package;
        if (pkg?.price != null) {
          const price =
            typeof pkg.price === "string"
              ? parseFloat(pkg.price)
              : Number(pkg.price);
          if (Number.isFinite(price)) setPackagePriceForCheckout(price);
        }
        if (pkg?.name) setCheckoutPackageName(pkg.name);

        const mode: RequestLyricsInputMode =
          songRequest?.lyricsInputMode === "lyrics" ? "lyrics" : "story";
        setRequestLyricsInputMode(mode);
        setRequestInputLyrics(songRequest?.inputLyrics || "");
        const chips = songRequest?.musicStyleChips;
        setRequestMusicStyleChips(Array.isArray(chips) ? chips : null);
        setRequestMusicStyleNotes(songRequest?.musicStyleNotes ?? null);
        setRequestLanguages(songRequest?.languages ?? null);
        setRequestSource(songRequest?.requestSource ?? null);
        setNamedropTemplateId(songRequest?.namedropTemplateId ?? null);
      } catch {
        if (cancelled) return;
        setRequestLyricsInputMode("story");
        setRequestInputLyrics("");
        setRequestMusicStyleChips(null);
        setRequestMusicStyleNotes(null);
        setRequestLanguages(null);
        setRequestSource(null);
        setNamedropTemplateId(null);
      } finally {
        if (!cancelled) {
          setRequestMetaLoading(false);
        }
      }
    };
    loadRequestMeta();
    return () => {
      cancelled = true;
    };
  }, [isValidId, songRequestId, router]);

  // Detect whether payment is already captured (new pay-first /create flow lands here
  // post-payment; the legacy /create-song-request flow lands here pre-payment).
  useEffect(() => {
    if (!isValidId) return;
    let cancelled = false;
    fetch(`/api/payments/check-status?requestId=${songRequestId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success && j.data?.payment?.status === "completed") {
          setPaymentCompleted(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isValidId, songRequestId]);

  // Sync textarea when lyrics update from AI (only when viewing current draft)
  useEffect(() => {
    if (
      lyricsData.lyrics &&
      versions.selectedVersionId === lyricsData.lyricsDraftId
    ) {
      setEditedLyrics(lyricsData.lyrics);
      setLyricsModified(false);
    }
  }, [lyricsData.lyrics, lyricsData.lyricsDraftId, versions.selectedVersionId]);

  // When user selects a different revision tab, show that version's lyrics
  useEffect(() => {
    if (
      versions.selectedVersionId != null &&
      versions.selectedVersionId !== lyricsData.lyricsDraftId &&
      versions.versions.length > 0
    ) {
      const v = versions.versions.find(
        (x) => x.id === versions.selectedVersionId,
      );
      if (v) {
        const text = v.customerLyrics ?? v.modelReadyLyrics ?? "";
        setEditedLyrics(text);
        setLyricsModified(false);
      }
    }
  }, [versions.selectedVersionId, versions.versions, lyricsData.lyricsDraftId]);

  // No auto-resize — textarea uses flex-fill with internal scroll to avoid scroll-jump on edit

  // Auto-start lyrics generation — runs once after initial data fetch completes
  useEffect(() => {
    if (
      !isValidId ||
      skipLyricsForConciergeRef.current ||
      lyricsData.isLoading ||
      requestMetaLoading ||
      lyricsData.lyrics ||
      lyricsData.lyricsDraftId ||
      hasAutoStartedRef.current
    )
      return;

    hasAutoStartedRef.current = true;
    // Do NOT reset ref on error — prevents infinite retry loop
    if (
      requestLyricsInputMode === "lyrics" &&
      requestInputLyrics.trim().length >= MIN_CUSTOM_LYRICS_LENGTH
    ) {
      generation.processCustomLyrics(requestInputLyrics.trim()).catch(() => {});
    } else {
      generation.generateLyrics().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isValidId,
    lyricsData.isLoading,
    requestMetaLoading,
    requestLyricsInputMode,
    requestInputLyrics,
    lyricsData.lyrics,
    lyricsData.lyricsDraftId,
  ]);

  const handleUpdateMusicStyle = async (
    lyricsDraftId: number,
    musicStyle: string,
  ) => {
    const savedStyle = await generation.updateMusicStyle(
      lyricsDraftId,
      musicStyle,
    );
    if (savedStyle) lyricsData.setMusicStyle(savedStyle);
    return savedStyle;
  };

  const handleGenerateLyrics = async () => {
    if (!isValidId) return;
    try {
      await generation.generateLyrics();
      lyricsData.refreshEditsRemaining();
    } catch (err) {
      console.error("Error generating lyrics", {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
      });
    }
  };

  const handleAISubmit = async () => {
    if (
      !aiPrompt.trim() ||
      !lyricsData.lyricsDraftId ||
      lyricsData.editsRemaining <= 0
    )
      return;
    try {
      await generation.refineLyrics(lyricsData.lyricsDraftId, aiPrompt);
      setAiPrompt("");
      lyricsData.refreshEditsRemaining();
    } catch (err) {
      console.error("Error in AI edit", {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
      });
    }
  };

  const handleApproveLyrics = async () => {
    if (!lyricsData.lyricsDraftId) return;
    setIsApproving(true);
    generation.setError("");
    try {
      const response = await fetch("/api/approve-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyricsDraftId: lyricsData.lyricsDraftId,
          songRequestId,
          selectedLyricsDraftId:
            versions.selectedVersionId || lyricsData.lyricsDraftId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Failed to approve lyrics");
      trackFunnelEvent.lyricsApproved(songRequestId, lyricsData.currentVersion);
      if (data.redirectTo) await proceedToPaymentAfterApproval(data.redirectTo);
      else throw new Error("Could not determine next step after approval.");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to approve lyrics";
      generation.setError(errorMsg);
      toast.error("Approval Failed", errorMsg);
    } finally {
      setIsApproving(false);
      setShowConfirmDialog(false);
    }
  };

  const handleContinue = async () => {
    if (!lyricsData.lyricsDraftId) return;
    setIsApproving(true);
    generation.setError("");
    try {
      const response = await fetch("/api/approve-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyricsDraftId: lyricsData.lyricsDraftId,
          songRequestId,
          selectedLyricsDraftId:
            versions.selectedVersionId || lyricsData.lyricsDraftId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Failed to continue");
      if (data.redirectTo) await proceedToPaymentAfterApproval(data.redirectTo);
      else throw new Error("Could not determine next step.");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to continue";
      generation.setError(errorMsg);
      toast.error("Failed", errorMsg);
    } finally {
      setIsApproving(false);
    }
  };

  // Save manually edited lyrics (as customer_lyrics) then immediately approve.
  // In the two-phase architecture, we save edits directly; model_ready_lyrics is
  // crafted at approval time by the audio-model crafter inside approve-lyrics.
  const handleProcessAndApprove = async () => {
    if (!editedLyrics.trim() || !lyricsData.lyricsDraftId) return;
    setIsApproving(true);
    try {
      const result = await generation.saveEdits(
        lyricsData.lyricsDraftId,
        editedLyrics,
      );
      if (!result) {
        setIsApproving(false);
        return;
      }
      const response = await fetch("/api/approve-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyricsDraftId: result.lyricsDraftId,
          songRequestId,
          selectedLyricsDraftId: result.lyricsDraftId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Failed to approve");
      trackFunnelEvent.lyricsApproved(songRequestId, lyricsData.currentVersion);
      if (data.redirectTo) await proceedToPaymentAfterApproval(data.redirectTo);
    } catch (err: any) {
      const msg = err.message || "Failed to save and approve lyrics";
      generation.setError(msg);
      toast.error("Failed", msg);
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveOrContinue = async () => {
    if (!editedLyrics && !lyricsData.lyricsDraftId) return;

    if (lyricsData.lyricsStatus === "approved" || lyricsData.isCustomLyrics) {
      await handleContinue();
      return;
    }

    if (lyricsModified) {
      await handleProcessAndApprove();
      return;
    }

    await handleApproveLyrics();
  };

  const isNameDropRequest =
    requestLanguages === "NameDrop" ||
    requestSource === "namedrop_template" ||
    namedropTemplateId != null;

  const selectedLyricsVersion = useMemo(() => {
    if (versions.selectedVersionId == null) return null;
    return (
      versions.versions.find((v) => v.id === versions.selectedVersionId) ?? null
    );
  }, [versions.selectedVersionId, versions.versions]);

  const displayMusicStyle = useMemo(() => {
    const raw =
      selectedLyricsVersion?.musicStyle ?? lyricsData.musicStyle ?? null;
    if (raw == null) return null;
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }, [selectedLyricsVersion?.musicStyle, lyricsData.musicStyle]);

  const styleDraftIdForMusicUi =
    versions.selectedVersionId ?? lyricsData.lyricsDraftId ?? null;

  const showRequestMusicStyleFallback =
    !isNameDropRequest &&
    !displayMusicStyle &&
    (Boolean(requestMusicStyleChips?.length) ||
      Boolean(requestMusicStyleNotes?.trim()));

  /** Fetch done, no draft yet, auto-start effect has not run — avoid "No lyrics yet" flash before isGenerating */
  const awaitingInitialAutoGeneration =
    !lyricsData.lyrics?.trim() &&
    !lyricsData.lyricsDraftId &&
    !hasAutoStartedRef.current &&
    !generation.error &&
    !lyricsData.error;

  // Loading screen for all async operations
  if (
    generation.isGenerating ||
    generation.isRefining ||
    generation.isProcessingCustom ||
    lyricsData.isLoading ||
    requestMetaLoading ||
    awaitingInitialAutoGeneration
  ) {
    return (
      <SongCreationLoadingScreen
        duration={60}
        stage="lyrics"
        title={
          generation.isGenerating
            ? "Producing your lyrics"
            : generation.isRefining
              ? "Refining your lyrics"
              : "Processing your lyrics"
        }
        message={
          generation.isGenerating
            ? "Your masterpiece needs perfect lyrics. We are working on it."
            : generation.isRefining
              ? "We are working our magic on your lyrics. Hang tight!"
              : "We are processing your lyrics, hang tight!"
        }
      />
    );
  }

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-secondary-cream text-text-teal flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-sm">
          <h1 className="text-xl font-bold font-heading text-text-teal mb-3">
            Something went wrong
          </h1>
          <p className="text-sm text-text-teal/60">
            Invalid song request ID: {songRequestIdParam}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-accent-coral font-semibold text-sm hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const lyricsAlreadyApproved =
    lyricsData.lyricsStatus === "approved" || lyricsData.isCustomLyrics;
  const ctaLabel = paymentCompleted
    ? lyricsAlreadyApproved
      ? "Create My Song"
      : "Approve & Create Song"
    : lyricsAlreadyApproved
      ? "Continue to Payment"
      : "Approve & Pay";

  return (
    <div className="h-svh bg-secondary-cream text-text-teal flex flex-col font-body overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-secondary-cream border-b border-gray-100 z-30">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-text-teal/55 hover:text-text-teal transition-colors active:scale-95 flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Progress steps */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <CreatePageSteps
              variant="nav"
              steps={
                paymentCompleted
                  ? [
                      { num: "1", label: "Share Details", completed: true },
                      { num: "2", label: "Pay", completed: true },
                      { num: "3", label: "Review Lyrics", active: true },
                    ]
                  : [
                      { num: "1", label: "Share Details", completed: true },
                      { num: "2", label: "Review Lyrics", active: true },
                      { num: "3", label: "Pay & Download" },
                    ]
              }
            />
          </div>

          <div className="w-14 flex-shrink-0" />
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        className="flex-1 min-h-0 flex flex-col px-4 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
          gap: "10px",
        }}
      >
        {/* Error */}
        {generation.error && (
          <div className="flex-shrink-0 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm font-medium">
              {generation.error}
            </p>
          </div>
        )}

        {/* Music style — collapsed by default */}
        {((displayMusicStyle && styleDraftIdForMusicUi) ||
          showRequestMusicStyleFallback) && (
          <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setMusicStyleSectionOpen((o) => !o)}
              aria-expanded={musicStyleSectionOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:bg-gray-50/80 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary-yellow/20 flex items-center justify-center flex-shrink-0">
                  <Music className="w-3 h-3 text-text-teal" aria-hidden />
                </div>
                <span className="text-[10px] font-bold text-text-teal/40 uppercase tracking-widest">
                  Music style
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-text-teal/45 flex-shrink-0 transition-transform duration-200 ${musicStyleSectionOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {musicStyleSectionOpen && (
              <div className="border-t border-gray-100">
                {displayMusicStyle && styleDraftIdForMusicUi ? (
                  <MusicStyleDisplay
                    musicStyle={displayMusicStyle}
                    lyricsDraftId={styleDraftIdForMusicUi}
                    onUpdate={handleUpdateMusicStyle}
                    isUpdating={generation.isUpdatingStyle}
                    hideHeader
                    className="rounded-t-none rounded-b-2xl border-0 shadow-none"
                  />
                ) : (
                  <div className="px-4 pb-3 pt-1">
                    {requestMusicStyleChips &&
                      requestMusicStyleChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {requestMusicStyleChips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full bg-text-teal/10 px-2.5 py-0.5 text-xs font-medium text-text-teal"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    {requestMusicStyleNotes?.trim() ? (
                      <p className="text-[13px] text-text-teal/70 leading-relaxed">
                        {requestMusicStyleNotes.trim()}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Revision tabs — show when there are multiple versions */}
        {versions.hasVersions && versions.versions.length > 1 && (
          <div className="flex-shrink-0 border-b border-gray-100 overflow-x-auto no-scrollbar -mx-1 px-1">
            <nav
              className="flex gap-1 min-w-max py-1"
              aria-label="Revision tabs"
            >
              {versions.versions.map((v) => {
                const isActive = versions.selectedVersionId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => versions.setSelectedVersionId(v.id)}
                    className={`
                      relative whitespace-nowrap py-2.5 px-3 rounded-xl text-sm font-medium transition-colors
                      ${isActive ? "bg-accent-coral/15 text-accent-coral" : "text-text-teal/60 hover:text-text-teal hover:bg-gray-100"}
                    `}
                  >
                    Revision {v.version}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Lyrics card */}
        {editedLyrics ? (
          <>
            <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
              {/* Divider */}
              <div className="flex-shrink-0 mx-5 mt-4 border-t border-gray-50" />

              {/* Textarea — scrolls internally */}
              <textarea
                value={editedLyrics}
                onChange={(e) => {
                  setEditedLyrics(e.target.value);
                  setLyricsModified(true);
                }}
                className="flex-1 min-h-0 w-full px-6 pt-4 pb-12 text-[13.5px] text-text-teal leading-[1.9] bg-transparent border-none outline-none resize-none font-body overflow-y-auto"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />

              {/* Bottom fade */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent rounded-b-3xl" />
            </div>

            {/* AI edit bar */}
            <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Label row */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="w-5 h-5 rounded-full bg-accent-coral/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-2.5 h-2.5 text-accent-coral"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-text-teal/40 uppercase tracking-widest">
                  AI Edit{" "}
                  {lyricsData.editsRemaining > 0
                    ? `· ${lyricsData.editsRemaining} left`
                    : "· No edits left"}
                </span>
              </div>
              {/* Input row */}
              <div className="flex items-center gap-2.5 px-4 pb-3">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    lyricsData.editsRemaining > 0
                      ? "e.g. make it shorter, change Priya to Sneha..."
                      : "No AI edits remaining"
                  }
                  disabled={lyricsData.editsRemaining <= 0}
                  className="flex-1 text-sm bg-transparent outline-none text-text-teal placeholder:text-text-teal/40 font-body min-w-0 disabled:opacity-50 disabled:cursor-not-allowed py-1"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      aiPrompt.trim() &&
                      lyricsData.lyricsDraftId &&
                      lyricsData.editsRemaining > 0
                    ) {
                      handleAISubmit();
                    }
                  }}
                />
                <button
                  onClick={handleAISubmit}
                  disabled={
                    !aiPrompt.trim() ||
                    !lyricsData.lyricsDraftId ||
                    lyricsData.editsRemaining <= 0
                  }
                  className="w-8 h-8 rounded-full bg-accent-coral flex items-center justify-center flex-shrink-0 disabled:opacity-25 active:scale-90 transition-transform"
                  style={{
                    boxShadow: aiPrompt.trim()
                      ? "0 4px 12px rgba(239,71,111,0.35)"
                      : "none",
                  }}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4">
            <p className="text-text-teal/40 text-sm">No lyrics yet</p>
            <button
              onClick={handleGenerateLyrics}
              className="px-6 py-3 bg-accent-coral text-white rounded-full font-bold text-sm"
            >
              Generate Lyrics
            </button>
          </div>
        )}
      </div>

      {/* ── Fixed bottom CTA ── */}
      {(editedLyrics || lyricsData.lyricsDraftId) && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[48] bg-secondary-cream/95 backdrop-blur-sm border-t border-gray-100 px-5 pt-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          <button
            onClick={handleApproveOrContinue}
            disabled={isApproving || !editedLyrics || !!aiPrompt.trim()}
            className="w-full h-14 bg-accent-coral rounded-full font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.40)" }}
          >
            {isApproving ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-white">Processing...</span>
              </>
            ) : (
              <>
                <span className="text-white">{ctaLabel}</span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ApprovalConfirmDialog
        isOpen={showConfirmDialog}
        isApproving={isApproving}
        onConfirm={handleApproveLyrics}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
