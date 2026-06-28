"use client";

import { ContactDetailsDialog } from "@/components/ContactDetailsDialog";
import { CreateSongRequestStep1 } from "@/components/create-song-request/CreateSongRequestStep1";
import { CreateSongRequestStep2 } from "@/components/create-song-request/CreateSongRequestStep2";
import { ReviewRequestPopup } from "@/components/create-song-request/ReviewRequestPopup";
import { Button } from "@/components/ui/button";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";
import { useCreateSongRequestForm } from "@/hooks/useCreateSongRequestForm";
import { trackFunnelEvent } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface SongRequestPayload {
  requesterName?: string;
  recipientDetails: string;
  occasion: string;
  languages: string;
  story: string;
  mood: string[];
  userId: number | string | null;
  anonymousUserId: string | null;
  mobileNumber?: string;
  email?: string;
  selectedPackage?: string;
  sourceSongId?: number;
}

function CreateSongRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { anonymousUserId } = useAnonymousUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>(
    undefined,
  );

  const form = useCreateSongRequestForm();
  const {
    step,
    recipientDetails,
    setRecipientDetails,
    occasion,
    setOccasion,
    customOccasion,
    setCustomOccasion,
    languages,
    setLanguages,
    story,
    setStory,
    moods,
    toggleMood,
    customMood,
    setCustomMood,
    sourceSongId,
    setSourceSongId,
    sourceSongPreview,
    templateSongs,
    templatesLoading,
    effectiveOccasion,
    error,
    setError,
    handleBack,
    validateAndGoNext,
    hasTrackedStep,
    formValues,
  } = form;

  // Scroll to top when step changes and track analytics
  useEffect(() => {
    window.scrollTo(0, 0);
    if (hasTrackedStep.current !== step) {
      hasTrackedStep.current = step;
      const stepName = step === 1 ? "recipient_details" : "story_mood";
      trackFunnelEvent.formStepView(step, stepName);
    }
  }, [step, hasTrackedStep]);

  // Require package selection: redirect to pricing if no plan in URL
  useEffect(() => {
    const plan = searchParams.get("plan");
    if (!plan) {
      router.replace("/pricing");
      return;
    }
    setSelectedPackage(plan);
  }, [searchParams, router]);

  // Read sourceSongId from query param (similar-style library flow)
  useEffect(() => {
    const raw = searchParams.get("sourceSongId");
    if (!raw) {
      setSourceSongId(null);
      return;
    }
    const parsed = parseInt(raw, 10);
    setSourceSongId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }, [searchParams, setSourceSongId]);

  const updateSourceSongIdInUrl = (newId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newId && newId > 0) {
      params.set("sourceSongId", String(newId));
    } else {
      params.delete("sourceSongId");
    }
    const qs = params.toString();
    router.replace(qs ? `/create-song-request?${qs}` : "/create-song-request", {
      scroll: false,
    });
  };

  const handleNext = () => {
    const ok = validateAndGoNext();
    if (ok) trackFunnelEvent.formStepComplete(1, "recipient_details");
  };

  const handleCreateSongRequest = async (
    mobileNumber: string,
    email: string,
  ) => {
    if (!selectedPackage) {
      router.replace("/pricing");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const songRequestPayload: SongRequestPayload = {
        recipientDetails: formValues.recipientDetails,
        occasion: formValues.occasion,
        languages: formValues.languages,
        story: formValues.story,
        mood: formValues.moods,
        mobileNumber,
        email,
        userId: null,
        anonymousUserId,
        selectedPackage,
        ...(formValues.sourceSongId
          ? { sourceSongId: formValues.sourceSongId }
          : {}),
      };

      const createRequestResponse = await fetch("/api/create-song-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(songRequestPayload),
      });

      if (!createRequestResponse.ok) {
        const errorData = await createRequestResponse.json();
        console.log("🎵 Error data:", errorData);

        // Handle Zod validation errors
        if (errorData?.issues && Array.isArray(errorData.issues)) {
          const firstError = errorData.issues[0];
          let errorMessage = firstError?.message || "Validation error";

          // Provide context for common validation errors
          if (firstError?.path?.includes("recipientDetails")) {
            errorMessage =
              "Please enter the recipient's name and relationship (e.g., 'Sarah, my best friend').";
          } else if (firstError?.path?.includes("languages")) {
            errorMessage = "Please enter a language for the song.";
          }

          throw new Error(errorMessage);
        }

        throw new Error(
          errorData?.errorMessage ||
            errorData?.error ||
            "Failed to create song request",
        );
      }

      const { requestId } = await createRequestResponse.json();

      // Track step 2 completion and form submission
      trackFunnelEvent.formStepComplete(2, "story_mood");
      trackFunnelEvent.songRequestSubmit(requestId, selectedPackage);

      // Check if expert-created package (package_3) - skip lyrics generation and go directly to payment
      if (selectedPackage === "package_3") {
        console.log(
          "🎵 Prime package selected, redirecting directly to payment",
        );
        router.push(`/payment?requestId=${requestId}`);
      } else {
        // Redirect to lyrics generation page for other packages
        console.log(
          "🎵 Song request created successfully, redirecting to lyrics page",
        );
        router.push(`/generate-lyrics/${requestId}`);
      }
    } catch (error) {
      console.error("Error creating song request:", error);
      const errorMessage = `Sorry, there was an error creating your song request. ${error}`;
      setError(errorMessage);
      setShowReviewPopup(true); // Show popup again on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactDetailsSubmit = async (data: {
    mobileNumber: string;
    email: string;
  }) => {
    await handleCreateSongRequest(data.mobileNumber, data.email);
  };

  const handleSubmit = async () => {
    // Show contact details dialog instead of review popup
    setError(null);
    setShowReviewPopup(true);
  };

  // Require package: show loading while redirecting to pricing
  const plan = searchParams.get("plan");
  if (!plan) {
    return (
      <div className="min-h-screen bg-secondary-cream text-text-teal flex flex-col font-body items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-accent-coral mb-4" />
        <p className="text-text-teal/80">Redirecting to choose a package...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        showReviewPopup ? "bg-primary-yellow" : "bg-secondary-cream"
      } text-text-teal flex flex-col font-body pb-20`}
    >
      <div className="p-6 space-y-8 flex-grow">
        {step === 1 && (
          <CreateSongRequestStep1
            recipientDetails={recipientDetails}
            setRecipientDetails={setRecipientDetails}
            occasion={occasion}
            setOccasion={setOccasion}
            customOccasion={customOccasion}
            setCustomOccasion={setCustomOccasion}
            languages={languages}
            setLanguages={setLanguages}
            sourceSongId={sourceSongId}
            sourceSongPreview={sourceSongPreview}
            templateSongs={templatesLoading ? [] : templateSongs}
            templatesLoading={templatesLoading}
            selectedPackage={selectedPackage}
            onSelectSourceSong={(id) => updateSourceSongIdInUrl(id)}
            effectiveOccasion={effectiveOccasion}
          />
        )}

        {step === 2 && (
          <CreateSongRequestStep2
            story={story}
            setStory={setStory}
            moods={moods}
            toggleMood={toggleMood}
            customMood={customMood}
            setCustomMood={setCustomMood}
            onBack={handleBack}
            occasion={occasion === "Other" ? customOccasion : occasion}
            hideMood={!!sourceSongId}
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6">
          <div className="bg-error/10 border border-error rounded-lg p-4">
            <p className="text-error text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="p-6 sticky bottom-0 bg-white pt-4 pb-6">
        {step === 1 ? (
          <Button
            className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
            onClick={handleNext}
          >
            Next
          </Button>
        ) : (
          <Button
            className="w-full h-14 bg-primary-yellow text-text-teal text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </div>
            ) : (
              "Review inputs"
            )}
          </Button>
        )}
      </div>

      <ReviewRequestPopup
        isOpen={showReviewPopup}
        onClose={() => setShowReviewPopup(false)}
        onSubmit={() => setShowContactDialog(true)}
        isSubmitting={isSubmitting}
        error={error}
        formData={{
          recipientDetails: formValues.recipientDetails,
          occasion,
          customOccasion,
          languages: formValues.languages,
          moods,
          customMood,
          sourceSongPreview: sourceSongPreview || null,
        }}
      />

      {/* Contact Details Dialog */}
      <ContactDetailsDialog
        isOpen={showContactDialog}
        onClose={() => setShowContactDialog(false)}
        onSubmit={handleContactDetailsSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default function CreateSongRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-secondary-cream text-text-teal flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-yellow" />
        </div>
      }
    >
      <CreateSongRequestContent />
    </Suspense>
  );
}
