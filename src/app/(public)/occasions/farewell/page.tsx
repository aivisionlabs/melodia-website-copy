import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "farewell";
const OCCASION_NAME = "Farewell";

export const metadata: Metadata = {
  title: "AI Farewell Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI farewell songs in minutes. Custom lyrics & touching music for retirement, job change & moving away in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "farewell songs, personalized farewell songs, goodbye songs, custom farewell song, AI goodbye song, AI song generation, retirement songs, moving away songs, office farewell songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Farewell Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI farewell songs in minutes. Custom lyrics & touching music for retirement, job change & moving away in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/farewell",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Farewell Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Farewell Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI farewell songs in minutes. Custom lyrics & touching music for retirement, job change & moving away in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/farewell",
  },
};

export default async function FarewellPage() {
  // Fetch songs filtered by the farewell category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Farewell Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI farewell songs in minutes. Custom lyrics & touching music for retirement, job change & moving away in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Farewell Music",
    url: "https://www.melodia-songs.com/occasions/farewell",
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
      title="Send Them Off With a Song They'll Carry Forever."
      description="Create a personalized farewell song that captures shared memories and heartfelt goodbyes — in Hindi, Tamil, Telugu, and 20+ languages."
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
