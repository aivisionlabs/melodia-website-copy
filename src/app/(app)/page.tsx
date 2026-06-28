import type { Metadata } from "next";
import { StructuredData } from "@/components/StructuredData";
import HeroVideoSection from "@/components/HeroVideoSection";
import HomePageContent from "./HomePageContent";
import { homepageFAQ } from "@/lib/seo/faq";
import {
  getSongsByCategoryAction,
  getCategoriesWithCountsAction,
} from "@/lib/actions/category.actions";

export const metadata: Metadata = {
  title:
    "Melodia — Heartfelt, Personalized Songs for Every Occasion | India",
  description:
    "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu & 20+ Indian languages. Musically capturing emotions and making every occasion unforgettable. Songs from INR 199.",
  keywords:
    "personalized songs, personalized song India, custom song Hindi, AI song generator India, personalized songs in Hindi, custom music, wedding songs, birthday songs, anniversary songs, romantic songs, friendship songs, party songs, kids songs, apology songs, corporate event songs, farewell songs, lullaby songs, sibling songs, congratulations songs, thank you songs, motivational songs, devotional songs, holiday songs, parent songs, Indian wedding songs, Sangeet songs, Haldi ceremony music, Mehendi songs, personalized gift, musical gift, AI song creation, custom song gift, personalized song gift India, create song online India",
  authors: [{ name: "Melodia" }],
  creator: "Melodia",
  publisher: "Melodia",
  openGraph: {
    title: "Melodia — Heartfelt, Personalized Songs for Your Loved Ones",
    description:
      "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu & 20+ Indian languages. Making every occasion unforgettable. Songs from INR 199.",
    url: "https://www.melodia-songs.com",
    siteName: "Melodia",
    images: [
      {
        url: "/images/melodia-logo-og.jpeg",
        width: 792,
        height: 446,
        alt: "Melodia — Heartfelt, Personalized Songs for Your Loved Ones",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Melodia — Heartfelt, Personalized Songs in 20+ Indian Languages",
    description:
      "We create heartfelt, personalized songs for your loved ones — in Hindi, Tamil, Telugu & 20+ Indian languages. Making every occasion unforgettable.",
    images: ["/images/melodia-logo-og.jpeg"],
    creator: "@melodia_songs",
    site: "@melodia_songs",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// HowTo structured data for the 3-step process
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Create a Personalized Song with Melodia",
  description:
    "Create a unique, heartfelt song for your loved ones in 3 simple steps. Perfect for weddings, birthdays, anniversaries, and every special occasion.",
  image: {
    "@type": "ImageObject",
    url: "https://www.melodia-songs.com/images/melodia-howto-image.png",
    width: 1080,
    height: 1920,
  },
  video: {
    "@type": "VideoObject",
    name: "How Melodia Works - Create Personalized Songs",
    description:
      "Watch how easy it is to create a personalized song with Melodia.",
    thumbnailUrl: "https://www.melodia-songs.com/media/thumbnai.png",
    contentUrl: "https://www.melodia-songs.com/media/melodia-how-to-video.mp4",
    uploadDate: "2024-12-21T00:00:00Z",
    duration: "PT1M",
  },
  totalTime: "PT24H",
  estimatedCost: {
    "@type": "MonetaryAmount",
    currency: "INR",
    value: "199",
  },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Share Your Story & Occasion",
      text: "Tell us about your favorite person and what makes your bond special. Include names, occasions, and memorable moments you want to celebrate.",
      url: "https://www.melodia-songs.com/#how-it-works-section",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Compose Your Song",
      text: "Review AI generated lyrics and music style or let our creative team craft beautiful lyrics and studio-quality music that brings your story to life.",
      url: "https://www.melodia-songs.com/#how-it-works-section",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Gift Your Song",
      text: "Receive a beautiful, personalized song ready to be shared and cherished. Download and gift it to your loved ones.",
      url: "https://www.melodia-songs.com/#how-it-works-section",
    },
  ],
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.melodia-songs.com/#services",
  name: "Personalized Song Creation",
  description:
    "Create custom, personalized songs for weddings, birthdays, anniversaries, and every special occasion. AI-powered lyrics with studio-quality music.",
  provider: {
    "@type": "Organization",
    name: "Melodia",
    url: "https://www.melodia-songs.com",
  },
  serviceType: "Music Creation",
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Song Creation Packages",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "NameDrop",
          description:
            "Pick a ready-made song and have your name woven into the lyrics, ready in under 2 minutes",
        },
        price: "199",
        priceCurrency: "INR",
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Fully Custom",
          description:
            "AI-written personalized lyrics and music you can review and tweak before it's made",
        },
        price: "599",
        priceCurrency: "INR",
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Pro Studio",
          description:
            "Expert-crafted lyrics and song with revisions, delivered within 24 hours",
        },
        price: "1499",
        priceCurrency: "INR",
      },
    ],
  },
};

export default async function HomePage() {
  // Step 1: Get real category slugs from DB (same way the library does)
  const catsResult = await getCategoriesWithCountsAction();
  const categories = catsResult.success ? catsResult.categories : [];

  const birthdaySlug =
    categories.find((c) => c.name.toLowerCase().includes("birthday"))?.slug ??
    "Birthday";
  const anniversarySlug =
    categories.find((c) => c.name.toLowerCase().includes("anniversary"))
      ?.slug ?? "Anniversary";
  const romanticSlug =
    categories.find((c) => c.name.toLowerCase().includes("romantic"))?.slug ??
    "Romantic";
  const lullabySlug =
    categories.find(
      (c) =>
        c.name.toLowerCase().includes("lullaby") ||
        c.name.toLowerCase().includes("lullabies"),
    )?.slug ?? "Lullabys";
  // Step 2: Fetch all categories in parallel
  const [birthdayResult, anniversaryResult, romanticResult, lullabyResult] =
    await Promise.all([
      getSongsByCategoryAction(birthdaySlug, 15, 0),
      getSongsByCategoryAction(anniversarySlug, 15, 0),
      getSongsByCategoryAction(romanticSlug, 15, 0),
      getSongsByCategoryAction(lullabySlug, 15, 0),
    ]);

  const birthdaySongs = birthdayResult.success ? birthdayResult.songs : [];
  const anniversarySongs = anniversaryResult.success
    ? anniversaryResult.songs
    : [];
  const romanticSongs = romanticResult.success ? romanticResult.songs : [];
  const lullabySongs = lullabyResult.success ? lullabyResult.songs : [];

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col overflow-x-hidden relative">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <StructuredData type="aiPlatform" />
      <StructuredData type="aggregateRating" />
      <StructuredData type="localBusiness" />
      <StructuredData type="faq" faqItems={homepageFAQ} />

      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-text-teal focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Video Hero — full-bleed from top; logo + desktop nav overlay inside hero (no separate header bar) */}
      <HeroVideoSection />

      {/* Netflix-style horizontal content sections */}
      <HomePageContent
        birthdaySongs={birthdaySongs}
        anniversarySongs={anniversarySongs}
        romanticSongs={romanticSongs}
        lullabySongs={lullabySongs}
        birthdaySlug={birthdaySlug}
        anniversarySlug={anniversarySlug}
        romanticSlug={romanticSlug}
        lullabySlug={lullabySlug}
      />
    </div>
  );
}
