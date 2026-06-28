"use client";

import React, { useEffect, useState } from "react";
import { FullPageMediaPlayer } from "@/components/FullPageMediaPlayer";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DownloadButton } from "@/components/DownloadButton";

export default function MySongDetailClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [song, setSong] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { slug } = await params;
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/my-songs/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load song");
        }
        setSong(data.song);
      } catch (e: any) {
        setError(e.message || "Failed to load song");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <div className="hidden md:block"><Header showCreateSongCTA /></div>
        <div className="flex flex-1 items-center justify-center">
          <p className="font-body text-text/80">Loading song…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <div className="hidden md:block"><Header showCreateSongCTA /></div>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="font-body text-text">{error || "Song not found"}</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <div className="hidden md:block">
        <Header
          showCreateSongCTA
          rightActions={
            song.download_allowed && song.song_url ? (
              <DownloadButton
                audioUrl={song.song_url}
                songTitle={song.title}
                songId={song.id}
              />
            ) : null
          }
        />
      </div>
      <main className="flex-1 flex flex-col relative">
        <FullPageMediaPlayer song={song} />
        {/* Footer positioned below player - with margin to account for fixed player controls */}
        <div className="mt-[200px] md:mt-[220px] relative z-40 bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
          <Footer />
        </div>
      </main>
    </div>
  );
}
