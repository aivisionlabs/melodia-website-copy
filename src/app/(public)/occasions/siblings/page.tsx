import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "siblings";
const OCCASION_NAME = "Sibling";

export const metadata: Metadata = {
  title: "AI Sibling Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI sibling songs in minutes. Custom lyrics & heartfelt music for Raksha Bandhan, Bhai Dooj & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "sibling songs, personalized sibling songs, brother sister songs, custom sibling song, AI sibling song, AI song generation, Raksha Bandhan songs, Bhai Dooj songs, family songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Sibling Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI sibling songs in minutes. Custom lyrics & heartfelt music for Raksha Bandhan, Bhai Dooj & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/siblings",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Sibling Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Sibling Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI sibling songs in minutes. Custom lyrics & heartfelt music for Raksha Bandhan, Bhai Dooj & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/siblings",
  },
};

export default async function SiblingsPage() {
  // Fetch songs filtered by the siblings category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Sibling Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI sibling songs in minutes. Custom lyrics & heartfelt music for Raksha Bandhan, Bhai Dooj & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Family Music",
    url: "https://www.melodia-songs.com/occasions/siblings",
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
      title="Celebrate the Bond That Nothing Can Break."
      description="Create a personalized sibling song with childhood memories, inside jokes, and love — in Hindi, Tamil, Telugu, and 20+ languages."
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
