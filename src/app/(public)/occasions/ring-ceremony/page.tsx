import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "ring-ceremony";
const OCCASION_NAME = "Ring Ceremony";

export const metadata: Metadata = {
  title: "AI Ring Ceremony Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI ring ceremony songs in minutes. Custom lyrics & romantic music for engagement celebrations in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "ring ceremony songs, engagement songs, personalized engagement song, custom ring ceremony song, AI engagement song, AI song generation, Indian engagement songs, sagai songs, ring exchange songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Ring Ceremony Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI ring ceremony songs in minutes. Custom lyrics & romantic music for engagement celebrations in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/ring-ceremony",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Ring Ceremony Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Ring Ceremony Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI ring ceremony songs in minutes. Custom lyrics & romantic music for engagement celebrations in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/ring-ceremony",
  },
};

export default async function RingCeremonyPage() {
  // Fetch songs filtered by the ring-ceremony category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Ring Ceremony Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI ring ceremony songs in minutes. Custom lyrics & romantic music for engagement celebrations in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Engagement Entertainment",
    url: "https://www.melodia-songs.com/occasions/ring-ceremony",
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
      title="Seal Your Love With a Song."
      description="Create a personalized ring ceremony song that captures your commitment. In Hindi, Tamil, Telugu, and 20+ languages in just 5 minutes."
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
