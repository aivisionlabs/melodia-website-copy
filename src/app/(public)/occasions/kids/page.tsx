import { Metadata } from "next";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { OCCASION_INTROS } from "@/lib/seo/occasion-intros";
import { OccasionPageTemplate } from "@/components/OccasionPageTemplate";

// Category slug that maps to this occasion in the database
const CATEGORY_SLUG = "kids";
const OCCASION_NAME = "Kids";

export const metadata: Metadata = {
  title: "AI Kids Songs, Personalized & Heartfelt | Melodia",
  description:
    "Generate personalized AI songs for kids in minutes. Custom lyrics & fun music featuring your child's name and interests in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
  keywords:
    "kids songs, personalized kids songs, custom kids song, AI kids song generator, AI song generation, children songs, kids birthday songs, kids achievement songs, personalized song, custom song generation, fun songs for children",
  openGraph: {
    title: "AI Kids Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for kids in minutes. Custom lyrics & fun music featuring your child's name and interests in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    url: "https://www.melodia-songs.com/occasions/kids",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "AI Kids Songs, Personalized & Heartfelt | Melodia",
      },
    ],
  },
  twitter: {
    title: "AI Kids Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for kids in minutes. Custom lyrics & fun music featuring your child's name and interests in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: {
    canonical: "/occasions/kids",
  },
};

export default async function KidsPage() {
  // Fetch songs filtered by the kids category
  const songsRes = await getSongsByCategoryAction(CATEGORY_SLUG, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Kids Songs, Personalized & Heartfelt | Melodia",
    description:
      "Generate personalized AI songs for kids in minutes. Custom lyrics & fun music featuring your child's name and interests in Hindi, Tamil, Telugu & 20+ languages. Starting ₹199.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "AI Music Creation",
    category: "Children's Music",
    url: "https://www.melodia-songs.com/occasions/kids",
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
      title="Make Your Child the Star of Their Own Song."
      description="Create fun, personalized songs for kids in Hindi, Tamil, Telugu, and 20+ languages. Celebrate their achievements, hobbies, and milestones."
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
