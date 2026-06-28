import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Music, Zap, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";
import { LanguagePageSongs } from "@/components/LanguagePageSongs";
import { LANGUAGE_PAGES } from "@/lib/seo/language-pages";
import { buildLanguagePageDescription } from "@/lib/seo/language-utils";
import { type FAQItem } from "@/lib/seo/faq";
import { FAQ } from "@/components/FAQ";
import { getSongsByLanguageAction } from "@/lib/actions/language.actions";

export function generateStaticParams() {
  return LANGUAGE_PAGES.map((lang) => ({ language: lang.slug }));
}

type PageProps = {
  params: Promise<{ language: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { language } = await params;
  const langData = LANGUAGE_PAGES.find((l) => l.slug === language);
  if (!langData) return {};

  const title = `Personalized Songs in ${langData.name} (${langData.nativeName}) | Melodia India`;
  const description = buildLanguagePageDescription(langData);

  return {
    title,
    description,
    keywords: `personalized songs ${langData.name}, custom songs ${langData.name}, ${langData.name} songs India, AI song generator ${langData.name}, ${langData.name} wedding songs, ${langData.name} birthday songs, Melodia ${langData.name}`,
    openGraph: {
      title,
      description,
      url: `https://www.melodia-songs.com/languages/${langData.slug}`,
      images: [{ url: "/images/melodia-logo-og.jpeg", width: 792, height: 446, alt: title }],
    },
    twitter: {
      title,
      description,
      images: ["/images/melodia-logo-og.jpeg"],
    },
    alternates: {
      canonical: `/languages/${langData.slug}`,
    },
  };
}

export default async function LanguagePage({ params }: PageProps) {
  const { language } = await params;
  const langData = LANGUAGE_PAGES.find((l) => l.slug === language);
  if (!langData) notFound();

  const songsRes = await getSongsByLanguageAction(langData.name, 12, 0);
  const songs = songsRes.success ? songsRes.songs || [] : [];
  const totalSongs = songsRes.success ? songsRes.total : 0;

  const itemListItems = songs.slice(0, 12).map((song) => {
    const variants: any = song.suno_variants as any;
    const imageUrl =
      variants && typeof variants === "object" && "sourceImageUrl" in variants
        ? variants.sourceImageUrl
        : Array.isArray(variants) && variants.length > 0
          ? variants[0]?.sourceImageUrl
          : null;

    return {
      name: song.title,
      url: `/song/${song.slug}`,
      imageUrl,
    };
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Personalized Songs in ${langData.name} - Melodia`,
    description: `Create personalized songs in ${langData.name} for weddings, birthdays, anniversaries, and every occasion in India. AI-powered custom song creation by Melodia.`,
    provider: {
      "@type": "Organization",
      name: "Melodia",
      url: "https://www.melodia-songs.com",
    },
    serviceType: "Music Creation",
    areaServed: { "@type": "Country", name: "India" },
    url: `https://www.melodia-songs.com/languages/${langData.slug}`,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "199",
      highPrice: "1499",
      priceCurrency: "INR",
    },
  };

  const languageFAQ: FAQItem[] = [
    {
      question: `Can I create personalized songs in ${langData.name}?`,
      answer: `Yes! Melodia creates personalized songs in ${langData.name} (${langData.nativeName}) for weddings, birthdays, anniversaries, and every occasion. Our AI understands ${langData.name} poetic conventions and cultural nuances, crafting authentic lyrics produced with professional vocals and music. Starting at INR 199.`,
    },
    {
      question: `Can I mix ${langData.name} with English in a song?`,
      answer: `Absolutely! Many users create multilingual songs that blend ${langData.name} with English or other Indian languages. Just specify your preferred language mix when creating your song on Melodia.`,
    },
    {
      question: `What occasions can I create ${langData.name} songs for?`,
      answer: `You can create ${langData.name} songs for any occasion — weddings, birthdays, anniversaries, romantic moments, festivals, farewells, corporate events, devotional purposes, and more. Melodia supports 22+ occasion categories.`,
    },
    {
      question: `How much does a personalized ${langData.name} song cost?`,
      answer: `Melodia offers three packages: NameDrop at INR 199 (a ready-made song with your name woven into the lyrics), Fully Custom at INR 599 (AI-written personalized lyrics and music), and Pro Studio at INR 1499 (expert-crafted with revisions). All packages support ${langData.name} song creation.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <StructuredData type="faq" faqItems={languageFAQ} />
      {itemListItems.length > 0 && (
        <StructuredData type="itemList" itemListItems={itemListItems} />
      )}

      <div className="hidden md:block"><Header /></div>

      <main className="flex-1">
        {/* Hero */}
        <section className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-center pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-20 px-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,209,102,0.14),rgba(0,0,0,0)_55%)]" />
          </div>

          <div className="relative z-10">
            <p className="text-primary-yellow font-semibold text-sm sm:text-base mb-3 tracking-wide uppercase">
              {langData.nativeName}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading max-w-4xl mx-auto leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-primary-yellow">
              {langData.introHeading}
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-8">
              Create custom songs in {langData.name} for weddings, birthdays, anniversaries
              &amp; every occasion. Melodia is India&apos;s AI-powered personalized song
              creation platform.
            </p>
            <Link href="/pricing">
              <Button
                size="lg"
                className="bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 font-bold text-lg px-8 py-6 rounded-xl shadow-xl"
              >
                <Zap className="mr-2 w-5 h-5 fill-text-teal" />
                Create Your {langData.name} Song
              </Button>
            </Link>
          </div>
        </section>

        {/* Intro Content */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-6 text-center">
              About {langData.name} Songs on Melodia
            </h2>
            <p className="text-text-teal/80 text-base sm:text-lg leading-relaxed mb-8">
              {langData.introContent}
            </p>

            {langData.samplePhrases.length > 0 && (
              <div className="bg-white/60 rounded-2xl p-6 border border-primary-yellow/20">
                <h3 className="text-lg font-semibold text-text-teal mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent-coral" />
                  Popular {langData.name} Song Greetings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {langData.samplePhrases.map((phrase) => (
                    <div key={phrase.occasion} className="text-center p-3 bg-white/80 rounded-xl">
                      <p className="text-sm text-text-teal/60 mb-1">{phrase.occasion}</p>
                      <p className="font-semibold text-text-teal">{phrase.phrase}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <LanguagePageSongs
          languageName={langData.name}
          languageSlug={langData.slug}
          nativeName={langData.nativeName}
          initialSongs={songs}
          totalSongs={totalSongs}
        />

        {/* Popular Occasions */}
        <section className="py-12 sm:py-16 px-4 bg-white/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-8 text-center">
              Popular Occasions for {langData.name} Songs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {langData.popularOccasions.map((occ) => {
                const labels: Record<string, string> = {
                  weddings: "Weddings",
                  birthday: "Birthdays",
                  anniversary: "Anniversaries",
                  romantic: "Romantic",
                  sangeet: "Sangeet",
                  haldi: "Haldi",
                  mehndi: "Mehndi",
                  "ring-ceremony": "Ring Ceremony",
                  lullaby: "Lullabies",
                  kids: "Kids Songs",
                  party: "Parties",
                  friendship: "Friendship",
                  apology: "Apology",
                  "corporate-events": "Corporate",
                  farewell: "Farewell",
                  siblings: "Siblings",
                  parents: "Parents",
                  congratulations: "Congratulations",
                  "thank-you": "Thank You",
                  motivational: "Motivational",
                  "devotional-spiritual": "Devotional",
                  "festive-holiday": "Festivals",
                };
                return (
                  <Link
                    key={occ}
                    href={`/occasions/${occ}`}
                    className="bg-white/70 border border-primary-yellow/20 rounded-xl p-4 text-center hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                  >
                    <Music className="w-6 h-6 text-accent-coral mx-auto mb-2" />
                    <p className="font-semibold text-text-teal text-sm">
                      {labels[occ] || occ} Songs
                    </p>
                    <p className="text-xs text-text-teal/60 mt-1">in {langData.name}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-8 text-center">
              How to Create a {langData.name} Song on Melodia
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Share Your Story", desc: `Tell us about the person, occasion, and memories. Choose ${langData.name} as your preferred language.` },
                { step: "2", title: "Review Lyrics", desc: `Our AI generates personalized ${langData.name} lyrics. Review, edit, and refine until perfect.` },
                { step: "3", title: "Get Your Song", desc: `Receive your studio-quality ${langData.name} song with professional vocals and music.` },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-r from-primary-yellow to-accent-coral rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-teal mb-2">{item.title}</h3>
                  <p className="text-text-teal/70 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/pricing">
                <Button className="bg-accent-coral text-white font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg">
                  <Star className="mr-2 w-5 h-5" />
                  Create Your {langData.name} Song — From INR 199
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQ
          items={languageFAQ}
          title={`${langData.name} Song FAQs`}
          containerClassName="px-4 pb-16 bg-transparent"
        />
      </main>

      <Footer />
    </div>
  );
}
