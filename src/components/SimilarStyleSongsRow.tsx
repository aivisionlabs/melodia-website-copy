"use client";

import { SongArtwork } from "@/components/SongArtwork";
import { Button } from "@/components/ui/button";
import type { Song } from "@/types";
import { ArrowRight, Play, Sparkles, Wand2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function getVariantImageUrl(song: Song): string | null {
  const variants: any = song.suno_variants as any;

  if (variants && typeof variants === "object" && !Array.isArray(variants)) {
    if ("sourceImageUrl" in variants) return variants.sourceImageUrl ?? null;
  }

  if (Array.isArray(variants) && variants.length > 0) {
    return variants[0]?.sourceImageUrl ?? null;
  }

  return null;
}

export function SimilarStyleSongsRow({
  songs,
  onSongSelect,
  cta,
  currentCategory,
}: {
  songs: Song[];
  onSongSelect?: (song: Song) => void;
  cta?: React.ReactNode;
  currentCategory?: string;
}) {
  if (!songs || songs.length === 0) return null;

  return (
    <section
      className="relative py-6 md:py-8 rounded-3xl overflow-hidden border border-white/10 shadow-elegant group/section
      bg-[linear-gradient(135deg,rgba(7,59,76,0.96)_0%,rgba(29,78,216,0.45)_35%,rgba(239,71,111,0.35)_70%,rgba(7,59,76,0.98)_100%)]"
      aria-label="Spark your creativity"
    >
      {/* Distinct background texture */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,209,102,0.35),transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-28 -left-28 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,71,111,0.22),transparent_60%)] blur-3xl" />
        <div className="absolute top-1/3 left-1/3 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:18px_18px] opacity-25" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 px-4 md:px-6">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-3 bg-gradient-to-br from-primary-yellow to-yellow-400 rounded-2xl shadow-lg transform -rotate-6 group-hover/section:rotate-0 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-text-teal" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-bold text-white font-heading">
                  Choose a song and make it yours!
                </h2>
                <span className="md:inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-xs font-semibold text-white/85">
                  Trending styles
                </span>
              </div>
              <p className="text-white/75 font-body mt-1 max-w-md">
                Pick a style template, preview it, and generate your own
                version.
              </p>
              {/* Mobile CTA - shown below description on mobile */}
              {cta && (
                <div className="mt-3 md:hidden">
                  {cta}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cta ? (
              <div className="hidden md:block">{cta}</div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-white/70 text-sm font-body">
                <span>Scroll to explore</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          {/* Edge fades to reduce “clutter” and suggest horizontal scroll */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-[color:rgba(7,59,76,0.98)] to-transparent z-20" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[color:rgba(7,59,76,0.98)] to-transparent z-20" />

          <div className="flex items-start gap-4 md:gap-5 overflow-x-auto pb-3 pt-2 px-4 md:px-6 scrollbar-hide snap-x">
            {songs.map((song, idx) => {
              const imageUrl = getVariantImageUrl(song);
              return (
                <div
                  key={song.id}
                  className="flex-shrink-0 w-64 md:w-72 snap-center group relative"
                  style={{
                    animation: `fade-in 0.5s ease-out ${idx * 0.1}s backwards`,
                  }}
                >
                  <div className="rounded-2xl p-3 transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md">
                    {/* Image Container */}
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={song.title}
                          width={320}
                          height={320}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 768px) 256px, 288px"
                          priority={idx === 0}
                          loading={idx === 0 ? "eager" : "lazy"}
                          fetchPriority={idx === 0 ? "high" : "auto"}
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <SongArtwork className="w-full h-full" />
                        </div>
                      )}

                      {/* Overlay Gradient (always on, stronger on hover) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Play Button (small, non-dominant) */}
                      <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                        <Button
                          className="rounded-full w-11 h-11 bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/25 text-white shadow-lg"
                          onClick={() => onSongSelect?.(song)}
                          aria-label="Preview"
                        >
                          <Play className="h-5 w-5 ml-0.5 fill-current" />
                        </Button>
                      </div>

                      {/* Quick Action Tag */}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-grow">
                      <h3
                        className="font-heading font-bold text-lg text-white line-clamp-1 mb-1.5"
                        title={song.title}
                      >
                        {song.title}
                      </h3>
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {song.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/75 font-body leading-none"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto">
                        <Link
                          href={`/create?sourceSongId=${song.id}&plan=package_2${currentCategory && currentCategory !== "all" ? `&occasion=${encodeURIComponent(currentCategory)}` : ""}`}
                          className="block"
                        >
                          <Button className="w-full bg-white text-text-teal font-bold hover:bg-primary-yellow hover:text-text-teal transition-all duration-300 group/btn shadow-sm">
                            <Wand2 className="w-4 h-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                            Pick this style
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
