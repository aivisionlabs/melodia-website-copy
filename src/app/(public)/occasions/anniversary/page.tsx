import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "anniversary";
const OCCASION_NAME = "Anniversary";

export const metadata: Metadata = {
  title: "AI Anniversary Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate a personalized AI anniversary song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for weddings & dating anniversaries. Starting ₹199.",
  keywords:
    "anniversary songs, personalized anniversary songs, custom anniversary song, AI anniversary song, AI song generation, wedding anniversary songs, dating anniversary songs, anniversary gift ideas, love songs, romantic anniversary songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Anniversary Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI anniversary song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for weddings & dating anniversaries. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/anniversary",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Anniversary Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Anniversary Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI anniversary song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for weddings & dating anniversaries. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/anniversary",
  },
};

export default async function AnniversaryPage() {
  // Fetch songs filtered by the anniversary category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Anniversary Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate a personalized AI anniversary song in minutes. Custom lyrics, studio-quality music in Hindi, Tamil, Telugu & 20+ Indian languages. Perfect for weddings & dating anniversaries. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Celebration Music",
    url: "https://www.melodia-songs.com/occasions/anniversary",
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
      title="Celebrate Your Love Story in a Song."
      description="Turn your journey together into music. Create a personalized anniversary song in Hindi, Tamil, Telugu, and 20+ languages in just 5 minutes."
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
