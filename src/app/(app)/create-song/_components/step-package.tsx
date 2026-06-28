"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Download,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import { useToast } from "@/hooks/use-toast";
import {
  trackFunnelEvent,
  trackPaymentEvent,
  trackPixelEvent,
  trackCTAEvent,
} from "@/lib/analytics";
import { getPaymentErrorMessage } from "@/lib/payments/error-utils";
import { useCreateSongWizard } from "@/app/(app)/create-song/_components/wizard-context";
import {
  formatPackagePrice,
  getPackageById,
} from "@/app/(app)/create/_components/create-page-constants";
import {
  normalizePhoneForCashfree,
  validatePhoneNumber,
} from "@/lib/validation";
import type { PaymentOrderResponse, PaymentResponse } from "@/types/payment";
import { paymentOrderAmountInr } from "@/types/payment";

export function StepPackage() {
  const router = useRouter();
  const { anonymousUserId } = useAnonymousUser();
  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();
  const { toast } = useToast();
  const { state, isHydrated, setCustomerMobileNumber } = useCreateSongWizard();

  const nameDropPackage = getPackageById("package_1");
  const customSongPackage = getPackageById("package_2");
  const nameDropPrice = nameDropPackage?.price ?? 0;
  const customSongPrice = customSongPackage?.price ?? 0;
  const upgradeExtraPrice = Math.max(customSongPrice - nameDropPrice, 0);
  const nameDropPriceLabel = formatPackagePrice(nameDropPrice);
  const upgradeExtraPriceLabel = formatPackagePrice(upgradeExtraPrice);

  const [isSubmittingStandard, setIsSubmittingStandard] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [showMobileValidationError, setShowMobileValidationError] =
    useState(false);

  const mobileNumberValue = state.customerMobileNumber.trim();
  const mobileValidationError = validatePhoneNumber(mobileNumberValue);
  const mobileFieldError = !mobileNumberValue
    ? "Please enter your mobile number."
    : mobileValidationError;

  useEffect(() => {
    trackFunnelEvent.formStepView(2, "create_song_package");
    trackFunnelEvent.packageView("NameDrop", nameDropPrice);
    trackFunnelEvent.packageView("Fully Custom", customSongPrice);
  }, [nameDropPrice, customSongPrice]);

  useEffect(() => {
    if (!isMobileSheetOpen) return;
    trackFunnelEvent.formStepView(2, "create_song_mobile_sheet");
  }, [isMobileSheetOpen]);

  const goBack = () => {
    const params = new URLSearchParams();
    if (state.occasionSlug) {
      params.set("occasion", state.occasionSlug);
    }
    const suffix = params.toString();
    router.replace(suffix ? `/create-song?${suffix}` : "/create-song");
  };

  const goToPremiumStory = () => {
    trackFunnelEvent.packageSelect(
      "Fully Custom",
      customSongPrice,
      "package_2",
    );
    trackFunnelEvent.formStepComplete(2, "create_song_package_upgrade");
    trackPixelEvent.addToCart(
      customSongPackage?.name ?? "Fully Custom",
      customSongPrice,
    );

    if (state.occasionSlug === "fathers-day") {
      router.push("/create-song/fathers-day");
      return;
    }

    const params = new URLSearchParams();
    params.set("step", "story");
    if (state.occasionSlug) {
      params.set("occasion", state.occasionSlug);
    }
    router.replace(`/create-song?${params.toString()}`);
  };

  const initiateDirectPaymentCheckout = async (songRequestId: number) => {
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
        nameDropPackage?.name ?? "NameDrop",
      );
      trackPixelEvent.initiateCheckout(
        nameDropPackage?.name ?? "NameDrop",
        amountInr,
      );

      // So browser back from provider lands on review page.
      if (typeof window !== "undefined") {
        window.history.replaceState(
          window.history.state,
          "",
          `/payment?requestId=${songRequestId}`,
        );
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
          window.location.replace(`/payment?requestId=${songRequestId}`);
        },
        onCancel: () => {
          trackPaymentEvent.paymentCancelled(songRequestId, amountInr);
          router.push(`/payment?requestId=${songRequestId}`);
        },
        theme: { color: "#EF476F" },
        providerData: orderData.providerData,
      });
    } catch (error) {
      trackPaymentEvent.paymentFailed(
        songRequestId,
        nameDropPrice,
        getPaymentErrorMessage(error, "Checkout failed"),
        nameDropPackage?.name ?? "NameDrop",
      );
      router.push(`/payment?requestId=${songRequestId}`);
    }
  };

  const proceedToPaymentWithMobile = async () => {
    if (!state.selectedTemplateId) {
      toast({
        variant: "snackbar",
        description: "Please select a song first.",
      });
      goBack();
      return;
    }

    if (state.recipientName.trim().length < 2) {
      toast({
        variant: "snackbar",
        description: "Please enter recipient name.",
      });
      goBack();
      return;
    }

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

    setIsSubmittingStandard(true);
    trackFunnelEvent.packageSelect("NameDrop", nameDropPrice, "package_1");
    trackFunnelEvent.formStepComplete(2, "create_song_package_standard");
    trackPixelEvent.addToCart(
      nameDropPackage?.name ?? "NameDrop",
      nameDropPrice,
    );

    try {
      const response = await fetch("/api/create-song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientDetails: state.recipientName.trim(),
          occasion: state.occasionSlug ?? state.occasionLabel,
          languages: "NameDrop",
          story: "",
          lyricsInputMode: "story",
          mood: [],
          languagePreferences: "",
          advancedMusicChips: [],
          musicStyleNotes: "",
          mobileNumber: normalizePhoneForCashfree(mobileNumberValue),
          email: "",
          selectedPackage: "package_1",
          requestSource: "namedrop_template",
          nameDropTemplateId: state.selectedTemplateId,
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

      trackFunnelEvent.songRequestSubmit(json.requestId, "package_1");
      await initiateDirectPaymentCheckout(json.requestId);
    } catch (error) {
      toast({
        variant: "snackbar",
        description:
          error instanceof Error
            ? error.message
            : "Unable to continue to payment. Please try again.",
      });
    } finally {
      setIsSubmittingStandard(false);
    }
  };

  const handlePayAndDownloadClick = () => {
    proceedToPaymentWithMobile();
  };

  return (
    <div className="min-h-screen bg-paper-white pb-24 font-body text-text-teal">
      <nav className="sticky top-0 z-50 flex w-full items-center justify-between bg-paper-white/85 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={goBack}
          className="text-text-teal transition-opacity hover:opacity-80"
          aria-label="Back to song list"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </nav>

      <main className="mx-auto mt-4 max-w-lg px-4 pb-24 md:mt-12">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col items-center">
            <div className="mb-4 w-full text-center">
              <h2 className="text-2xl font-bold text-text-teal">
                Standard Song
              </h2>
              <p className="text-sm text-on-surface-variant">
                Download your pre-made selection
              </p>
            </div>
            <button
              type="button"
              onClick={handlePayAndDownloadClick}
              disabled={isSubmittingStandard || isMobileSheetOpen}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent-coral py-5 text-lg font-bold text-accent-coral transition-all hover:bg-accent-coral hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmittingStandard
                ? "Creating request..."
                : `Pay ${nameDropPriceLabel} & Download`}
              <Download className="h-5 w-5" />
            </button>
          </section>

          <div className="relative py-2 text-center">
            <span className="relative z-10 bg-paper-white px-4 text-sm font-medium text-on-surface-variant">
              OR
            </span>
            <div className="absolute left-0 top-1/2 -z-0 h-px w-full bg-surface-container" />
          </div>

          <section className="relative flex flex-col rounded-2xl border-t-[8px] border-accent-coral bg-white p-6 shadow-[0_10px_30px_-5px_rgba(7,59,76,0.1)]">
            <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent-coral px-5 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white shadow-md">
              <Star className="h-4 w-4" />
              Premium
            </div>

            <div className="mb-6 mt-4">
              <p className="text-base font-medium text-on-surface-variant">
                Completely unique musical creation for a truly special gift.
              </p>
            </div>

            <ul className="mb-10 flex-grow space-y-4">
              {[
                "Generate song in 20+ Languages",
                "Fully personalized lyrics based on your inputs",
                "Instant delivery within 2 minutes",
                "Includes 2 high quality versions of the song",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#2D6A4F]" />
                  <span className="text-base text-on-surface">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mb-4 rounded-lg bg-accent-coral/10 px-4 py-3 text-center text-sm font-medium italic text-on-surface-variant">
              Perfect for more personal occasions e.g. Birthdays, Anniversary,
              etc.
            </p>

            <button
              type="button"
              onClick={goToPremiumStory}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-coral py-5 text-lg text-white font-bold"
            >
              Upgrade
              <ArrowRight className="h-5 w-5" />
            </button>
          </section>
        </div>
      </main>

      {isMobileSheetOpen && isHydrated ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-text-teal/40 backdrop-blur-[2px]"
            onClick={() => !isSubmittingStandard && setIsMobileSheetOpen(false)}
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
                disabled={isSubmittingStandard}
                className="h-16 w-full rounded-xl bg-primary-yellow text-2xl font-black uppercase italic tracking-tighter text-text-teal transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingStandard ? "Creating request..." : "Continue"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
