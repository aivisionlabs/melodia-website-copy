"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FathersDayWizardProvider,
  useFathersDayWizard,
} from "./fathers-day-wizard-context";
import { StepCallSign } from "./step-call-sign";
import { StepSoundboard } from "./step-soundboard";
import { StepRoutine } from "./step-routine";
import { StepLegacy } from "./step-legacy";
import { StepLanguage } from "./step-language";
import { buildFathersDayStory } from "./build-story";
import { buildCreateSongProcessingUrl } from "@/app/(app)/create-song/_components/step-processing";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import { useToast } from "@/hooks/use-toast";
import { trackFunnelEvent, trackPaymentEvent, trackPixelEvent } from "@/lib/analytics";
import { formatPackagePrice, getPackageById } from "@/app/(app)/create/_components/create-page-constants";
import { getPaymentErrorMessage } from "@/lib/payments/error-utils";
import { normalizePhoneForCashfree, validatePhoneNumber } from "@/lib/validation";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import type { PaymentOrderResponse, PaymentResponse } from "@/types/payment";
import { paymentOrderAmountInr } from "@/types/payment";

function FathersDayWizardInner() {
  const router = useRouter();
  const { state, isHydrated, setCustomerMobileNumber } = useFathersDayWizard();
  const { anonymousUserId } = useAnonymousUser();
  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [showMobileValidationError, setShowMobileValidationError] = useState(false);

  const customSongPackage = getPackageById("package_2");
  const customSongPrice = customSongPackage?.price ?? 0;
  const customSongPriceLabel = formatPackagePrice(customSongPrice);
  const customSongPackageName = customSongPackage?.name ?? "Fully Custom";

  const mobileNumberValue = state.customerMobileNumber.trim();
  const mobileValidationError = validatePhoneNumber(mobileNumberValue);
  const mobileFieldError = !mobileNumberValue
    ? "Please enter your mobile number."
    : mobileValidationError;

  const initiatePaymentCheckout = async (songRequestId: number) => {
    const processingUrl = buildCreateSongProcessingUrl(songRequestId);
    const returnUrl = "/create-song/fathers-day";

    const response = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songRequestId }),
    });

    const orderData: PaymentOrderResponse = await response.json();
    if (!response.ok || !orderData.success) {
      throw new Error("Unable to initialize payment checkout");
    }

    const amountInr = paymentOrderAmountInr(orderData);
    trackPaymentEvent.paymentInitiated(songRequestId, amountInr, orderData.provider || "unknown", customSongPackageName);
    trackPixelEvent.initiateCheckout(customSongPackageName, amountInr);

    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", processingUrl);
    }

    if (orderData.provider === "cashfree" && orderData.providerData?.checkoutUrl) {
      window.location.href = orderData.providerData.checkoutUrl;
      return;
    }

    if (!scriptLoaded || scriptError) throw new Error("Payment checkout is not ready");

    openCheckout({
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      orderId: orderData.orderId,
      name: "Melodia",
      description: "Father's Day Custom Song",
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
          // Processing page verifies on load.
        }
        window.location.replace(processingUrl);
      },
      onCancel: () => {
        trackPaymentEvent.paymentCancelled(songRequestId, amountInr);
        router.push(returnUrl);
      },
      theme: { color: "#EF476F" },
      providerData: orderData.providerData,
    });
  };

  const proceedToPaymentWithMobile = async () => {
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
      const story = buildFathersDayStory({
        title: state.title,
        musicalVibe: state.musicalVibe,
        superpower: state.superpower,
        catchphrase: state.catchphrase,
        hometown: state.hometown,
        currentCity: state.currentCity,
      });

      const response = await fetch("/api/create-song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientDetails: state.title,
          occasion: "fathers-day",
          languages: state.languages.join(" + "),
          story,
          lyricsInputMode: "story",
          mood: [],
          languagePreferences: state.languagePreferences.trim(),
          advancedMusicChips: [],
          musicStyleNotes: state.musicalVibe,
          mobileNumber: normalizePhoneForCashfree(mobileNumberValue),
          email: "",
          selectedPackage: "package_2",
          requestSource: "fathers_day_wizard",
          userId: null,
          anonymousUserId,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json?.requestId) {
        throw new Error(json?.error || json?.message || "Unable to create request");
      }

      trackFunnelEvent.formStepComplete(5, "fathers_day_wizard_submit");
      trackFunnelEvent.songRequestSubmit(json.requestId, "package_2");
      queueMySongsNudge(json.requestId, "request_captured");

      await initiatePaymentCheckout(json.requestId);
    } catch (error) {
      toast({
        variant: "snackbar",
        description:
          getPaymentErrorMessage(
            error,
            "Unable to continue to payment. Please try again.",
          ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageStepSubmit = () => {
    if (state.languages.length === 0) {
      toast({ variant: "snackbar", description: "Please choose at least one language." });
      return;
    }
    setShowMobileValidationError(false);
    setIsMobileSheetOpen(true);
  };

  const submitLabel = isSubmitting
    ? "Creating request..."
    : `Continue to pay ${customSongPriceLabel}`;

  const renderStep = () => {
    switch (state.currentStep) {
      case 1: return <StepCallSign />;
      case 2: return <StepSoundboard />;
      case 3: return <StepRoutine />;
      case 4: return <StepLegacy />;
      case 5:
        return (
          <StepLanguage
            onSubmit={handleLanguageStepSubmit}
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
          />
        );
      default: return <StepCallSign />;
    }
  };

  return (
    <>
      {renderStep()}

      {/* Mobile number bottom sheet */}
      {isMobileSheetOpen && isHydrated && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-text-teal/40 backdrop-blur-[2px]"
            onClick={() => !isSubmitting && setIsMobileSheetOpen(false)}
            aria-label="Close mobile number sheet"
          />
          <div className="fixed bottom-0 left-0 z-50 flex h-[45dvh] w-full flex-col rounded-t-[32px] border-t border-gray-200 bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            <div className="mx-auto mb-2 mt-4 h-1.5 w-12 rounded-full bg-gray-200" />

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
                  onChange={(e) => {
                    setShowMobileValidationError(false);
                    setCustomerMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  placeholder="ENTER MOBILE NUMBER"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  className="w-full border-0 border-b border-text-teal bg-transparent p-0 pb-2 text-xl font-extrabold uppercase text-text-teal placeholder:font-extrabold placeholder:text-text-teal/20 focus:outline-none focus:ring-0"
                />
                {showMobileValidationError && mobileFieldError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{mobileFieldError}</p>
                )}
              </section>

              <div className="flex-grow" />

              <button
                type="button"
                onClick={proceedToPaymentWithMobile}
                disabled={isSubmitting}
                className="h-16 w-full rounded-xl bg-primary-yellow text-2xl font-black uppercase italic tracking-tighter text-text-teal transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating request..." : `Pay ${customSongPriceLabel}`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function FathersDayWizardClient() {
  return (
    <FathersDayWizardProvider>
      <FathersDayWizardInner />
    </FathersDayWizardProvider>
  );
}
