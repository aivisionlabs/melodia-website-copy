import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "festive";
const OCCASION_NAME = "Festive Holiday";

export const metadata: Metadata = {
  title: "AI Festival Songs for Diwali, Holi & Eid, Personalized | Melodia",
  description:
    "Generate personalized AI festival songs in minutes. Custom Diwali, Holi, Eid, Christmas songs in Hindi, Tamil, Telugu, Gujarati & 20+ Indian languages. Starting ₹199.",
  keywords:
    "festive songs, festival songs, personalized festival songs, custom Diwali song, custom Holi song, AI festival song, AI song generation, holiday songs, Eid songs, Christmas songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Festival Songs for Diwali, Holi & Eid, Personalized | Melodia",
    description:
      "Generate personalized AI festival songs in minutes. Custom Diwali, Holi, Eid, Christmas songs in Hindi, Tamil, Telugu, Gujarati & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/festive-holiday",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Festival Songs for Diwali, Holi & Eid, Personalized | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Festival Songs for Diwali, Holi & Eid, Personalized | Melodia",
    description:
      "Generate personalized AI festival songs in minutes. Custom Diwali, Holi, Eid, Christmas songs in Hindi, Tamil, Telugu, Gujarati & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/festive-holiday",
  },
};

export default async function FestiveHolidayPage() {
  // Fetch songs filtered by the festive category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Festival Songs for Diwali, Holi & Eid, Personalized | Melodia",
    description:
      "Generate personalized AI festival songs in minutes. Custom Diwali, Holi, Eid, Christmas songs in Hindi, Tamil, Telugu, Gujarati & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Holiday Music",
    url: "https://www.melodia-songs.com/occasions/festive-holiday",
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
      title="Make This Festival Season Unforgettable."
      description="Create personalized Diwali, Holi, Eid, Christmas songs and more — in Hindi, Tamil, Telugu, Gujarati, and 20+ languages."
      occasionName={OCCASION_NAME}
      occasionSlug={CATEGORY_SLUG}
      songs={songs}
      totalSongs={totalSongs}
      faqItems={OCCASION_FAQ["festive-holiday"] ?? HOMEPAGE_FAQ}
      structuredData={structuredData}
      introHeading={OCCASION_INTROS["festive-holiday"]?.heading}
      introContent={OCCASION_INTROS["festive-holiday"]?.content}
    />
  );
}
