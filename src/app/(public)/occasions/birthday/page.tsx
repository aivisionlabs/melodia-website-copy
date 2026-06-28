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
import KidsBirthdaySongsSection from "./KidsBirthdaySongsSection";

const SONGS_PER_PAGE = 12;
const CATEGORY_SLUG = "birthday";

const HERO_IMAGE = "/images/occasions/kids-birthday-hero.png";
const WALL_OF_JOY_IMAGE = "/images/occasions/kids-birthday/wall-of-joy.png";

const kidsBirthdayFaqs = OCCASION_FAQ[CATEGORY_SLUG] ?? HOMEPAGE_FAQ;

const BASE_URL = "https://www.melodia-songs.com";

export const metadata: Metadata = {
  title: "AI Kids Birthday Songs, Personalized & Fun | Melodia",
  description:
    "Create a personalized birthday song for your child in minutes. Add their name, favourite things, and memories — gift a song they'll never forget.",
  keywords:
    "kids birthday song, personalized birthday song for kids, custom birthday song for child, birthday gift for kids India, first birthday song, hindi birthday song for kids, song for daughter birthday, song for son birthday, AI birthday song kids",
  alternates: {
    canonical: `${BASE_URL}/occasions/birthday`,
  },
  openGraph: {
    title: "AI Kids Birthday Songs, Personalized & Fun | Melodia",
    description:
      "Create a personalized birthday song for your child in minutes. Add their name, favourite things, and memories — gift a song they'll never forget.",
    url: `${BASE_URL}/occasions/birthday`,
    images: [
      {
        url: `${BASE_URL}/images/occasions/kids-birthday-hero.png`,
        width: 1706,
        height: 922,
        alt: "Child celebrating birthday with family",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Kids Birthday Songs, Personalized & Fun | Melodia",
    description: "Gift your child a personalized birthday song with Melodia.",
    images: [`${BASE_URL}/images/occasions/kids-birthday-hero.png`],
  },
};

export default async function KidsBirthdayPage() {
  const songsRes = await getSongsByCategoryAction(
    CATEGORY_SLUG,
    SONGS_PER_PAGE,
    0,
  );
  const songs = songsRes.success ? songsRes.songs : [];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Kids Birthday Songs, Personalized & Fun | Melodia",
    description:
      "Create a personalized birthday song for your child in minutes. Add their name, favourite things, and memories — gift a song they'll never forget.",
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: BASE_URL,
    },
    serviceType: "Music Creation",
    category: "Kids Birthday Gifts",
    url: `${BASE_URL}/occasions/birthday`,
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
      <StructuredData type="faq" faqItems={kidsBirthdayFaqs} />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Occasions", url: `${BASE_URL}/occasions` },
          { name: "Kids Birthday", url: `${BASE_URL}/occasions/birthday` },
        ]}
      />
      <div className="min-h-screen bg-secondary-cream flex flex-col">
        <main className="flex-1">
          <section className="relative w-full overflow-hidden bg-text-teal h-[70svh] md:h-[88svh] min-h-[500px]">
            <div className="absolute inset-0">
              <Image
                src={HERO_IMAGE}
                alt="Child celebrating birthday with balloons and family"
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
                Make their birthday unforgettable, with their name in the song.
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-3 max-w-md font-body">
                A fun, personalized track with their favourite things, ready
                before the cake arrives.
              </p>
              <Link
                href="/create?plan=package_2&occasion=Kids%20Birthday"
                aria-label="Start Creating"
              >
                <Button className="mt-5 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-6 py-3 h-auto font-semibold text-sm sm:text-base shadow-xl">
                  Start Creating
                </Button>
              </Link>
            </div>
          </section>

          <KidsBirthdaySongsSection songs={songs} />

          <section
            className="bg-[#fff8ee] py-8 sm:py-10"
            aria-label="Wall of Joy"
          >
            <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-5">
              <Image
                src={WALL_OF_JOY_IMAGE}
                alt="Wall of Joy — Happy faces only. Grid of kids and families celebrating birthdays together."
                width={471}
                height={836}
                className="w-full h-auto rounded-2xl shadow-md border border-text-teal/5"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 42rem, 44rem"
              />
            </div>
          </section>

          <section className="py-14 sm:py-16 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                Why give a kids birthday song?
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
                    We weave their name, age, hobbies, and silly habits into
                    every line.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                    Party-Ready Sound
                  </h3>
                  <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                    Upbeat, fun mixes they will want to play when the cake comes
                    out.
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
                    Long after the balloons pop, they will still have a song
                    that is only about them.
                  </p>
                </div>
              </div>

              <Link
                href="/create?plan=package_2&occasion=Kids%20Birthday"
                aria-label="Create a kids birthday song"
              >
                <Button className="mt-10 rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-7 py-3 h-auto font-semibold shadow-elegant">
                  Gift a song
                </Button>
              </Link>
            </div>
          </section>

          <section
            className="py-12 sm:py-14 bg-white"
            aria-label="Kids birthday gift guides"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-teal text-center mb-8">
                Kids Birthday Gift Guides
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    slug: "custom-birthday-song-for-kids",
                    label: "Custom Birthday Song for Kids",
                  },
                  {
                    slug: "first-birthday-song-for-baby",
                    label: "First Birthday Song for Baby",
                  },
                  {
                    slug: "personalized-birthday-song-for-daughter",
                    label: "Birthday Song for Daughter",
                  },
                  {
                    slug: "personalized-birthday-song-for-son",
                    label: "Birthday Song for Son",
                  },
                  {
                    slug: "birthday-song-for-kids-in-hindi",
                    label: "बच्चों के लिए हिंदी जन्मदिन गाना",
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
            items={kidsBirthdayFaqs}
            title={"Kids birthday song FAQs"}
            containerClassName="pb-14 sm:pb-16 pt-6 sm:pt-8 bg-secondary-cream"
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
