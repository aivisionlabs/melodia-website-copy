import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "lullaby";
const OCCASION_NAME = "Lullaby";

export const metadata: Metadata = {
  title: "AI Lullabies, Personalized & Heartfelt | Melodia",
  description:
    "Generate a personalized AI lullaby in minutes. Custom lyrics & soothing music featuring your baby's name in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
  keywords:
    "lullaby songs, personalized lullaby, custom lullaby song, AI lullaby generator, AI song generation, baby lullaby songs, children lullaby, sleep songs, bedtime songs, personalized song, custom song generation, baby shower gift songs",
  openGraph: {
    title: "AI Lullabies, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI lullaby in minutes. Custom lyrics & soothing music featuring your baby's name in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/lullaby",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Lullabies, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Lullabies, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI lullaby in minutes. Custom lyrics & soothing music featuring your baby's name in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/lullaby",
  },
};

export default async function LullabyPage() {
  // Fetch songs filtered by the lullaby category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Lullabies, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI lullaby in minutes. Custom lyrics & soothing music featuring your baby's name in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Children's Music",
    url: "https://www.melodia-songs.com/occasions/lullaby",
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
      title="Give Your Little One a Song of Their Own."
      description="Create a personalized lullaby with your child's name woven into every line — in Hindi, Tamil, Telugu, and 20+ languages."
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
