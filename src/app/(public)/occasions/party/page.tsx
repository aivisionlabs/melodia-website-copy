import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "party";
const OCCASION_NAME = "Party";

export const metadata: Metadata = {
  title: "AI Party Anthems, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI party songs in minutes. Custom lyrics & high-energy music in Hindi, English, Punjabi & 20+ languages. Perfect for birthdays, New Year & reunions. Starting ₹199.",
  keywords:
    "party songs, personalized party songs, custom party song, AI party anthem, AI song generation, celebration songs, festive songs, party playlist, personalized song, custom song generation, Bollywood party songs",
  openGraph: {
    title: "AI Party Anthems, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI party songs in minutes. Custom lyrics & high-energy music in Hindi, English, Punjabi & 20+ languages. Perfect for birthdays, New Year & reunions. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/party",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Party Anthems, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Party Anthems, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI party songs in minutes. Custom lyrics & high-energy music in Hindi, English, Punjabi & 20+ languages. Perfect for birthdays, New Year & reunions. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/party",
  },
};

export default async function PartyPage() {
  // Fetch songs filtered by the party category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Party Anthems, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI party songs in minutes. Custom lyrics & high-energy music in Hindi, English, Punjabi & 20+ languages. Perfect for birthdays, New Year & reunions. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Party Music",
    url: "https://www.melodia-songs.com/occasions/party",
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
      title="Turn Your Party Into a Legend."
      description="Create a custom party anthem with your crew's names and energy — in Hindi, English, Punjabi, and 20+ languages. Ready in minutes."
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
