"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_STORY_PROMPT,
  formatPackagePrice,
  getPackageById,
  OCCASION_STORY_PROMPTS,
} from "@/app/(app)/create/_components/create-page-constants";
import { CreatePageLanguageSection } from "@/app/(app)/create/_components/create-page-language-section";
import { CreatePageLanguageSheet } from "@/app/(app)/create/_components/create-page-language-sheet";
import { CreatePageStoryLyricsSection } from "@/app/(app)/create/_components/create-page-story-lyrics-section";
import { buildCreateSongProcessingUrl } from "@/app/(app)/create-song/_components/step-processing";
import { useCreateSongWizard } from "@/app/(app)/create-song/_components/wizard-context";
import { RecipientDialectConfirm } from "@/app/(app)/create-song/_components/recipient-dialect-confirm";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import { getPaymentErrorMessage } from "@/lib/payments/error-utils";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import { useToast } from "@/hooks/use-toast";
import {
  trackFunnelEvent,
  trackPaymentEvent,
  trackPixelEvent,
} from "@/lib/analytics";
import { getOccasionSuggestions } from "@/lib/occasion-suggestions";
import { SongPickerStrip } from "@/app/(app)/create-song/_components/song-picker-strip";
import { VibePicker } from "@/app/(app)/create-song/_components/vibe-picker";
import {
  normalizePhoneForCashfree,
  validatePhoneNumber,
} from "@/lib/validation";
import type { PaymentOrderResponse, PaymentResponse } from "@/types/payment";
import { paymentOrderAmountInr } from "@/types/payment";

