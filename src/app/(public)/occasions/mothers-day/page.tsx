import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Heart, Mic2, Sparkles } from "lucide-react";
import { StructuredData } from "@/components/StructuredData";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { FAQ } from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/OptimizedLogo";
import Footer from "@/components/Footer";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import MothersDaySongsSection from "./MothersDaySongsSection";

const SONGS_PER_PAGE = 12;
const CATEGORY_SLUG = "mothers-day";

const HERO_IMAGE_MOBILE =
  "/images/occasions/mothers-day/mothers-day-mobile.png";
const HERO_IMAGE_DESKTOP =
  "/images/occasions/mothers-day/mothers-day-desktop.png";
const WALL_OF_MOM_IMAGE = "/images/occasions/mothers-day/wall-of-mom.png";

const mothersDayFaqs = OCCASION_FAQ["mothers-day"] ?? HOMEPAGE_FAQ;

const BASE_URL = "https://www.melodia-songs.com";

export const metadata: Metadata = {
  title: "AI Mother's Day Songs, Personalized & Heartfelt | Melodia",
  description:
    "Create a personalized Mother's Day song for your mom in minutes. Add your memories, choose a style, and gift her a song she'll never forget.",
  keywords:
    "mother's day song, personalized mother's day gift, custom song for mom, mother's day gift India, gift for mom who has everything, last minute mother's day gift, hindi song for mom, song for nani dadi, mother's day gift for wife, AI song mother's day",
  alternates: {
    canonical: `${BASE_URL}/occasions/mothers-day`,
  },
  openGraph: {
    title: "AI Mother's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Create a personalized Mother's Day song for your mom in minutes. Add your memories, choose a style, and gift her a song she'll never forget.",
    url: `${BASE_URL}/occasions/mothers-day`,
    images: [
      {
        url: `${BASE_URL}/images/occasions/mothers-day/mothers-day.png`,
        width: 1024,
        height: 1024,
        alt: "Mother and daughter smiling together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Mother's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Gift your mom a personalized song this Mother's Day with Melodia.",
    images: [`${BASE_URL}/images/occasions/mothers-day/mothers-day.png`],
  },
};

export default async function MothersDayPage() {
  const songsRes = await getSongsByCategoryAction(
    CATEGORY_SLUG,
    SONGS_PER_PAGE,
    0,
  );
  const songs = songsRes.success ? songsRes.songs : [];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Mother's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Create a personalized Mother's Day song for your mom in minutes. Add your memories, choose a style, and gift her a song she'll never forget.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: BASE_URL,
    },
    serviceType: "Music Creation",
    category: "Mother's Day Gifts",
    url: `${BASE_URL}/occasions/mothers-day`,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "199",
      highPrice: "1499",
      priceCurrency: "INR",
      offerCount: "3",
      availability: "https://schema.org/InStock",
    },
    areaServed: { "@type": "Country", name: "India" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <StructuredData type="faq" faqItems={mothersDayFaqs} />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Occasions", url: `${BASE_URL}/occasions` },
          { name: "Mother's Day", url: `${BASE_URL}/occasions/mothers-day` },
        ]}
      />
      <div className="min-h-screen bg-secondary-cream flex flex-col">
        <main className="flex-1">
          {/* Hero */}
          <section className="relative w-full overflow-hidden bg-text-teal h-[70svh] md:h-[88svh] min-h-[500px]">
            <div className="absolute inset-0">
              <Image
                src={HERO_IMAGE_MOBILE}
                alt="Mother and daughter smiling together"
                fill
                priority
                className="object-cover object-center md:hidden"
                sizes="100vw"
              />
              <Image
                src={HERO_IMAGE_DESKTOP}
                alt="Mother and daughter smiling together"
                fill
                priority
                className="hidden md:block object-cover object-center"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/70" />
            </div>

            <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 flex items-start justify-between gap-3">
              <Link href="/" aria-label="Go to homepage">
                <HeaderLogo
                  alt="Melodia"
                  className="!w-24 sm:!w-24 md:!w-28 drop-shadow-md"
                />
              </Link>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-6 md:px-8 lg:px-12 pb-9 md:pb-16 max-w-screen-2xl mx-auto">
              <h1 className="text-white font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] max-w-xl">
                Gift your mother an emotion, not just a song.
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-3 max-w-md font-body">
                Personalize a custom track with your shared moments for this
                Mother&apos;s Day.
              </p>
              <Link
                href="/create?plan=package_2&occasion=Mother's Day"
                aria-label="Start Creating"
              >
                <Button className="mt-5 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-6 py-3 h-auto font-semibold text-sm sm:text-base shadow-xl">
                  Start Creating
                </Button>
              </Link>
            </div>
          </section>

          {/* Mom's Selection — library-style cards in a horizontal scroll strip */}
          <MothersDaySongsSection songs={songs} />

          {/* Wall of Mom */}
          <section
            className="bg-[#f9eef0] py-8 sm:py-10"
            aria-label="Wall of Mom"
          >
            <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-5">
              <Image
                src={WALL_OF_MOM_IMAGE}
                alt="Wall of Mom — Happy tears only. Grid of mothers and families celebrating together."
                width={471}
                height={836}
                className="w-full h-auto rounded-2xl shadow-md border border-text-teal/5"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 42rem, 44rem"
              />
            </div>
          </section>

          {/* Why a song? */}
          <section className="py-14 sm:py-16 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                Why give a Mother&apos;s Day song?
              </h2>

              <div className="mt-8 space-y-8">
                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Mic2 className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Original Lyrics
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    We weave your specific names, dates, and memories into every
                    line.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Studio Quality
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    AI-powered voice with professional mix for a radio-ready
                    sound.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Instant Memory
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    Beauty in minutes, remember forever. A gift that never
                    fades.
                  </p>
                </div>
              </div>

              <Link
                href="/create?plan=package_2&occasion=Mother's Day"
                aria-label="Create a Mother's Day song"
              >
                <Button className="mt-10 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-7 py-3 h-auto font-semibold shadow-elegant">
                  Gift a song
                </Button>
              </Link>
            </div>
          </section>

          {/* Mother's Day Gift Guides — blog cross-links */}
          <section className="py-12 sm:py-14 bg-white" aria-label="Mother's Day gift guides">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-teal text-center mb-8">
                Mother&apos;s Day Gift Guides
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { slug: "mothers-day-gift-for-mom-who-has-everything", label: "Gift for Mom Who Has Everything" },
                  { slug: "first-mothers-day-gift-for-wife", label: "First Mother's Day Gift for Wife" },
                  { slug: "mothers-day-gift-for-nani-dadi-grandmother", label: "Gift for Nani & Dadi" },
                  { slug: "last-minute-mothers-day-gift-instant-digital", label: "Last-Minute Instant Gift" },
                  { slug: "mothers-day-gift-for-nurse-mom", label: "Gift for Nurse Mom" },
                  { slug: "mothers-day-gift-for-teacher-mom", label: "Gift for Teacher Mom" },
                  { slug: "mothers-day-song-in-hindi-for-maa", label: "माँ के लिए हिंदी गाना" },
                  { slug: "why-custom-song-beats-flowers-for-mothers-day", label: "Why a Song Beats Flowers" },
                  { slug: "mothers-day-gift-from-dog-to-mom-pet-mom", label: "Song from Dog to Mom" },
                  { slug: "mothers-day-gift-for-stepmom", label: "Gift for Stepmom" },
                  { slug: "mothers-day-gift-for-saasu-maa-maaji", label: "Gift for Saasu Maa / Maaji" },
                  { slug: "mothers-day-gift-ideas-2026", label: "Mother's Day Gift Ideas 2026" },
                ].map(({ slug, label }) => (
                  <li key={slug}>
                    <Link
                      href={`/blog/${slug}`}
                      className="flex items-center gap-2 text-sm font-medium text-text-teal hover:text-accent-coral transition-colors group"
                    >
                      <span className="text-accent-coral group-hover:translate-x-0.5 transition-transform">→</span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <FAQ
            items={mothersDayFaqs}
            title={"Mother's Day song FAQs"}
            containerClassName="pb-14 sm:pb-16 pt-6 sm:pt-8 bg-secondary-cream"
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
