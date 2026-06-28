import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mic2, Sparkles, Heart, Music2 } from "lucide-react";
import { StructuredData } from "@/components/StructuredData";
import { FAQ } from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/OptimizedLogo";
import Footer from "@/components/Footer";
import { getTemplatedSongsByCategoryAction } from "@/lib/actions/category.actions";
import FathersDaySongsSection from "./FathersDaySongsSection";

const BASE_URL = "https://www.melodia-songs.com";

const FATHERS_DAY_FAQS = [
  {
    question: "How does the Father's Day song creation work?",
    answer:
      "Simply tell us your dad's nickname, pick a musical vibe, describe his signature quirks, and share a bit of his life journey. Our AI turns all of this into fully custom lyrics and music. Ready in minutes.",
  },
  {
    question: "What languages can the Father's Day song be in?",
    answer:
      "You can choose from Hindi, English, Telugu, Punjabi, Tamil, Kannada, Marathi, Bengali, Gujarati, and more. You can even mix languages for a multilingual song.",
  },
  {
    question: "Do I need to write any lyrics myself?",
    answer:
      "No writing needed! You just answer 4 simple questions about your dad and our AI crafts the lyrics for you.",
  },
  {
    question: "How quickly will the song be ready?",
    answer:
      "Once you submit and pay, your personalized Father's Day song is typically ready within 2–5 minutes.",
  },
  {
    question: "Can I share the song directly with my dad?",
    answer:
      "Yes! You'll receive a shareable link and can download the audio file to send via WhatsApp, email, or play it in person.",
  },
];

