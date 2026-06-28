"use client";

import {
  useState,
  useEffect,
  Suspense,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToastHelpers } from "@/hooks/use-toast";
import type {
  PaymentOrderResponse,
  PaymentResponse,
  PaymentVerifyResponse,
  PaymentSuccessResponse,
} from "@/types/payment";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import { FaWhatsapp } from "react-icons/fa";
import {
  trackFunnelEvent,
  trackPaymentEvent,
  trackPixelEvent,
} from "@/lib/analytics";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import {
  getPaymentErrorLogDetails,
  getPaymentErrorMessage,
} from "@/lib/payments/error-utils";
import {
  Loader2,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import Footer from "@/components/Footer";

const SUPPORT_WHATSAPP =
  "https://wa.me/917483464565?text=Hi!%20My%20payment%20went%20through%20but%20song%20generation%20failed.%20Please%20help.";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/** Single row in the pre-payment request review */
function SummaryField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  if (
    children === null ||
    children === undefined ||
    (typeof children === "string" && !children.trim())
  ) {
    return null;
  }
  return (
    <div className="border-b border-text-teal/10 pb-3 mb-3 last:mb-0 last:border-0 last:pb-0">
      <p className="text-[11px] font-semibold text-text-teal/45 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="text-sm text-text-teal/90 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

type SongRequestReview = {
  recipientDetails: string;
  occasion: string | null;
  languages: string;
  mood: string[] | null;
  songStory: string | null;
  lyricsInputMode: string;
  inputLyrics: string | null;
  mobile_number: string | null;
  languagePreferences: string | null;
  musicStyleChips: string[] | null;
  musicStyleNotes: string | null;
  nameDropTemplateTitle: string | null;
  namedropTemplateId: number | null;
  sourceSongTitle: string | null;
  requestSource: string | null;
  initialRequirementsText: string | null;
  deliveryDate: string | null;
  eventDate: string | null;
};

function formatDateDisplay(yyyyMmDd: string | null): string | null {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type LyricsDraftPreview = {
  title: string | null;
  lyrics: string;
  status: string;
};

/** All song-request fields for the payment review (flat or inside collapsible) */
function SongRequestFields({
  requestReview,
}: {
  requestReview: SongRequestReview;
}) {
  const isNameDrop =
    requestReview.languages === "NameDrop" ||
    requestReview.requestSource === "namedrop_template" ||
    !!requestReview.namedropTemplateId;

  return (
    <>
      <SummaryField label="Occasion">{requestReview.occasion}</SummaryField>
      <SummaryField label="For (recipient)">
        {requestReview.recipientDetails}
      </SummaryField>

      {isNameDrop ? (
        <SummaryField label="NameDrop template">
          {requestReview.nameDropTemplateTitle ||
            (requestReview.namedropTemplateId
              ? `Template #${requestReview.namedropTemplateId}`
              : "—")}
        </SummaryField>
      ) : (
        <SummaryField label="Languages">{requestReview.languages}</SummaryField>
      )}

      {!isNameDrop &&
        requestReview.lyricsInputMode === "lyrics" &&
        requestReview.inputLyrics?.trim() && (
          <SummaryField label="Your lyrics">
            <p className="whitespace-pre-wrap max-h-44 overflow-y-auto rounded-lg bg-text-teal/[0.04] p-3 text-sm leading-relaxed">
              {requestReview.inputLyrics}
            </p>
          </SummaryField>
        )}

      {!isNameDrop &&
        requestReview.lyricsInputMode !== "lyrics" &&
        requestReview.songStory?.trim() && (
          <SummaryField label="Story & memories">
            <p className="whitespace-pre-wrap max-h-44 overflow-y-auto rounded-lg bg-text-teal/[0.04] p-3 text-sm leading-relaxed">
              {requestReview.songStory}
            </p>
          </SummaryField>
        )}

      {!isNameDrop &&
        Array.isArray(requestReview.mood) &&
        requestReview.mood.length > 0 && (
          <SummaryField label="Mood & vibe">
            {requestReview.mood.join(", ")}
          </SummaryField>
        )}

      {!isNameDrop && requestReview.languagePreferences?.trim() && (
        <SummaryField label="Language mix / preferences">
          {requestReview.languagePreferences}
        </SummaryField>
      )}

      {!isNameDrop &&
        Array.isArray(requestReview.musicStyleChips) &&
        requestReview.musicStyleChips.length > 0 && (
          <SummaryField label="Music style">
            <div className="flex flex-wrap gap-1.5">
              {requestReview.musicStyleChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-text-teal/10 px-2.5 py-0.5 text-xs font-medium text-text-teal"
                >
                  {chip}
                </span>
              ))}
            </div>
          </SummaryField>
        )}

      {!isNameDrop && requestReview.musicStyleNotes?.trim() && (
        <SummaryField label="Music notes">
          {requestReview.musicStyleNotes}
        </SummaryField>
      )}

      {!isNameDrop && requestReview.sourceSongTitle && (
        <SummaryField label="Style reference (library)">
          {requestReview.sourceSongTitle}
        </SummaryField>
      )}

      {requestReview.initialRequirementsText?.trim() && (
        <SummaryField label="Notes for our team">
          <p className="whitespace-pre-wrap max-h-36 overflow-y-auto rounded-lg bg-text-teal/[0.04] p-3 text-sm leading-relaxed">
            {requestReview.initialRequirementsText}
          </p>
        </SummaryField>
      )}

      {(formatDateDisplay(requestReview.deliveryDate) ||
        formatDateDisplay(requestReview.eventDate)) && (
        <div className="flex flex-wrap gap-4 pt-1">
          {formatDateDisplay(requestReview.deliveryDate) && (
            <div>
              <p className="text-[11px] font-semibold text-text-teal/45 uppercase tracking-wide mb-1">
                Preferred delivery
              </p>
              <p className="text-sm text-text-teal/90">
                {formatDateDisplay(requestReview.deliveryDate)}
              </p>
            </div>
          )}
          {formatDateDisplay(requestReview.eventDate) && (
            <div>
              <p className="text-[11px] font-semibold text-text-teal/45 uppercase tracking-wide mb-1">
                Event date
              </p>
              <p className="text-sm text-text-teal/90">
                {formatDateDisplay(requestReview.eventDate)}
              </p>
            </div>
          )}
        </div>
      )}

      <SummaryField label="WhatsApp">
        {requestReview.mobile_number}
      </SummaryField>
    </>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const toast = useToastHelpers();

  // Use payment checkout hook
  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();

  const [loading, setLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [userPrefill, setUserPrefill] = useState<{
    name?: string;
    email?: string;
    contact?: string;
  } | null>(null);
  const [isPrimeCustomer, setIsPrimeCustomer] = useState(false);
  const [showPrimeSuccessPopup, setShowPrimeSuccessPopup] = useState(false);
  const [packagePrice, setPackagePrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  // Start in "checking" state whenever we have a requestId so the verifying loader
  // shows from first paint — prevents the payment form (Pay ₹…) from flashing before
  // checkPaymentStatus decides to redirect a completed payment to lyrics review.
  const [checkingStatus, setCheckingStatus] = useState(!!requestId);
  const [showSongGeneratingMessage, setShowSongGeneratingMessage] =
    useState(false);
  const [generatingSongId, setGeneratingSongId] = useState<number | null>(null);
  const [resolvingReturn, setResolvingReturn] = useState(false);
  const [postPaymentError, setPostPaymentError] = useState<string | null>(null);
  const [packageName, setPackageName] = useState<string>("Personalized Song");
  const [requestReview, setRequestReview] = useState<SongRequestReview | null>(
    null,
  );
  const [lyricsDraftPreview, setLyricsDraftPreview] =
    useState<LyricsDraftPreview | null>(null);

  // Track payment page view only once
  const hasTrackedPageView = useRef(false);
  const hasTrackedReviewSection = useRef(false);

  useEffect(() => {
    if (requestReview && requestId && !hasTrackedReviewSection.current) {
      hasTrackedReviewSection.current = true;
      trackFunnelEvent.paymentReviewView(requestId);
    }
  }, [requestReview, requestId]);

  // Check payment status on page load
  useEffect(() => {
    if (!requestId) {
      return;
    }

    const checkPaymentStatus = async () => {
      setCheckingStatus(true);

      try {
        const response = await fetch(
          `/api/payments/check-status?requestId=${requestId}`,
        );

        if (!response.ok) {
          throw new Error("Failed to check payment status");
        }

        const data = await response.json();

        if (!data.success || !data.data) {
          // Continue to show payment page normally
          setCheckingStatus(false);
          return;
        }

        const {
          payment,
          song,
          hasApprovedLyrics,
          isPrimeCustomer: isPrime,
          isNameDropRequest,
          templatedInstance,
          requestSource,
        } = data.data;

        // Scenario 1-3: No payment or payment pending/failed - show payment page normally
        if (!payment || payment.status !== "completed") {
          setCheckingStatus(false);
          return;
        }

        // Payment is completed - handle different scenarios
        setIsPrimeCustomer(isPrime);

        // Concierge flow: always show handoff screen after successful payment.
        if (isPrime) {
          setShowPrimeSuccessPopup(true);
          setCheckingStatus(false);
          return;
        }

        // Scenario 4: Payment completed + Song exists + Song completed
        if (song && song.status === "completed") {
          // Use window.location.replace to prevent back button from going to payment provider page
          window.location.replace(`/song-options/${song.id}`);
          return;
        }

        // Scenario 5: Payment completed + Song exists + Song processing
        if (song && song.status === "processing") {
          setShowSongGeneratingMessage(true);
          setGeneratingSongId(song.id);
          setCheckingStatus(false);
          return;
        }

        // Scenario 6: Payment completed + Song exists + Song failed
        if (song && song.status === "failed") {
          toast.error(
            "Song Generation Failed",
            "Your payment was successful but song generation failed. Please try again.",
          );
          setCheckingStatus(false);
          return;
        }

        // NameDrop templated song instance statuses
        if (isNameDropRequest && templatedInstance?.slug) {
          if (templatedInstance.status === "failed") {
            toast.error(
              "Song Generation Failed",
              "Your NameDrop song generation failed. Please contact support.",
            );
            setCheckingStatus(false);
            return;
          }
          if (
            templatedInstance.status === "completed" ||
            templatedInstance.status === "processing" ||
            templatedInstance.status === "queued"
          ) {
            window.location.replace(
              `/song-template/song/${templatedInstance.slug}`,
            );
            return;
          }
        }

        // Scenario 7: Payment completed + No song + No approved lyrics (non-Prime only)
        if (!song && !hasApprovedLyrics && !isPrime && !isNameDropRequest) {
          // Wizard flows generate lyrics in their own processing step — send them there directly.
          const isWizardFlow =
            requestSource === "create_song_wizard" ||
            requestSource === "fathers_day_wizard";
          if (isWizardFlow) {
            router.replace(
              `/create-song?step=processing&requestId=${requestId}`,
            );
            return;
          }
          // Pay-first /create flow: payment is done but lyrics aren't generated yet.
          // Redirect to lyrics review immediately and keep the verifying loader up
          // (do NOT setCheckingStatus(false)) so the payment form never flashes.
          toast.success(
            "Payment successful!",
            "Let's review your lyrics to generate your song.",
          );
          router.replace(`/generate-lyrics/${requestId}`);
          return;
        }

        // Scenario 8: Payment completed + No song + Approved lyrics exist (or NameDrop)
        // Trigger song generation automatically
        if (!song && (hasApprovedLyrics || isNameDropRequest)) {
          // Wizard flows own their generation pipeline. If we detect one here it means
          // the user navigated back to the payment page — redirect to the wizard's
          // processing step so the correct orchestration runs.
          const isWizardFlow =
            requestSource === "create_song_wizard" ||
            requestSource === "fathers_day_wizard";
          if (isWizardFlow) {
            router.replace(
              `/create-song?step=processing&requestId=${requestId}`,
            );
            return;
          }

          try {
            const successResponse = await fetch("/api/payments/success", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paymentId: payment.id,
                requestId: parseInt(requestId),
              }),
            });

            const successData = await successResponse.json();

            if (successResponse.ok && successData.success) {
              if ((successData as any).redirectUrl) {
                queueMySongsNudge(parseInt(requestId), "song_generated");
                window.location.replace((successData as any).redirectUrl);
                return;
              }
              if (successData.songId) {
                // Song generation started - redirect to song page
                // Use window.location.replace to prevent back button from going to payment provider page
                queueMySongsNudge(parseInt(requestId), "song_generated");
                window.location.replace(`/song-options/${successData.songId}`);
                return; // Exit early, no need to set checkingStatus
              } else {
                toast.success("Payment Successful!", "Creating your song...");
                setCheckingStatus(false);
                return;
              }
            } else {
              throw new Error(
                successData.message || "Failed to trigger song generation",
              );
            }
          } catch (error) {
            console.error(
              "Error triggering song generation:",
              getPaymentErrorLogDetails(
                error,
                "Payment was successful but failed to start song generation.",
              ),
            );
            setPostPaymentError(
              getPaymentErrorMessage(
                error,
                "Your payment went through but we couldn't start song generation. Please contact support.",
              ),
            );
            setCheckingStatus(false);
            return;
          }
        }

        setCheckingStatus(false);
      } catch (error) {
        console.error(
          "Error checking payment status:",
          getPaymentErrorLogDetails(error, "Unable to check payment status"),
        );
        toast.error(
          "Status Check Failed",
          "Unable to check payment status. Please refresh the page.",
        );
        setCheckingStatus(false);
        // Continue to show payment page on error
      }
    };

    checkPaymentStatus();
  }, [requestId, router]);

  useEffect(() => {
    // If we have a requestId, continue with existing happy-path logic
    if (requestId) {
      // Fetch song request data for prefill and check if Prime customer
      const fetchSongRequestData = async () => {
        setLoadingPrice(true);
        setLyricsDraftPreview(null);
        try {
          // First check if payment is already completed
          const paymentCheckResponse = await fetch(
            `/api/payments/check?requestId=${requestId}`,
          );
          if (paymentCheckResponse.ok) {
            const paymentData = await paymentCheckResponse.json();
            // Only short-circuit into handoff UI for completed concierge payments.
            if (paymentData.isCompleted && paymentData.isPrime) {
              setIsPrimeCustomer(true);
              setShowPrimeSuccessPopup(true);
              setLoadingPrice(false);
              return;
            }
          }

          const response = await fetch(`/api/song-requests/${requestId}`);
          const data = await response.json();

          if (data.success && data.data?.songRequest) {
            const sr = data.data.songRequest as SongRequestReview & {
              package?: {
                price?: string | number;
                name?: string;
                expert_created?: boolean;
              };
              email?: string | null;
            };

            // Check if expert-created package
            const isPrime = sr.package?.expert_created === true;
            setIsPrimeCustomer(isPrime);

            setRequestReview({
              recipientDetails: sr.recipientDetails || "",
              occasion: sr.occasion ?? null,
              languages: sr.languages || "",
              mood: sr.mood ?? null,
              songStory: sr.songStory ?? null,
              lyricsInputMode: sr.lyricsInputMode || "story",
              inputLyrics: sr.inputLyrics ?? null,
              mobile_number: sr.mobile_number ?? null,
              languagePreferences: sr.languagePreferences ?? null,
              musicStyleChips: sr.musicStyleChips ?? null,
              musicStyleNotes: sr.musicStyleNotes ?? null,
              nameDropTemplateTitle: sr.nameDropTemplateTitle ?? null,
              namedropTemplateId: sr.namedropTemplateId ?? null,
              sourceSongTitle: sr.sourceSongTitle ?? null,
              requestSource: sr.requestSource ?? null,
              initialRequirementsText: sr.initialRequirementsText ?? null,
              deliveryDate: sr.deliveryDate ?? null,
              eventDate: sr.eventDate ?? null,
            });

            const ld = data.data.lyricsDraft as
              | {
                  title?: string | null;
                  lyrics?: string | null;
                  displayLyrics?: string | null;
                  status?: string | null;
                }
              | null
              | undefined;
            const displayText =
              (typeof ld?.displayLyrics === "string" && ld.displayLyrics.trim()
                ? ld.displayLyrics
                : null) ||
              (typeof ld?.lyrics === "string" && ld.lyrics.trim()
                ? ld.lyrics
                : null);
            if (ld && displayText) {
              setLyricsDraftPreview({
                title: ld.title ?? null,
                lyrics: displayText.trim(),
                status: (ld.status || "draft").replace(/_/g, " "),
              });
            } else {
              setLyricsDraftPreview(null);
            }

            // Get package price and name
            if (sr.package?.price) {
              const price =
                typeof sr.package.price === "string"
                  ? parseFloat(sr.package.price)
                  : Number(sr.package.price);
              setPackagePrice(price);

              // Get package name for analytics
              const pkgName = sr.package?.name || "Personalized Song";
              setPackageName(pkgName);

              // Track payment page view (begin_checkout)
              if (!hasTrackedPageView.current && requestId) {
                hasTrackedPageView.current = true;
                trackPaymentEvent.paymentPageView(
                  parseInt(requestId),
                  price,
                  pkgName,
                );
              }
            }

            setUserPrefill({
              // name: data.data.songRequest.requester_name, // if available
              // email: data.data.songRequest.email, // if available
              // contact: data.data.songRequest.mobile_number, // if available
            });
          }
        } catch (error) {
          // Silently fail - prefill is optional
          console.log("Could not fetch user prefill data:", error);
        } finally {
          setLoadingPrice(false);
        }
      };

      fetchSongRequestData();
      return;
    }

    // If requestId is missing (e.g. iOS Cashfree return without query params),
    // try to resolve the correct destination on the server
    const resolveReturn = async () => {
      try {
        setResolvingReturn(true);
        const response = await fetch("/api/payments/resolve-return", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to resolve payment return");
        }

        const data = await response.json();

        if (data.success && data.nextUrl) {
          // Let the server decide where we should go (payment page with requestId,
          // song-options, or lyrics page). Use window.location.replace to prevent
          // back button from going to payment provider page.
          window.location.replace(data.nextUrl);
          return;
        }

        // If we couldn't resolve, send user to home with a clean state
        window.location.replace("/");
      } catch (error) {
        console.error("Error resolving payment return:", error);
        window.location.replace("/");
      } finally {
        setResolvingReturn(false);
      }
    };

    resolveReturn();
  }, [requestId, router]);

  const handlePaymentCancelled = useCallback(() => {
    setLoading(false);
    toast.error("Payment Cancelled", "You cancelled the payment.");

    // Track payment cancelled
    if (requestId && packagePrice) {
      trackPaymentEvent.paymentCancelled(parseInt(requestId), packagePrice);
    }
  }, [toast, requestId, packagePrice]);

  const handlePaymentSuccess = useCallback(
    async (response: PaymentResponse) => {
      if (!requestId) return;

      setLoading(true);
      try {
        // Verify payment signature
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_id: response.paymentId,
            order_id: response.orderId,
            signature: response.signature,
          }),
        });

        const verifyData: PaymentVerifyResponse = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.success) {
          throw new Error(verifyData.message || "Payment verification failed");
        }

        // Trigger song generation
        const successResponse = await fetch("/api/payments/success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId: verifyData.paymentId,
            requestId: parseInt(requestId),
          }),
        });

        const successData: PaymentSuccessResponse =
          await successResponse.json();

        if (!successResponse.ok || !successData.success) {
          throw new Error(
            successData.message || "Failed to process payment success",
          );
        }

        // Track payment completed (purchase event)
        if (requestId && packagePrice) {
          trackPaymentEvent.paymentCompleted(
            parseInt(requestId),
            packagePrice,
            response.orderId,
            packageName,
            successData.songId,
          );
          trackPixelEvent.purchase(
            packageName,
            packagePrice,
            response.orderId ?? "",
          );
        }

        // Check if Prime customer from response or state
        const isPrime = (successData as any).isPrimeCustomer || isPrimeCustomer;

        // Show Prime success message if Prime customer, otherwise show regular success
        if (isPrime) {
          setShowPrimeSuccessPopup(true);
          // Don't redirect immediately for Prime customers - let them see the success message
        } else {
          toast.success("Payment Successful!", "Creating your song...");
          // Redirect to next page - use window.location.replace to prevent back button
          // from going to payment provider page (Cashfree/Razorpay)
          if ((successData as any).redirectUrl) {
            queueMySongsNudge(parseInt(requestId), "song_generated");
            window.location.replace((successData as any).redirectUrl);
          } else if (successData.songId) {
            // Use window.location.replace to completely replace history entry
            // This prevents back button from going to payment provider page
            queueMySongsNudge(parseInt(requestId), "song_generated");
            window.location.replace(`/song-options/${successData.songId}`);
          } else {
            // Fallback if songId is missing
            window.location.replace("/");
          }
        }
      } catch (error) {
        const errorMessage = getPaymentErrorMessage(
          error,
          "Your payment went through but we couldn't start song generation. Please contact support.",
        );
        console.error(
          "Payment success error:",
          getPaymentErrorLogDetails(error, errorMessage),
        );

        // Track payment failed
        if (requestId && packagePrice) {
          trackPaymentEvent.paymentFailed(
            parseInt(requestId),
            packagePrice,
            errorMessage,
            packageName,
          );
        }

        setPostPaymentError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [requestId, router, toast, isPrimeCustomer, packagePrice],
  );

  const handlePayment = async () => {
    if (!requestId) return;

    // Check if script is loaded
    if (!scriptLoaded) {
      if (scriptError) {
        toast.error(
          "Payment Error",
          "Payment system failed to load. Please refresh the page.",
        );
      } else {
        toast.error(
          "Loading Payment",
          "Payment system is still loading. Please wait a moment.",
        );
      }
      return;
    }

    setCreatingOrder(true);
    setLoading(true);

    try {
      // Create payment order
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songRequestId: parseInt(requestId),
        }),
      });

      const data: PaymentOrderResponse = await response.json();

      if (!response.ok) {
        const errorMessage =
          (data as any).error || "Failed to create payment order";
        console.error("Payment order creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data,
        });
        throw new Error(errorMessage);
      }

      if (!data.success) {
        throw new Error("Failed to create payment order");
      }

      console.log("Order created, opening checkout:", {
        orderId: data.orderId,
        provider: data.provider,
        providerData: data.providerData,
        hasCheckoutUrl: !!data.providerData?.checkoutUrl,
        hasSessionId: !!data.providerData?.sessionId,
      });

      // Track payment initiated
      if (requestId && packagePrice) {
        trackPaymentEvent.paymentInitiated(
          parseInt(requestId),
          packagePrice,
          data.provider || "unknown",
          packageName,
        );
        trackPixelEvent.initiateCheckout(packageName, packagePrice);
      }

      // Open checkout using hook
      try {
        openCheckout({
          amount: data.amount, // Already in smallest currency unit from API
          currency: data.currency || "INR",
          orderId: data.orderId,
          name: "Melodia",
          description: "Personalized Song Generation",
          handler: handlePaymentSuccess,
          onCancel: handlePaymentCancelled,
          prefill: userPrefill || undefined,
          theme: {
            color: "#EF476F", // Vibrant Coral - brand accent color
          },
          providerData: data.providerData,
        });

        // Reset creating order state
        setCreatingOrder(false);

        // For Cashfree redirect, the page will navigate away, so loading state doesn't matter
        // For Razorpay popup, we need to keep loading false so user can see the popup
        if (data.provider === "cashfree" && data.providerData?.checkoutUrl) {
          // Redirect will happen - page will navigate away
          console.log("Redirecting to Cashfree checkout...");
          // Keep loading state - page will navigate
        } else {
          // Popup checkout - reset loading state
          setLoading(false);
        }
      } catch (checkoutError) {
        const checkoutErrorMessage = getPaymentErrorMessage(
          checkoutError,
          "Failed to open payment checkout",
        );
        console.error(
          "Error opening checkout:",
          getPaymentErrorLogDetails(checkoutError, checkoutErrorMessage),
        );
        setLoading(false);
        setCreatingOrder(false);
        throw new Error(checkoutErrorMessage);
      }
    } catch (error) {
      const errorMessage = getPaymentErrorMessage(
        error,
        "Failed to initiate payment",
      );
      console.error(
        "Payment error:",
        getPaymentErrorLogDetails(error, errorMessage),
      );

      // Track payment failed during order creation
      if (requestId && packagePrice) {
        trackPaymentEvent.paymentFailed(
          parseInt(requestId),
          packagePrice,
          errorMessage,
          packageName,
        );
      }

      toast.error("Payment Failed", errorMessage);
      setLoading(false);
      setCreatingOrder(false);
    }
  };

  // ── Post-payment generation error ─────────────────────────────────────────
  if (postPaymentError) {
    return (
      <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="w-20 h-20 bg-accent-coral/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-accent-coral" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-text-teal mb-3">
            Something went wrong
          </h2>
          <p className="text-sm text-text-teal/60 leading-relaxed mb-8 max-w-xs">
            {postPaymentError}
          </p>
          <div className="w-full max-w-sm space-y-3">
            <a
              href={SUPPORT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 6px 24px rgba(34,197,94,0.35)" }}
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Chat with Support</span>
            </a>
            <button
              onClick={() => window.location.replace("/my-songs")}
              className="w-full h-12 border border-text-teal/20 text-text-teal/70 font-medium rounded-full hover:bg-text-teal/5 transition-colors"
            >
              Go to My Songs
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Prime success ──────────────────────────────────────────────────────────
  if (showPrimeSuccessPopup) {
    return (
      <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="text-6xl mb-5">🥳</div>
          <h2 className="text-2xl font-bold font-heading text-text-teal mb-3 leading-tight">
            Let the Music Begin!
          </h2>
          <p className="text-sm text-text-teal/60 leading-relaxed mb-6 max-w-xs">
            Our song-crafting wizards have received your request and are already
            tuning their instruments!
          </p>
          <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5 flex items-start gap-3 mb-8 text-left">
            <FaWhatsapp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 leading-relaxed">
              Reach our creative team on{" "}
              <a
                href="https://wa.me/917483464565?text=Hi!%20I%20just%20placed%20an%20order%20and%20would%20like%20to%20connect%20with%20the%20creative%20team%20about%20my%20song%20request."
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
              >
                WhatsApp +91 74834 64565
              </a>
            </p>
          </div>
          <button
            onClick={() => {
              setShowPrimeSuccessPopup(false);
              window.location.replace("/");
            }}
            className="w-full max-w-sm h-14 bg-accent-coral text-white font-bold rounded-full flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.45)" }}
          >
            <span className="text-white">Let&apos;s Go!</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Song generating ─────────────────────────────────────────────────────────
  if (showSongGeneratingMessage && generatingSongId) {
    return (
      <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="text-6xl mb-5">🎵</div>
          <h2 className="text-2xl font-bold font-heading text-text-teal mb-3">
            Payment Successful!
          </h2>
          <p className="text-sm text-text-teal/60 leading-relaxed mb-8 max-w-xs">
            Your payment went through. Your song is being crafted right now!
          </p>
          <button
            onClick={() => {
              window.location.replace(`/song-options/${generatingSongId}`);
            }}
            className="w-full max-w-sm h-14 bg-accent-coral text-white font-bold rounded-full flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.45)" }}
          >
            <span>View Song Progress</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Checking / resolving ────────────────────────────────────────────────────
  if (checkingStatus || resolvingReturn) {
    return (
      <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-12 h-12 border-4 border-text-teal/20 border-t-accent-coral rounded-full animate-spin mb-5" />
          <h2 className="text-base font-bold text-text-teal mb-1">
            Verifying your payment…
          </h2>
          <p className="text-sm text-text-teal/45 text-center">
            Please wait, this only takes a moment
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const payButtonDisabled =
    loading || creatingOrder || !scriptLoaded || loadingPrice || !packagePrice;

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-secondary-cream/95 backdrop-blur-sm border-b border-text-teal/10">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-text-teal/70 hover:text-text-teal transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex-1" />
          <Lock className="w-4 h-4 text-text-teal/40" />
          <span className="text-xs text-text-teal/40 ml-1">Secure Payment</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-stretch px-5 py-6 pb-28 md:pb-12">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Request review — all inputs from create flow; collapsible when lyrics draft exists */}
          {requestReview && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-text-teal/10">
              <h2 className="text-lg font-bold font-heading text-text-teal mb-0.5">
                Review your request
              </h2>
              <p className="text-xs text-text-teal/50 mb-4">
                {lyricsDraftPreview
                  ? "Expand each section to confirm details and lyrics before you pay."
                  : "Confirm your details before you pay."}
              </p>

              {lyricsDraftPreview ? (
                <div className="space-y-3">
                  <details className="group rounded-xl border border-text-teal/15 bg-text-teal/[0.03] open:bg-white transition-colors">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-1">
                      <span className="flex items-center justify-between gap-3 py-3 text-sm font-bold text-text-teal">
                        <span>Song request</span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-text-teal/45 transition-transform duration-200 group-open:rotate-180"
                          aria-hidden
                        />
                      </span>
                    </summary>
                    <div className="border-t border-text-teal/10 px-1 pb-3 pt-1">
                      <SongRequestFields requestReview={requestReview} />
                    </div>
                  </details>

                  <details className="group rounded-xl border border-text-teal/15 bg-text-teal/[0.03] open:bg-white transition-colors">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-1">
                      <span className="flex items-start justify-between gap-3 py-3 text-sm font-bold text-text-teal">
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block">Lyrics</span>
                          {lyricsDraftPreview.title ? (
                            <span className="mt-0.5 block text-xs font-normal text-text-teal/55 line-clamp-2">
                              {lyricsDraftPreview.title}
                            </span>
                          ) : null}
                        </span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-text-teal/45 transition-transform duration-200 group-open:rotate-180 mt-0.5"
                          aria-hidden
                        />
                      </span>
                    </summary>
                    <div className="border-t border-text-teal/10 px-1 pb-3 pt-2">
                      <p className="text-xs text-text-teal/60 mb-2">
                        <span className="font-semibold text-text-teal/75">
                          Status:{" "}
                        </span>
                        <span className="capitalize">
                          {lyricsDraftPreview.status}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap max-h-72 overflow-y-auto rounded-lg bg-text-teal/[0.04] p-3 text-sm leading-relaxed text-text-teal/90">
                        {lyricsDraftPreview.lyrics}
                      </p>
                    </div>
                  </details>
                </div>
              ) : (
                <SongRequestFields requestReview={requestReview} />
              )}
            </section>
          )}

          {loadingPrice && !requestReview && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-accent-coral" />
            </div>
          )}

          {/* Order summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-text-teal/10">
            <h2 className="text-xl font-bold font-heading text-text-teal mb-4">
              Order Summary
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-teal/70">{packageName}</span>
              {loadingPrice ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-teal/40" />
              ) : (
                <span className="text-lg font-bold text-text-teal">
                  ₹{packagePrice?.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePayment}
            disabled={payButtonDisabled}
            className="w-full h-14 bg-accent-coral text-white font-bold rounded-full flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.45)" }}
          >
            {loading || creatingOrder ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing…</span>
              </>
            ) : !scriptLoaded && !scriptError ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading payment…</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹{packagePrice?.toLocaleString("en-IN") ?? "—"}</span>
              </>
            )}
          </button>

          {scriptError && (
            <p className="mt-3 text-xs text-red-500 text-center">
              Payment system failed to load. Please refresh the page.
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-secondary-cream flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-text-teal/20 border-t-accent-coral rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
