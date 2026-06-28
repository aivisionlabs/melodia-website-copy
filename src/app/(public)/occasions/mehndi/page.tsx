import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "mehndi";
const OCCASION_NAME = "Mehndi";

export const metadata: Metadata = {
  title: "AI Mehndi Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI Mehndi songs in minutes. Custom lyrics & vibrant music for Indian wedding Mehndi ceremonies in Hindi, Punjabi, Rajasthani & 20+ languages. Starting ₹199.",
  keywords:
    "mehndi songs, mehendi songs, personalized mehndi songs, custom mehndi song, AI mehndi song, AI song generation, bridal mehndi songs, wedding mehndi music, Indian mehndi songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Mehndi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Mehndi songs in minutes. Custom lyrics & vibrant music for Indian wedding Mehndi ceremonies in Hindi, Punjabi, Rajasthani & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/mehndi",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Mehndi Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Mehndi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Mehndi songs in minutes. Custom lyrics & vibrant music for Indian wedding Mehndi ceremonies in Hindi, Punjabi, Rajasthani & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/mehndi",
  },
};

export default async function MehndiPage() {
  // Fetch songs filtered by the mehndi category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Mehndi Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI Mehndi songs in minutes. Custom lyrics & vibrant music for Indian wedding Mehndi ceremonies in Hindi, Punjabi, Rajasthani & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Wedding Entertainment",
    url: "https://www.melodia-songs.com/occasions/mehndi",
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
      title="A Song As Beautiful As Her Mehndi."
      description="Create a personalized Mehndi song celebrating the bride's journey in Hindi, Punjabi, Rajasthani, and 20+ languages in minutes."
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
