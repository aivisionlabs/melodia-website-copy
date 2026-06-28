import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "haldi";
const OCCASION_NAME = "Haldi";

export const metadata: Metadata = {
  title: "AI Haldi Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI Haldi songs in minutes. Custom lyrics & festive music for Indian wedding Haldi ceremonies in Hindi, Punjabi, Marathi & 20+ languages. Starting ₹199.",
  keywords:
    "haldi songs, personalized haldi songs, custom haldi song, AI haldi song, AI song generation, turmeric ceremony songs, wedding haldi music, Indian haldi songs, haldi entry songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Haldi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Haldi songs in minutes. Custom lyrics & festive music for Indian wedding Haldi ceremonies in Hindi, Punjabi, Marathi & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/haldi",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Haldi Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Haldi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Haldi songs in minutes. Custom lyrics & festive music for Indian wedding Haldi ceremonies in Hindi, Punjabi, Marathi & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/haldi",
  },
};

export default async function HaldiPage() {
  // Fetch songs filtered by the haldi category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Haldi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Haldi songs in minutes. Custom lyrics & festive music for Indian wedding Haldi ceremonies in Hindi, Punjabi, Marathi & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Wedding Entertainment",
    url: "https://www.melodia-songs.com/occasions/haldi",
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
      title="Add a Personal Touch to Your Haldi Ceremony."
      description="Create a custom Haldi song with your story, family names, and festive energy — in Hindi, Punjabi, Marathi, and 20+ languages."
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
