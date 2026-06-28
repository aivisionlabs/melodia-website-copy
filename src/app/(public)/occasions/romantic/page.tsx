import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "romantic";
const OCCASION_NAME = "Romantic";

export const metadata: Metadata = {
  title: "AI Love Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate a personalized AI romantic love song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for proposals & Valentine's Day. Starting ₹199.",
  keywords:
    "romantic songs, personalized romantic songs, custom romantic song, AI love song, AI song generation, love songs, proposal songs, Valentine's Day songs, personalized song, custom song generation, Bollywood love songs",
  openGraph: {
    title: "AI Love Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI romantic love song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for proposals & Valentine's Day. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/romantic",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Love Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Love Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI romantic love song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for proposals & Valentine's Day. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/romantic",
  },
};

export default async function RomanticPage() {
  // Fetch songs filtered by the romantic category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Love Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI romantic love song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for proposals & Valentine's Day. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Romantic Music",
    url: "https://www.melodia-songs.com/occasions/romantic",
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
      title="Say It Louder With a Song Made Just for Them."
      description="Create a personalized love song that tells your unique story. Ready in minutes, in Hindi, Tamil, Telugu, and 20+ languages."
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
