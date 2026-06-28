import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "congratulations";
const OCCASION_NAME = "Congratulations";

export const metadata: Metadata = {
  title: "AI Congratulations Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI congratulations songs in minutes. Custom lyrics & celebratory music for graduations, promotions & milestones in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "congratulations songs, personalized congratulations songs, achievement songs, custom congratulations song, AI song generator, AI song generation, graduation songs, promotion songs, milestone songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Congratulations Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI congratulations songs in minutes. Custom lyrics & celebratory music for graduations, promotions & milestones in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/congratulations",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Congratulations Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Congratulations Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI congratulations songs in minutes. Custom lyrics & celebratory music for graduations, promotions & milestones in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/congratulations",
  },
};

export default async function CongratulationsPage() {
  // Fetch songs filtered by the congratulations category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Congratulations Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI congratulations songs in minutes. Custom lyrics & celebratory music for graduations, promotions & milestones in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Celebration Music",
    url: "https://www.melodia-songs.com/occasions/congratulations",
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
      title="Celebrate Their Win With a Song Made for Them."
      description="Create a personalized congratulations song for graduations, promotions, and milestones — in Hindi, Tamil, Telugu, and 20+ languages."
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
