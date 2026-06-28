import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cake, Mic2, Sparkles } from "lucide-react";
import { StructuredData } from "@/components/StructuredData";
import { HOMEPAGE_FAQ, OCCASION_FAQ } from "@/lib/seo/faq";
import { FAQ } from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/OptimizedLogo";
import Footer from "@/components/Footer";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import AdultBirthdaySongsSection from "./AdultBirthdaySongsSection";

const SONGS_PER_PAGE = 12;
const CATEGORY_SLUG = "adult-birthday";

const HERO_IMAGE = "/images/occasions/adult-birthday.png";
const WALL_OF_JOY_IMAGE = "/images/occasions/adult-birthday/wall-of-joy.png";

const adultBirthdayFaqs = OCCASION_FAQ[CATEGORY_SLUG] ?? HOMEPAGE_FAQ;

const BASE_URL = "https://www.melodia-songs.com";

export const metadata: Metadata = {
  title: "AI Birthday Songs for Adults, Personalized | Melodia",
  description:
    "Create a personalized birthday song for the adult in your life. Add their name, inside jokes, and memories — gift a song they'll never forget.",
  keywords:
    "birthday song for adults, personalized birthday song, custom birthday song, birthday gift for him, birthday gift for her, milestone birthday song, 30th birthday song, 50th birthday song, hindi birthday song, AI birthday song",
  alternates: {
    canonical: `${BASE_URL}/occasions/adult-birthday`,
  },
  openGraph: {
    title: "AI Birthday Songs for Adults, Personalized | Melodia",
    description:
      "Create a personalized birthday song for the adult in your life. Add their name, inside jokes, and memories — gift a song they'll never forget.",
    url: `${BASE_URL}/occasions/adult-birthday`,
    images: [
      {
        url: `${BASE_URL}/images/occasions/adult-birthday.png`,
        width: 1706,
        height: 922,
        alt: "Friends celebrating an adult birthday together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Birthday Songs for Adults, Personalized | Melodia",
    description:
      "Gift a personalized birthday song for the adult in your life with Melodia.",
    images: [`${BASE_URL}/images/occasions/adult-birthday.png`],
  },
};

export default async function AdultBirthdayPage() {
  const songsRes = await getSongsByCategoryAction(
    CATEGORY_SLUG,
    SONGS_PER_PAGE,
    0,
  );
  const songs = songsRes.success ? songsRes.songs : [];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Birthday Songs for Adults, Personalized | Melodia",
    description:
      "Create a personalized birthday song for the adult in your life. Add their name, inside jokes, and memories — gift a song they'll never forget.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: BASE_URL,
    },
    serviceType: "Music Creation",
    category: "Birthday Gifts",
    url: `${BASE_URL}/occasions/adult-birthday`,
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
      <StructuredData type="faq" faqItems={adultBirthdayFaqs} />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Occasions", url: `${BASE_URL}/occasions` },
          {
            name: "Adult Birthday",
            url: `${BASE_URL}/occasions/adult-birthday`,
          },
        ]}
      />
      <div className="min-h-screen bg-secondary-cream flex flex-col">
        <main className="flex-1">
          <section className="relative w-full overflow-hidden bg-text-teal h-[70svh] md:h-[88svh] min-h-[500px]">
            <div className="absolute inset-0">
              <Image
                src={HERO_IMAGE}
                alt="Friends raising a toast at an adult birthday celebration"
                fill
                priority
                className="object-cover object-center"
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
                Make their birthday unforgettable.
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-3 max-w-md font-body">
                A heartfelt, personalized track built from your shared memories,
                ready before the candles are lit.
              </p>
              <Link
                href="/create?plan=package_2&occasion=Birthday"
                aria-label="Start Creating"
              >
                <Button className="mt-5 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-6 py-3 h-auto font-semibold text-sm sm:text-base shadow-xl">
                  Start Creating
                </Button>
              </Link>
            </div>
          </section>

          <AdultBirthdaySongsSection songs={songs} />

          {/* <section
            className="bg-[#fff8ee] py-8 sm:py-10"
            aria-label="Wall of Joy"
          >
            <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-5">
              <Image
                src={WALL_OF_JOY_IMAGE}
                alt="Wall of Joy — Grid of friends and families celebrating birthdays together."
                width={471}
                height={836}
                className="w-full h-auto rounded-2xl shadow-md border border-text-teal/5"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 42rem, 44rem"
              />
            </div>
          </section> */}

          <section className="py-14 sm:py-16 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                Why give a personalized birthday song?
              </h2>

              <div className="mt-8 space-y-8">
                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Mic2 className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Their Name in Every Chorus
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    We weave their name, your inside jokes, and the moments only
                    you two share into every line.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Any Vibe You Want
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    From a hilarious roast anthem to an emotional tribute — pick
                    the mood and we'll match it.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Cake className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    A Memory That Lasts
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    Long after the party ends, they'll still have a song that is
                    only about them.
                  </p>
                </div>
              </div>

              <Link
                href="/create?plan=package_2&occasion=Birthday"
                aria-label="Create a birthday song"
              >
                <Button className="mt-10 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-7 py-3 h-auto font-semibold shadow-elegant">
                  Gift a song
                </Button>
              </Link>
            </div>
          </section>

          <section
            className="py-12 sm:py-14 bg-white"
            aria-label="Birthday gift guides"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-teal text-center mb-8">
                Birthday Gift Guides
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    slug: "personalized-birthday-song-for-best-friend",
                    label: "Birthday Song for Best Friend",
                  },
                  {
                    slug: "romantic-birthday-surprise-ideas-for-partner",
                    label: "Romantic Birthday Surprise for Your Partner",
                  },
                  {
                    slug: "personalized-18th-birthday-song",
                    label: "18th Birthday Song",
                  },
                  {
                    slug: "30th-birthday-celebration-ideas-milestone",
                    label: "Turning 30: Milestone Birthday Ideas",
                  },
                  {
                    slug: "surprise-birthday-party-personalized-song",
                    label: "Surprise Birthday Song",
                  },
                ].map(({ slug, label }) => (
                  <li key={slug}>
                    <Link
                      href={`/blog/${slug}`}
                      className="flex items-center gap-2 text-sm font-medium text-text-teal hover:text-accent-coral transition-colors group"
                    >
                      <span className="text-accent-coral group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <FAQ
            items={adultBirthdayFaqs}
            title={"Birthday song FAQs"}
            containerClassName="pb-14 sm:pb-16 pt-6 sm:pt-8 bg-secondary-cream"
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
