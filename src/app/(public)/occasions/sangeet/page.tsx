import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "sangeet";
const OCCASION_NAME = "Sangeet";

export const metadata: Metadata = {
  title: "AI Sangeet Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI Sangeet songs in minutes. Custom lyrics & high-energy music for Indian wedding Sangeet ceremonies in Hindi, Punjabi & 20+ languages. Starting ₹199.",
  keywords:
    "sangeet songs, mahila sangeet songs, personalized sangeet songs, custom sangeet song, AI sangeet song, AI song generation, wedding dance songs, shaadi sangeet songs, Bollywood dance songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Sangeet Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Sangeet songs in minutes. Custom lyrics & high-energy music for Indian wedding Sangeet ceremonies in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/sangeet",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Sangeet Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Sangeet Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Sangeet songs in minutes. Custom lyrics & high-energy music for Indian wedding Sangeet ceremonies in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/sangeet",
  },
};

export default async function SangeetPage() {
  // Fetch songs filtered by the sangeet category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Sangeet Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Sangeet songs in minutes. Custom lyrics & high-energy music for Indian wedding Sangeet ceremonies in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Wedding Entertainment",
    url: "https://www.melodia-songs.com/occasions/sangeet",
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
      title="Make Your Sangeet Unforgettable."
      description="Create a custom Sangeet song with your love story, family names, and Bollywood energy — in Hindi, Punjabi, and 20+ languages in 5 minutes."
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