export const metadata: Metadata = {
  title: "AI Father's Day Songs, Personalized & Heartfelt | Melodia",
  description:
    "Create a personalized Father's Day song for your dad in minutes. Tell us his story, pick a vibe, and gift him a custom song he'll treasure forever.",
  keywords:
    "father's day song, personalized father's day gift, custom song for dad, father's day gift India, gift for dad, hindi song for papa, song for baba appa, AI song father's day, father's day 2025",
  alternates: {
    canonical: `${BASE_URL}/occasions/fathers-day`,
  },
  openGraph: {
    title: "AI Father's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Create a personalized Father's Day song for your dad in minutes. Tell us his story, pick a vibe, and gift him a custom song he'll treasure forever.",
    url: `${BASE_URL}/occasions/fathers-day`,
    images: [
      {
        url: `${BASE_URL}/images/occasions/family.png`,
        width: 1024,
        height: 1024,
        alt: "Father and child — Father's Day song by Melodia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Father's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Gift your dad a personalized song this Father's Day with Melodia.",
    images: [`${BASE_URL}/images/occasions/family.png`],
  },
};

const SONGS_PER_PAGE = 12;
const CATEGORY_SLUG = "fathers-day";

const CTAButton = ({ className }: { className?: string }) => (
  <Link href="/create-song/fathers-day" aria-label="Create a Father's Day song">
    <Button
      className={`rounded-full bg-accent-coral text-white hover:bg-accent-coral/90 px-7 py-3 h-auto font-semibold shadow-xl ${className ?? ""}`}
    >
      Create His Song →
    </Button>
  </Link>
);

export default async function FathersDayPage() {
  const songsRes = await getTemplatedSongsByCategoryAction(
    CATEGORY_SLUG,
    SONGS_PER_PAGE,
  );
  const songs = songsRes.success ? songsRes.songs : [];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Father's Day Songs, Personalized & Heartfelt | Melodia",
    description:
      "Create a personalized Father's Day song for your dad in minutes. Tell us his story, pick a vibe, and gift him a custom song he'll treasure forever.",
    provider: { "@type": "Organization", name: "Melodia", url: BASE_URL },
    serviceType: "Music Creation",
    category: "Father's Day Gifts",
    url: `${BASE_URL}/occasions/fathers-day`,
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
      <StructuredData type="faq" faqItems={FATHERS_DAY_FAQS} />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Occasions", url: `${BASE_URL}/occasions` },
          { name: "Father's Day", url: `${BASE_URL}/occasions/fathers-day` },
        ]}
      />

      <div className="min-h-screen bg-secondary-cream flex flex-col">
        <main className="flex-1">
          {/* Hero */}
          <section className="relative w-full overflow-hidden bg-text-teal h-[70svh] md:h-[88svh] min-h-[500px]">
            <div className="absolute inset-0">
              <Image
                src="/images/occasions/fathers-day/fathers-day-hero.png"
                alt="Father taking his son for a ride on his shoulders"
                fill
                priority
                className="object-cover object-center"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/70" />
            </div>

            {/* Nav */}
            <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 flex items-start justify-between gap-3">
              <Link href="/" aria-label="Go to homepage">
                <HeaderLogo
                  alt="Melodia"
                  className="!w-24 sm:!w-24 md:!w-28 drop-shadow-md"
                />
              </Link>
            </div>

            {/* Hero copy */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-6 md:px-8 lg:px-12 pb-9 md:pb-16 max-w-screen-2xl mx-auto">
              <h1 className="text-white font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] max-w-xl">
                Gift your father an emotion, not just a card.
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-3 max-w-md font-body">
                A fully personalized song, written from your heart, powered by
                AI. Ready in minutes.
              </p>
              <div className="mt-5">
                <CTAButton />
              </div>
            </div>
          </section>

          {/* Dad's Selection — library-style cards in a horizontal scroll strip */}
          <FathersDaySongsSection songs={songs} />

          {/* Wall of Dad */}
          <section className="bg-white">
            <div className="mx-auto w-full max-w-md px-4 sm:px-0">
              <Image
                src="/images/occasions/fathers-day/wall-of-father.png"
                alt="Wall of Dad — Father's Day song testimonials"
                width={484}
                height={1048}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 448px"
              />
            </div>
            <div className="px-4 sm:px-6 pb-14 sm:pb-16 pt-8 flex justify-center">
              <CTAButton />
            </div>
          </section>

          {/* How it works */}
          <section className="py-4 sm:py-4 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                4 steps. A song he&apos;ll never forget.
              </h2>
              <p className="mt-3 text-sm text-text-teal/60 font-body max-w-md mx-auto">
                No writing skills needed. Just tell us his story.
              </p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                {[
                  {
                    num: "01",
                    title: "His Title",
                    desc: "Papa, Dad, Appa, Baba — pick how you call him at home.",
                  },
                  {
                    num: "02",
                    title: "The Vibe",
                    desc: "Nostalgic acoustic, upbeat, anthemic, or ghazal — choose his musical soul.",
                  },
                  {
                    num: "03",
                    title: "His Superpower",
                    desc: "The Chai King? The Secret Banker? The Master Fixer? Capture his unique magic.",
                  },
                  {
                    num: "04",
                    title: "His Journey",
                    desc: "From his hometown to where he built the family — every mile becomes a lyric.",
                  },
                ].map((step) => (
                  <div
                    key={step.num}
                    className="flex items-start gap-4 p-5 rounded-2xl border border-text-teal/10 bg-secondary-cream"
                  >
                    <span className="text-3xl font-black text-accent-coral/30 font-heading leading-none">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="font-heading font-bold text-text-teal text-base">
                        {step.title}
                      </h3>
                      <p className="text-sm text-text-teal/60 mt-1 font-body">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <CTAButton />
              </div>
            </div>
          </section>

          {/* Why a song */}
          <section className="py-14 sm:py-16 bg-secondary-cream">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                Why give a Father&apos;s Day song?
              </h2>

              <div className="mt-8 space-y-8">
                {[
                  {
                    Icon: Mic2,
                    title: "Original Lyrics",
                    desc: "We weave your dad's name, quirks, and journey into every line.",
                  },
                  {
                    Icon: Sparkles,
                    title: "Studio Quality",
                    desc: "AI-powered voice with a professional mix.",
                  },
                  {
                    Icon: Music2,
                    title: "His Musical Style",
                    desc: "From ghazal to anthemic rock, we match his personality.",
                  },
                  {
                    Icon: Heart,
                    title: "A Gift That Lasts",
                    desc: "A card gets forgotten. A song gets replayed for years.",
                  },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} className="flex flex-col items-center">
                    <span className="h-12 w-12 rounded-full bg-primary-yellow/20 text-text-teal flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="mt-3 text-base sm:text-lg font-heading font-semibold text-text-teal">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-text-teal/70 max-w-md font-body">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing callout */}
          <section className="py-10 bg-text-teal text-white">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2 font-body">
                Starting at
              </p>
              <p className="text-5xl text-white font-heading">₹599</p>
              <p className="text-white/70 text-sm mt-2 font-body">
                Full AI custom song with review, 2 versions, and 1 free
                revision.
              </p>
              <div className="mt-6">
                <Link href="/create-song/fathers-day">
                  <Button className="rounded-full bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 px-8 py-3 h-auto font-bold shadow-xl">
                    Create His Song →
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <FAQ
            items={FATHERS_DAY_FAQS}
            title="Father's Day song FAQs"
            containerClassName="pb-14 sm:pb-16 pt-6 sm:pt-8 bg-secondary-cream"
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
