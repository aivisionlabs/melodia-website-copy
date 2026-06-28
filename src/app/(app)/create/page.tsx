import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CreatePageContent } from "./_components/create-page-content";
import { isRecipientNameTransliterationEnabled } from "@/lib/recipient-name-transliteration-config";

export default function CreatePage() {
  const showRecipientNameTransliteration =
    isRecipientNameTransliterationEnabled();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-secondary-cream flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-coral" />
        </div>
      }
    >
      <CreatePageContent
        showRecipientNameTransliteration={showRecipientNameTransliteration}
      />
    </Suspense>
  );
}
