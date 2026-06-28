"use client";

import { useState } from "react";
import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongCardsGrid } from "@/components/SongCardsGrid";
import type { Song } from "@/types";

interface OccasionSongsSectionProps {
  songs: Song[];
  occasionName: string;
  occasionSlug: string;
  totalSongs: number;
}

export function OccasionSongsSection({
  songs,
  occasionName,
  occasionSlug,
  totalSongs,
}: OccasionSongsSectionProps) {
  if (!songs || songs.length === 0) {
    return (
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-4">
            {occasionName} Songs
          </h2>
          <p className="text-text-teal/80 max-w-2xl mx-auto mb-8">
            We&apos;re creating more {occasionName.toLowerCase()} songs. Check
            back soon or explore our full library!
          </p>
          <Link href="/library">
            <Button
              variant="outline"
              size="lg"
              className="bg-gradient-to-r from-white to-primary-yellow/10 hover:from-primary-yellow/20 hover:to-white text-text-teal font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border-2 border-primary-yellow hover:border-accent-coral hover:scale-105"
            >
              <Music className="h-5 w-5 mr-2" />
              Explore All Songs
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-teal font-heading mb-4">
            Popular {occasionName} Songs
          </h2>
          <p className="text-text-teal/80 max-w-2xl mx-auto">
            Listen to some of the beautiful {occasionName.toLowerCase()} songs
            we&apos;ve created for happy customers.
          </p>
        </div>

        <SongCardsGrid
          songs={songs}
          pageContext={`occasion_${occasionSlug}`}
          songsPerPage={12}
        />

        {totalSongs > songs.length && (
          <div className="text-center mt-10">
            <Link href="/library">
              <Button
                variant="outline"
                size="lg"
                className="bg-gradient-to-r from-white to-primary-yellow/10 hover:from-primary-yellow/20 hover:to-white text-text-teal font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl border-2 border-primary-yellow hover:border-accent-coral hover:scale-105"
              >
                <Music className="h-5 w-5 mr-2" />
                View All {totalSongs} {occasionName} Songs
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
