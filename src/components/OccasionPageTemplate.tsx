"use client";

import { useMemo, useState, useEffect } from "react";
import { trackOccasionEvent } from "@/lib/analytics";
import Link from "next/link";
import Image from "next/image";
import { Zap, Music, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongCardsGrid } from "@/components/SongCardsGrid";
import { OccasionFeatures } from "@/components/OccasionFeatures";
import { OccasionHowItWorks } from "@/components/OccasionHowItWorks";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { FAQ } from "@/components/FAQ";
import { RelatedGuides } from "@/components/RelatedGuides";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LyricalWavesBackground from "@/components/LyricalWavesBackground";
import { StructuredData } from "@/components/StructuredData";
import { textualTestimonials } from "@/lib/textual-testimonials-data";
import { getSongsByCategoryAction } from "@/lib/actions/category.actions";
import type { Song } from "@/types";

interface OccasionPageTemplateProps {
  title?: string;
  description?: string;
  occasionName: string;
  occasionSlug: string;
  songs: Song[];
  totalSongs: number;
  faqItems: Array<{ question: string; answer: string }>;
  structuredData: any;
  introHeading?: string;
  introContent?: string;
}

export function OccasionPageTemplate({
  occasionName,
  occasionSlug,
  title = `AI ${occasionName} Song Generator - Melodia Songs`,
  description = `Create personalized ${occasionSlug.charAt(0).toUpperCase() + occasionSlug.slice(1)} songs with Melodia,
            India&apos;s AI-powered custom song creation platform. Generate
            lyrics and music in Hindi, Tamil, Telugu &amp; 20+ languages.`,
  songs: initialSongs,
  totalSongs,
  faqItems,
  structuredData,
  introHeading,
  introContent,
}: OccasionPageTemplateProps) {
  const SONGS_PER_PAGE = 12;

  const [songs, setSongs] = useState<Song[]>(initialSongs || []);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    trackOccasionEvent.viewOccasion(occasionName, occasionSlug);
  }, [occasionName, occasionSlug]);

  const hasMore = useMemo(() => {
    if (!totalSongs) return false;
    return songs.length < totalSongs;
  }, [songs.length, totalSongs]);

  const itemListItems = useMemo(() => {
    return songs.slice(0, 12).map((song) => {
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
  }, [songs]);

  const loadMoreSongs = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * SONGS_PER_PAGE;

      const res = await getSongsByCategoryAction(
        occasionSlug,
        SONGS_PER_PAGE,
        offset,
      );

      if (res.success) {
        setSongs((prev) => [...prev, ...(res.songs || [])]);
        setCurrentPage(nextPage);
      }
    } catch (e) {
      console.error("Failed to load more songs:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <StructuredData type="faq" faqItems={faqItems} />
      {itemListItems.length > 0 && (
        <StructuredData type="itemList" itemListItems={itemListItems} />
      )}

      <div className="hidden md:block">
        <Header />
      </div>

      <main className="flex-1 relative z-10">
        {/* Fold 1: Hero Section */}
        <section className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-center pt-12 sm:pt-16 md:pt-20 pb-20 sm:pb-24 md:pb-32 px-4 relative overflow-hidden">
          {/* subtle glow behind hero content for readability */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,209,102,0.14),rgba(0,0,0,0)_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),rgba(0,0,0,0)_60%)]" />
          </div>

          <h1 className="text-3xl mt-4 sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading max-w-4xl mx-auto leading-tight mb-6 relative">
            <span className="animate-fade-in text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-primary-yellow drop-shadow-[0_10px_30px_rgba(34,211,238,0.18)]">
              {title}
            </span>
          </h1>

          <p
            className="text-white/90 text-base sm:text-lg md:text-xl max-w-3xl mx-auto animate-fade-in mb-8 relative"
            style={{ animationDelay: "0.2s" }}
          >
            {description}
          </p>

          {/* CTA Section with Social Proof */}
          <div
            className="animate-fade-in flex flex-col items-center gap-6"
            style={{ animationDelay: "0.4s" }}
          >
            {/* Get Started Button */}
            <Link href="/pricing">
              <Button
                size="lg"
                className="bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 font-bold text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                onClick={() => trackOccasionEvent.clickOccasion(occasionName, occasionSlug, 'occasion_page_hero')}
              >
                <Zap className="mr-2 w-5 h-5 fill-text-teal" />
                Create Your Song Now
              </Button>
            </Link>

            {/* Promotional Offer */}
            <div className="flex items-center gap-2 text-white bg-black/30 border border-white/10 rounded-full px-4 py-2">
              <Gift className="w-5 h-5 text-emerald-400" />
              <span className="text-sm sm:text-base">
                <span className="text-emerald-300 font-semibold">
                  50% off on all song packages
                </span>
              </span>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 mt-4 bg-black/25 border border-white/10 rounded-full px-4 py-3">
              {/* Avatar Stack */}
              <div className="flex -space-x-3">
                {[
                  "/media/testimonial-images/ridha.jpg",
                  "/media/testimonial-images/shanaya.jpg",
                  "/media/testimonial-images/shruti.jpg",
                  "/media/testimonial-images/deepal.jpg",
                  "/media/testimonial-images/rohan.jpg",
                ].map((imagePath, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/40 relative overflow-hidden shadow-lg"
                  >
                    <Image
                      src={imagePath}
                      alt={`User ${index + 1}`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Rating and Social Proof Text */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 sm:w-5 sm:h-5 fill-primary-yellow text-primary-yellow drop-shadow"
                      aria-hidden="true"
                    />
                  ))}

                  <div
                    className="relative w-4 h-4 sm:w-5 sm:h-5"
                    aria-hidden="true"
                  >
                    <Star className="absolute inset-0 w-full h-full fill-white/20 text-white/20" />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: "80%" }}
                    >
                      <Star className="w-full h-full fill-primary-yellow text-primary-yellow drop-shadow" />
                    </div>
                  </div>

                  <span className="ml-1 text-white font-semibold text-sm sm:text-base">
                    4.8
                  </span>
                </div>
                <span className="text-white/80 text-sm sm:text-base">
                  <span className="font-bold text-white">500+</span> users
                  created songs
                </span>
              </div>
            </div>
          </div>

          <LyricalWavesBackground />
        </section>

        {/* Fold 2: Song List — directly below hero (matches mothers-day layout) */}
        <section className="py-16 sm:py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-teal font-heading mb-4">
                Discover our popular {occasionName} Songs
              </h2>
            </div>

            {songs.length > 0 ? (
              <>
                <SongCardsGrid
                  songs={songs}
                  pageContext={`occasion_${occasionSlug}`}
                  songsPerPage={SONGS_PER_PAGE}
                />

                {hasMore && (
                  <div className="flex flex-col items-center mt-12">
                    <Button
                      onClick={loadMoreSongs}
                      disabled={loadingMore}
                      className="bg-gradient-to-r from-primary-yellow to-accent-coral text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Loading more songs...
                        </>
                      ) : (
                        <>
                          <Music className="h-5 w-5 mr-2" />
                          Load More Songs ({songs.length} of {totalSongs})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-text-teal/60">
                  No songs available for this category yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Answer-First Intro Content for SEO & LLMO */}
        {introHeading && introContent && (
          <section className="py-12 sm:py-16 px-4 bg-white/40">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-6 text-center">
                {introHeading}
              </h2>
              <p className="text-text-teal/80 text-base sm:text-lg leading-relaxed">
                {introContent}
              </p>
            </div>
          </section>
        )}

        {/* Fold 3: Features */}
        <OccasionFeatures occasionName={occasionName} />

        {/* Fold 4: How It Works */}
        <OccasionHowItWorks />

        {/* Fold 5: Testimonials */}
        <section className="py-16 sm:py-24 bg-white/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-teal font-heading mb-4">
                Thousands of people generated songs, music and more
              </h2>
            </div>

            <TestimonialsCarousel testimonials={textualTestimonials} />
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ
          items={faqItems}
          title={`${occasionName} Song FAQs`}
          containerClassName="px-4 pb-20 bg-transparent"
        />

        {/* Related blog guides — internal-linking cluster (renders nothing if empty) */}
        <RelatedGuides
          occasionSlug={occasionSlug}
          heading={`${occasionName} Song Guides`}
        />
      </main>

      <Footer />
    </div>
  );
}
