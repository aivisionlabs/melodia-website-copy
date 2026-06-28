import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "weddings";
const OCCASION_NAME = "Wedding";

export const metadata: Metadata = {
  title: "AI Wedding Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI wedding songs in minutes. Custom lyrics & studio-quality music for Sangeet, Haldi, Mehndi, reception in Hindi, Punjabi & 20+ languages. Starting ₹199.",
  keywords:
    "wedding songs, personalized wedding songs, custom wedding song, AI wedding song, AI song generation, wedding ceremony songs, sangeet songs, haldi songs, mehendi songs, wedding reception songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Wedding Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI wedding songs in minutes. Custom lyrics & studio-quality music for Sangeet, Haldi, Mehndi, reception in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/weddings",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Wedding Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Wedding Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI wedding songs in minutes. Custom lyrics & studio-quality music for Sangeet, Haldi, Mehndi, reception in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/weddings",
  },
};

export default async function WeddingsPage() {
  // Fetch songs filtered by the wedding category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Wedding Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI wedding songs in minutes. Custom lyrics & studio-quality music for Sangeet, Haldi, Mehndi, reception in Hindi, Punjabi & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Wedding Entertainment",
    url: "https://www.melodia-songs.com/occasions/weddings",
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
      title="Make Every Wedding Moment Musical."
      description="From Sangeet to reception, create personalized wedding songs in Hindi, Punjabi, Tamil, Telugu, and 20+ languages that capture your love story."
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
