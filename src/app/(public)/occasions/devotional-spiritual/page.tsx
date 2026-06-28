import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "devotional";
const OCCASION_NAME = "Devotional";

export const metadata: Metadata = {
  title: "AI Bhajans & Spiritual Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI devotional songs in minutes. Custom bhajans, kirtans & prayer songs in Hindi, Sanskrit, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
  keywords:
    "devotional songs, personalized devotional songs, custom bhajan, AI devotional song, AI song generation, spiritual songs, bhajan generator, kirtan songs, worship songs, personalized song, custom song generation, prayer songs",
  openGraph: {
    title: "AI Bhajans & Spiritual Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI devotional songs in minutes. Custom bhajans, kirtans & prayer songs in Hindi, Sanskrit, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/devotional-spiritual",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Bhajans & Spiritual Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Bhajans & Spiritual Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI devotional songs in minutes. Custom bhajans, kirtans & prayer songs in Hindi, Sanskrit, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/devotional-spiritual",
  },
};

export default async function DevotionalSpiritualPage() {
  // Fetch songs filtered by the devotional category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Bhajans & Spiritual Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI devotional songs in minutes. Custom bhajans, kirtans & prayer songs in Hindi, Sanskrit, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Spiritual Music",
    url: "https://www.melodia-songs.com/occasions/devotional-spiritual",
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
      title="Let Your Devotion Flow Through Music."
      description="Create personalized bhajans, kirtans, and prayer songs in Hindi, Sanskrit, Tamil, Telugu, and 20+ languages."
      occasionName={OCCASION_NAME}
      occasionSlug={CATEGORY_SLUG}
      songs={songs}
      totalSongs={totalSongs}
      faqItems={OCCASION_FAQ["devotional-spiritual"] ?? HOMEPAGE_FAQ}
      structuredData={structuredData}
      introHeading={OCCASION_INTROS["devotional-spiritual"]?.heading}
      introContent={OCCASION_INTROS["devotional-spiritual"]?.content}
    />
  );
}
