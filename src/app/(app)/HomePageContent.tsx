"use client";

import { trackPlayerEvent } from "@/lib/analytics";
import type { Song } from "@/types";

import OccasionCardsRow from "@/components/OccasionCardsRow";
import SocialProofRow from "@/components/SocialProofRow";
import HowItWorksRow from "@/components/HowItWorksRow";
import SongCategoryRow from "@/components/SongCategoryRow";
import TestimonialsRow from "@/components/TestimonialsRow";
import { FAQ } from "@/components/FAQ";
import Footer from "@/components/Footer";
import { HOMEPAGE_FAQ } from "@/lib/seo/faq";

interface HomePageContentProps {
  birthdaySongs: Song[];
  anniversarySongs: Song[];
  romanticSongs: Song[];
  lullabySongs: Song[];
  birthdaySlug: string;
  anniversarySlug: string;
  romanticSlug: string;
  lullabySlug: string;
}

export default function HomePageContent({
  birthdaySongs,
  anniversarySongs,
  romanticSongs,
  lullabySongs,
  birthdaySlug,
  anniversarySlug,
  romanticSlug,
  lullabySlug,
}: HomePageContentProps) {
  const makeHandleSongPlay = (section: string) => (song: Song) => {
    trackPlayerEvent.play(song.title, song.slug, false, {
      source: "homepage",
      section,
      music_style: song.music_style,
      categories: song.categories,
    });
  };

  return (
    <>
      <main id="main-content" className="flex-1">
        {/* 1. Occasion Cards */}
        <OccasionCardsRow />

        {/* 2. Birthday Songs */}
        <SongCategoryRow
          title="Birthday Songs"
          subtitle="Make their special day unforgettable"
          seeAllHref="/library?category=Birthday"
          songs={birthdaySongs}
          onSongPlay={makeHandleSongPlay("Birthday Songs")}
          categorySlug={birthdaySlug}
        />

        {/* 3. Anniversary Songs */}
        <SongCategoryRow
          title="Anniversary Songs"
          subtitle="Celebrate every year of love"
          seeAllHref="/library?category=Anniversary"
          songs={anniversarySongs}
          onSongPlay={makeHandleSongPlay("Anniversary Songs")}
          categorySlug={anniversarySlug}
          className="bg-primary-yellow/5"
        />

        {/* 4. Romantic Songs */}
        <SongCategoryRow
          title="Romantic Songs"
          subtitle="Express what words can't say"
          seeAllHref="/library?category=Romantic"
          songs={romanticSongs}
          onSongPlay={makeHandleSongPlay("Romantic Songs")}
          categorySlug={romanticSlug}
        />

        {/* 6. Lullabys */}
        <SongCategoryRow
          title="Lullabys"
          subtitle="Soothing songs for little ones"
          seeAllHref="/library?category=Lullabys"
          songs={lullabySongs}
          onSongPlay={makeHandleSongPlay("Lullabys")}
          categorySlug={lullabySlug}
        />

        {/* 8. How It Works */}
        <HowItWorksRow />

        {/* 9. Why Melodia — Social Proof */}
        <SocialProofRow />

        {/* 10. Testimonials */}
        <TestimonialsRow />

        {/* 11. FAQ */}
        <FAQ
          items={HOMEPAGE_FAQ}
          title="Frequently Asked Questions"
          containerClassName="py-6 sm:py-8 pb-10 sm:pb-12"
        />

        {/* 12. Footer */}
        <Footer />
      </main>
    </>
  );
}
