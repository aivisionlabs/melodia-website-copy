import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "parents";
const OCCASION_NAME = "Parent";

export const metadata: Metadata = {
  title: "AI Songs for Mom & Dad, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI songs for your parents in minutes. Custom lyrics & touching music for Mother's Day, Father's Day & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "parent songs, personalized parent songs, mom songs, dad songs, custom parent song, AI song for parents, AI song generation, Mother's Day songs, Father's Day songs, family songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Songs for Mom & Dad, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for your parents in minutes. Custom lyrics & touching music for Mother's Day, Father's Day & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/parents",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Songs for Mom & Dad, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Songs for Mom & Dad, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for your parents in minutes. Custom lyrics & touching music for Mother's Day, Father's Day & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/parents",
  },
};

export default async function ParentsPage() {
  // Fetch songs filtered by the parents category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Songs for Mom & Dad, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for your parents in minutes. Custom lyrics & touching music for Mother's Day, Father's Day & more in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Family Music",
    url: "https://www.melodia-songs.com/occasions/parents",
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
      title="Give Your Parents the Gift of a Lifetime."
      description="Create a heartfelt song honoring their love, sacrifice, and guidance — in Hindi, Tamil, Telugu, Malayalam, and 20+ languages."
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
