import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "corporate";
const OCCASION_NAME = "Corporate Event";

export const metadata: Metadata = {
  title: "AI Corporate Event Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI corporate event songs in minutes. Custom lyrics, studio-quality music for team events, product launches & company anniversaries. Starting ₹199.",
  keywords:
    "corporate event songs, personalized corporate songs, custom corporate song, AI song generation, business celebration songs, company party songs, corporate entertainment, business milestone songs, personalized song, custom song generation, team building songs",
  openGraph: {
    title: "AI Corporate Event Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI corporate event songs in minutes. Custom lyrics, studio-quality music for team events, product launches & company anniversaries. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/corporate-events",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Corporate Event Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Corporate Event Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI corporate event songs in minutes. Custom lyrics, studio-quality music for team events, product launches & company anniversaries. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/corporate-events",
  },
};

export default async function CorporateEventsPage() {
  // Fetch songs filtered by the corporate category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Corporate Event Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI corporate event songs in minutes. Custom lyrics, studio-quality music for team events, product launches & company anniversaries. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Corporate Music",
    url: "https://www.melodia-songs.com/occasions/corporate-events",
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
      title="Give Your Team a Song They'll Never Forget."
      description="Celebrate milestones, launches, and wins with a custom AI-generated corporate song. Professional, on-brand, and unforgettable. In 20+ languages."
      occasionName={OCCASION_NAME}
      occasionSlug={CATEGORY_SLUG}
      songs={songs}
      totalSongs={totalSongs}
      faqItems={OCCASION_FAQ["corporate-events"] ?? HOMEPAGE_FAQ}
      structuredData={structuredData}
      introHeading={OCCASION_INTROS["corporate-events"]?.heading}
      introContent={OCCASION_INTROS["corporate-events"]?.content}
    />
  );
}
