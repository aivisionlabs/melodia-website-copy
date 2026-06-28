import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "apology";
const OCCASION_NAME = "Apology";

export const metadata: Metadata = {
  title: "AI Apology Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate a personalized AI apology song in minutes. Custom lyrics & emotive music to express sincere regret in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
  keywords:
    "apology songs, personalized apology songs, sorry songs, custom apology song, AI sorry song, AI song generation, forgiveness songs, making amends songs, personalized song, custom song generation, reconciliation songs",
  openGraph: {
    title: "AI Apology Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI apology song in minutes. Custom lyrics & emotive music to express sincere regret in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/apology",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Apology Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Apology Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI apology song in minutes. Custom lyrics & emotive music to express sincere regret in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/apology",
  },
};

export default async function ApologyPage() {
  // Fetch songs filtered by the apology category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Apology Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI apology song in minutes. Custom lyrics & emotive music to express sincere regret in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Emotional Music",
    url: "https://www.melodia-songs.com/occasions/apology",
    offers: {
      "@type": "Offer",
      price: "199",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    availableLanguage: ["Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi", "English"],
  };

  return (
    <OccasionPageTemplate
      title="Sometimes Sorry Needs a Song."
      description="Create a heartfelt apology song that expresses your feelings more deeply than words alone — in Hindi, Tamil, Telugu, and 20+ languages."
      occasionName={OCCASION_NAME}
      occasionSlug={CATEGORY_SLUG}
      songs={songs}
      totalSongs={totalSongs}
      faqItems={OCCASION_FAQ[CATEGORY_SLUG] ?? HOMEPAGE_FAQ}
      structuredData={structuredData}
      introHeading={OCCASION_INTROS[CATEGORY_SLUG]?.heading}
      introContent={OCCASION_INTROS[CATEGORY_SLUG]?.content}
    />
  );
}
