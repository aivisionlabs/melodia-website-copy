import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "motivational";
const OCCASION_NAME = "Motivational";

export const metadata: Metadata = {
  title: "AI Motivational Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI motivational songs in minutes. Custom lyrics & energetic music for gym, career & personal goals in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "motivational songs, personalized motivational songs, custom motivational song, AI motivational anthem, AI song generation, gym songs, workout songs, inspiration songs, personal anthem, personalized song, custom song generation",
  openGraph: {
    title: "AI Motivational Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI motivational songs in minutes. Custom lyrics & energetic music for gym, career & personal goals in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/motivational",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Motivational Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Motivational Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI motivational songs in minutes. Custom lyrics & energetic music for gym, career & personal goals in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/motivational",
  },
};

export default async function MotivationalPage() {
  // Fetch songs filtered by the motivational category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Motivational Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI motivational songs in minutes. Custom lyrics & energetic music for gym, career & personal goals in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Motivational Music",
    url: "https://www.melodia-songs.com/occasions/motivational",
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
      title="Your Personal Anthem. Your Unstoppable Energy."
      description="Create a personalized motivational song for your goals, fitness journey, or life challenges — in Hindi, Tamil, Telugu, and 20+ languages."
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
