import type { Metadata } from "next";
import { CreateSongWizardClient } from "./_components/create-song-wizard-client";
import { isRecipientNameTransliterationEnabled } from "@/lib/recipient-name-transliteration-config";

export const metadata: Metadata = {
  title: "Create a Song | Melodia",
  description:
    "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
  openGraph: {
    title: "Create a Song | Melodia",
    description:
      "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
    url: "https://www.melodia-songs.com/create-song",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Create a personalized song on Melodia",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a Song | Melodia",
    description:
      "Make a personalized song on Melodia for birthdays, anniversaries, weddings, and more. 20+ Indian languages, 22+ occasions, studio-quality audio. From ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
};

interface CreateSongPageProps {
  searchParams?: Promise<{
    step?: string;
    occasion?: string;
    requestId?: string;
  }>;
}

export default async function CreateSongPage({ searchParams }: CreateSongPageProps) {
  const resolvedSearchParams = await searchParams;
  const step = resolvedSearchParams?.step;
  const occasionSlug = resolvedSearchParams?.occasion;
  const requestId = resolvedSearchParams?.requestId;
  const showRecipientNameTransliteration =
    isRecipientNameTransliterationEnabled();

  return (
    <CreateSongWizardClient
      step={step}
      occasionSlug={occasionSlug}
      requestId={requestId}
      showRecipientNameTransliteration={showRecipientNameTransliteration}
    />
  );
}
