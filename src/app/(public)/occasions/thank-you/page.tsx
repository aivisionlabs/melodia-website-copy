import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "thank-you";
const OCCASION_NAME = "Thank You";

export const metadata: Metadata = {
  title: "AI Thank You Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI thank you songs in minutes. Custom lyrics & warm music for teachers, mentors & caregivers in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
  keywords:
    "thank you songs, personalized thank you songs, gratitude songs, custom thank you song, AI gratitude song, AI song generation, Teacher's Day songs, appreciation songs, mentor songs, personalized song, custom song generation",
  openGraph: {
    title: "AI Thank You Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI thank you songs in minutes. Custom lyrics & warm music for teachers, mentors & caregivers in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/thank-you",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Thank You Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Thank You Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI thank you songs in minutes. Custom lyrics & warm music for teachers, mentors & caregivers in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/thank-you",
  },
};

export default async function ThankYouPage() {
  // Fetch songs filtered by the thank-you category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Thank You Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI thank you songs in minutes. Custom lyrics & warm music for teachers, mentors & caregivers in Hindi, Tamil, Telugu & 20+ Indian languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Gratitude Music",
    url: "https://www.melodia-songs.com/occasions/thank-you",
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
      title="Show Gratitude Through Music."
      description="Create a heartfelt thank you song for teachers, mentors, doctors, and anyone who made a difference — in Hindi, Tamil, and 20+ languages."
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