export function StepStory({
  showRecipientNameTransliteration = false,
}: {
  showRecipientNameTransliteration?: boolean;
}) {
  const router = useRouter();
  const { anonymousUserId } = useAnonymousUser();
  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();
  const { toast } = useToast();
  const {
    state,
    isHydrated,
    setStory,
    setLanguages,
    setLanguagePreferences,
    setCustomerMobileNumber,
    setRecipientNameInScript,
    setSelectedTemplateId,
    toggleLanguage,
    toggleMood,
  } = useCreateSongWizard();

  const customSongPackage = getPackageById("package_2");
  const customSongPrice = customSongPackage?.price ?? 0;
  const customSongPriceLabel = formatPackagePrice(customSongPrice);
  const customSongPackageName = customSongPackage?.name ?? "Fully Custom";

  const languageSectionRef = useRef<HTMLDivElement>(null);
  const [storySuggestions, setStorySuggestions] = useState<string[]>([]);
  const [showInspiration, setShowInspiration] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [langSearchText, setLangSearchText] = useState("");
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [musicMode, setMusicMode] = useState<"reference" | "vibe">("reference");
  const [showMobileValidationError, setShowMobileValidationError] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveOccasion = state.occasionLabel;
  const mobileNumberValue = state.customerMobileNumber.trim();
  const mobileValidationError = validatePhoneNumber(mobileNumberValue);
  const mobileFieldError = !mobileNumberValue
    ? "Please enter your mobile number."
    : mobileValidationError;

  useEffect(() => {
    trackFunnelEvent.formStepView(3, "create_song_story");
  }, []);

  useEffect(() => {
    setStorySuggestions(getOccasionSuggestions(state.occasionSlug));
  }, [state.occasionSlug]);

  useEffect(() => {
    setPlaceholderIndex(0);
    setShowInspiration(false);
  }, [effectiveOccasion]);

  useEffect(() => {
    if (!isMobileSheetOpen) return;
    trackFunnelEvent.formStepView(3, "create_song_story_mobile_sheet");
  }, [isMobileSheetOpen]);

  const placeholderText = useMemo(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const placeholders = prompts.placeholders;
    return (
      placeholders[placeholderIndex % placeholders.length] ??
      "Share a memory..."
    );
  }, [effectiveOccasion, placeholderIndex]);

  useEffect(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const count = prompts.placeholders.length;
    if (count <= 1) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % count);
    }, 2500);
    return () => clearInterval(interval);
  }, [effectiveOccasion]);

  const goBack = () => {
    const params = new URLSearchParams({ step: "package" });
    if (state.occasionSlug) {
      params.set("occasion", state.occasionSlug);
    }
    router.replace(`/create-song?${params.toString()}`);
  };

  const removeLanguage = (lang: string) => {
    setLanguages(state.languages.filter((item) => item !== lang));
  };

  const toggleLanguagePreset = (lang: string) => {
    toggleLanguage(lang);
  };

  const validateStoryStep = (): boolean => {
    if (!state.selectedTemplateId) {
      toast({
        variant: "snackbar",
        description: "Please select a song first.",
      });
      router.replace("/create-song");
      return false;
    }

    if (!state.recipientName.trim()) {
      toast({
        variant: "snackbar",
        description: "Recipient name is missing. Please go back and enter it.",
      });
      router.replace("/create-song");
      return false;
    }

    if (!state.story.trim()) {
      toast({
        variant: "snackbar",
        description: "Please add a few details about the special person.",
      });
      return false;
    }

    if (state.languages.length === 0) {
      toast({
        variant: "snackbar",
        description: "Please choose at least one language.",
      });
      return false;
    }

    return true;
  };

  const handleContinueClick = () => {
    if (!validateStoryStep()) return;
    setShowMobileValidationError(false);
    setIsMobileSheetOpen(true);
  };

  const initiateDirectPaymentCheckout = async (songRequestId: number) => {
    const processingUrl = buildCreateSongProcessingUrl(songRequestId);
    const storyReturnUrl = (() => {
      const params = new URLSearchParams({ step: "story" });
      if (state.occasionSlug) {
        params.set("occasion", state.occasionSlug);
      }
      return `/create-song?${params.toString()}`;
    })();

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songRequestId,
        }),
      });

      const orderData: PaymentOrderResponse = await response.json();
      if (!response.ok || !orderData.success) {
        throw new Error("Unable to initialize payment checkout");
      }

      const amountInr = paymentOrderAmountInr(orderData);

      trackPaymentEvent.paymentInitiated(
        songRequestId,
        amountInr,
        orderData.provider || "unknown",
        customSongPackageName,
      );
      trackPixelEvent.initiateCheckout(customSongPackageName, amountInr);

      // So browser back from Cashfree lands on wizard processing (not lyrics review).
      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", processingUrl);
      }

      if (
        orderData.provider === "cashfree" &&
        orderData.providerData?.checkoutUrl
      ) {
        window.location.href = orderData.providerData.checkoutUrl;
        return;
      }

      if (!scriptLoaded || scriptError) {
        throw new Error("Payment checkout is not ready");
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
            // Payment page can verify status on load.
          }
          window.location.replace(processingUrl);
        },
        onCancel: () => {
          trackPaymentEvent.paymentCancelled(songRequestId, amountInr);
          router.push(storyReturnUrl);
        },
        theme: { color: "#EF476F" },
        providerData: orderData.providerData,
      });
    } catch (error) {
      trackPaymentEvent.paymentFailed(
        songRequestId,
        customSongPrice,
        getPaymentErrorMessage(error, "Checkout failed"),
        customSongPackageName,
      );
      throw error;
    }
  };

  const proceedToPaymentWithMobile = async () => {
    if (!validateStoryStep()) return;

    if (!mobileNumberValue) {
      setShowMobileValidationError(false);
      setIsMobileSheetOpen(true);
      return;
    }

    const phoneError = validatePhoneNumber(mobileNumberValue);
    if (phoneError) {
      setShowMobileValidationError(true);
      setIsMobileSheetOpen(true);
      return;
    }

    setShowMobileValidationError(false);
    setIsMobileSheetOpen(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientDetails: state.recipientName.trim(),
          recipientNameInScript:
            state.recipientNameInScript.trim() || undefined,
          recipientNameScriptLang:
            state.recipientNameScriptLang.trim() || undefined,
          occasion: state.occasionSlug ?? state.occasionLabel,
          languages: state.languages.join(" + "),
          story: state.story.trim(),
          lyricsInputMode: "story",
          mood: state.moods,
          languagePreferences: state.languagePreferences.trim(),
          advancedMusicChips: [],
          musicStyleNotes: "",
          mobileNumber: normalizePhoneForCashfree(mobileNumberValue),
          email: "",
          selectedPackage: "package_2",
          nameDropTemplateId: state.selectedTemplateId,
          requestSource: "create_song_wizard",
          userId: null,
          anonymousUserId,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json?.requestId) {
        throw new Error(
          json?.error || json?.message || "Unable to create request",
        );
      }

      trackFunnelEvent.formStepComplete(3, "create_song_story_submit");
      trackFunnelEvent.songRequestSubmit(json.requestId, "package_2");
      queueMySongsNudge(json.requestId, "request_captured");

      await initiateDirectPaymentCheckout(json.requestId);
    } catch (error) {
      toast({
        variant: "snackbar",
        description: getPaymentErrorMessage(
          error,
          "Unable to continue to payment. Please try again.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary-cream font-body text-text-teal">
      <header className="sticky top-0 z-30 border-b border-text-teal/10 bg-secondary-cream/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="text-text-teal transition-opacity hover:opacity-80"
            aria-label="Back to package selection"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <section className="mb-6">
          <h2 className="text-2xl font-bold font-heading text-text-teal">
            Tell us more about{" "}
            <span className="font-bold text-accent-coral capitalize">
              {state.recipientName}
            </span>
          </h2>
          <p className="mt-1 text-sm text-text-teal/60">
            We&apos;ll craft fully custom lyrics inspired by your song pick.
          </p>
        </section>

        <CreatePageStoryLyricsSection
          lyricsInputMode="story"
          onLyricsInputModeChange={() => {}}
          effectiveOccasion={effectiveOccasion}
          story={state.story}
          onStoryChange={setStory}
          inputLyrics=""
          onInputLyricsChange={() => {}}
          placeholderText={placeholderText}
          storySuggestions={storySuggestions}
          showInspiration={showInspiration}
          onShowInspiration={setShowInspiration}
          onRefreshStorySuggestions={() =>
            setStorySuggestions(getOccasionSuggestions(state.occasionSlug))
          }
          onPickSuggestion={(text) => {
            trackFunnelEvent.storySuggestionPick();
            setStory(text);
            setShowInspiration(false);
          }}
          hideModeToggle
          hideFieldLabel
        />

        <CreatePageLanguageSection
          languageSectionRef={languageSectionRef}
          selectedLanguages={state.languages}
          onRemoveLanguage={removeLanguage}
          onToggleLanguagePreset={toggleLanguagePreset}
          onOpenLanguageSheet={() => {
            setLangSearchText("");
            setShowLanguageSheet(true);
          }}
          languagePreferences={state.languagePreferences}
          onLanguagePreferencesChange={setLanguagePreferences}
        />

        {showRecipientNameTransliteration ? (
          <RecipientDialectConfirm
            name={state.recipientName}
            defaultLanguage={state.languages.join(" + ")}
            confirmedValue={state.recipientNameInScript}
            confirmedLanguage={state.recipientNameScriptLang}
            onConfirm={setRecipientNameInScript}
            className="mt-8"
          />
        ) : null}
      </main>

      <div className="mt-auto border-t border-text-teal/10 bg-secondary-cream px-4 pt-4 pb-4">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-4">
            <div className="mb-3 flex rounded-2xl bg-text-teal/5 p-1">
              <button
                type="button"
                onClick={() => {
                  if (musicMode !== "reference") {
                    trackFunnelEvent.musicStyleModeChange("reference");
                  }
                  setMusicMode("reference");
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  musicMode === "reference"
                    ? "bg-white text-text-teal shadow-sm"
                    : "text-text-teal/45 hover:text-text-teal/70"
                }`}
              >
                🎵 Reference song
              </button>
              <button
                type="button"
                onClick={() => {
                  if (musicMode !== "vibe") {
                    trackFunnelEvent.musicStyleModeChange("vibe");
                  }
                  setMusicMode("vibe");
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  musicMode === "vibe"
                    ? "bg-white text-text-teal shadow-sm"
                    : "text-text-teal/45 hover:text-text-teal/70"
                }`}
              >
                🎨 Choose my vibe
              </button>
            </div>

            {musicMode === "reference" ? (
              <SongPickerStrip
                occasionSlug={state.occasionSlug}
                selectedTemplateId={state.selectedTemplateId}
                onSelect={setSelectedTemplateId}
              />
            ) : (
              <VibePicker moods={state.moods} onToggleMood={toggleMood} />
            )}
          </div>
          <button
            type="button"
            onClick={handleContinueClick}
            disabled={isSubmitting || isMobileSheetOpen}
            className="flex h-14 w-full items-center justify-center rounded-full bg-accent-coral text-base font-bold text-white shadow-[0_6px_24px_rgba(239,71,111,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? "Creating request..."
              : `Continue to pay ${customSongPriceLabel}`}
          </button>
        </div>
      </div>

      <CreatePageLanguageSheet
        isOpen={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        langSearchText={langSearchText}
        onLangSearchChange={setLangSearchText}
        selectedLanguages={state.languages}
        onToggleLanguage={toggleLanguagePreset}
        onRemoveLanguage={removeLanguage}
      />

      {isMobileSheetOpen && isHydrated ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-text-teal/40 backdrop-blur-[2px]"
            onClick={() => !isSubmitting && setIsMobileSheetOpen(false)}
            aria-label="Close mobile number sheet"
          />

          <div className="fixed bottom-0 left-0 z-50 flex h-[45dvh] w-full flex-col rounded-t-[32px] border-t border-surface-container-high bg-paper-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            <div className="mx-auto mb-2 mt-4 h-1.5 w-12 rounded-full bg-surface-container-highest" />

            <div className="flex flex-grow flex-col overflow-y-auto px-4 pb-6 pt-2">
              <section className="mb-6">
                <h3 className="text-[12px] mb-4 font-bold uppercase tracking-[0.2em] text-accent-coral">
                  Your Mobile Number
                </h3>
                <input
                  type="tel"
                  autoComplete="tel"
                  name="mobile"
                  value={state.customerMobileNumber}
                  onChange={(event) => {
                    setShowMobileValidationError(false);
                    setCustomerMobileNumber(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    );
                  }}
                  placeholder="ENTER MOBILE NUMBER"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  className="w-full border-0 border-b border-text-teal bg-transparent p-0 pb-2 text-xl font-extrabold uppercase text-text-teal placeholder:font-extrabold placeholder:text-text-teal/20 focus:outline-none focus:ring-0"
                />
                {showMobileValidationError && mobileFieldError ? (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    {mobileFieldError}
                  </p>
                ) : null}
              </section>

              <div className="flex-grow" />

              <button
                type="button"
                onClick={proceedToPaymentWithMobile}
                disabled={isSubmitting}
                className="h-16 w-full rounded-xl bg-primary-yellow text-2xl font-black uppercase italic tracking-tighter text-text-teal transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Creating request..."
                  : `Pay ${customSongPriceLabel}`}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
