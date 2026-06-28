import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "friendship";
const OCCASION_NAME = "Friendship";

export const metadata: Metadata = {
  title: "AI Friendship Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI friendship songs in minutes. Custom lyrics & heartfelt music for best friends in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
  keywords:
    "friendship songs, personalized friendship songs, best friend songs, custom friendship song, AI friendship song, AI song generation, Friendship Day songs, friends tribute songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Friendship Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI friendship songs in minutes. Custom lyrics & heartfelt music for best friends in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/friendship",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Friendship Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Friendship Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI friendship songs in minutes. Custom lyrics & heartfelt music for best friends in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/friendship",
  },
};

export default async function FriendshipPage() {
  // Fetch songs filtered by the friendship category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Friendship Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI friendship songs in minutes. Custom lyrics & heartfelt music for best friends in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Friendship Music",
    url: "https://www.melodia-songs.com/occasions/friendship",
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
      title="Your Friendship Deserves Its Own Song."
      description="Celebrate your bond with a personalized friendship song featuring your stories, inside jokes, and memories — in Hindi, Tamil, and 20+ languages."
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
