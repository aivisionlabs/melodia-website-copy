"use client";

import { CreateSongWizardProvider } from "@/app/(app)/create-song/_components/wizard-context";
import { StepCatalog } from "@/app/(app)/create-song/_components/step-catalog";
import { StepPackage } from "@/app/(app)/create-song/_components/step-package";
import { StepProcessing } from "@/app/(app)/create-song/_components/step-processing";
import { StepStory } from "@/app/(app)/create-song/_components/step-story";
import { CreateSongTrustFooter } from "@/app/(app)/create-song/_components/create-song-trust-footer";

export function CreateSongWizardClient({
  step,
  occasionSlug,
  requestId,
  showRecipientNameTransliteration = false,
}: {
  step?: string;
  occasionSlug?: string;
  requestId?: string;
  showRecipientNameTransliteration?: boolean;
}) {
  return (
    <CreateSongWizardProvider initialOccasionSlug={occasionSlug}>
      {step === "processing" ? (
        <StepProcessing requestId={requestId} />
      ) : step === "package" ? (
        <StepPackage />
      ) : step === "story" ? (
        <StepStory
          showRecipientNameTransliteration={showRecipientNameTransliteration}
        />
      ) : (
        <StepCatalog
          initialOccasionSlug={occasionSlug}
          showRecipientNameTransliteration={showRecipientNameTransliteration}
        />
      )}
      <CreateSongTrustFooter />
    </CreateSongWizardProvider>
  );
}
