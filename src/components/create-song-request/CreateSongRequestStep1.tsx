"use client";

import { useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { OCCASION_OPTIONS } from "@/lib/occasion-suggestions";
import Link from "next/link";
import { HeaderLogo } from "../OptimizedLogo";
import { Button } from "@/components/ui/button";
import { MediaPlayer } from "@/components/MediaPlayer";
import { Play, Sparkles, X } from "lucide-react";

interface CreateSongRequestStep1Props {
  recipientDetails: string;
  setRecipientDetails: (value: string) => void;
  occasion: string;
  setOccasion: (value: string) => void;
  customOccasion: string;
  setCustomOccasion: (value: string) => void;
  languages: string;
  setLanguages: (value: string) => void;
  sourceSongId?: number | null;
  sourceSongPreview?: { id: number; title: string; imageUrl?: string | null } | null;
  templateSongs?: Array<{
    id: number;
    title: string;
    slug?: string;
    imageUrl?: string | null;
    song_url?: string | null;
    service_provider?: string | null;
  }>;
  templatesLoading?: boolean;
  selectedPackage?: string;
  onSelectSourceSong?: (songId: number | null) => void;
  effectiveOccasion?: string;
}

const ALL_OCCASIONS = OCCASION_OPTIONS.map((option) => option.label);
const INITIAL_OCCASIONS = ALL_OCCASIONS.slice(0, 5);

export function CreateSongRequestStep1({
  recipientDetails,
  setRecipientDetails,
  occasion,
  setOccasion,
  customOccasion,
  setCustomOccasion,
  languages,
  setLanguages,
  sourceSongId = null,
  sourceSongPreview = null,
  templateSongs = [],
  templatesLoading = false,
  selectedPackage,
  onSelectSourceSong,
  effectiveOccasion,
}: CreateSongRequestStep1Props) {
  const [showAllOccasions, setShowAllOccasions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewSong, setPreviewSong] = useState<{
    title: string;
    artist: string;
    song_url?: string;
    slug?: string;
    suno_variants?: any;
  } | null>(null);

  const occasionsToShow = showAllOccasions
    ? [...ALL_OCCASIONS, "Other"]
    : [...INITIAL_OCCASIONS, "More..."];

  const handleOccasionClick = (o: string) => {
    if (o === "More...") {
      setShowAllOccasions(true);
    } else {
      setOccasion(o);
    }
  };

  const hasTemplates = templateSongs.length > 0;
  const occasionLabel = effectiveOccasion || (occasion === "Other" ? customOccasion : occasion);
  const templatesLocked = selectedPackage === "package_1";
  const pricingHref = sourceSongId ? `/pricing?sourceSongId=${sourceSongId}` : "/pricing";

  return (
    <div className="space-y-8">
      {/* Logo Header */}
      <div className="pb-2">
        <Link href="/" className="inline-block" aria-label="Go to homepage">
          <HeaderLogo alt="Melodia Logo" />
        </Link>
      </div>
      <header className="text-center">
        <h1 className="text-3xl font-bold font-heading text-text-teal">
          Create your song
        </h1>
        <p className="text-md text-text-teal/80 mt-1">
          Tell us a little bit about it.
        </p>
      </header>

      <div>
        <FormField
          id="to-for"
          label="To / For"
          placeholder="Sarah, my best friend"
          value={recipientDetails}
          onChange={(e) => setRecipientDetails(e.target.value)}
          className="w-full h-14 px-5 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
          helperText='Who is this song for? Enter their name and relationship. (e.g.,
            "Sarah, my best friend" OR "Rohan, my
            brother")'
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-text-teal mb-3">
          Occasion
        </label>
        <div className="flex flex-wrap gap-3">
          {occasionsToShow.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => handleOccasionClick(o)}
              className={`px-5 h-10 rounded-full border-2 transition-all duration-200 font-semibold text-sm ${
                occasion === o
                  ? "bg-accent-coral text-white border-accent-coral shadow-lg"
                  : "bg-white text-text-teal border-gray-300 hover:border-accent-coral"
              } ${o === "More..." ? "font-bold text-accent-coral" : ""}`}
            >
              {o}
            </button>
          ))}
        </div>
        {occasion === "Other" && (
          <div className="mt-4">
            <FormField
              id="custom-occasion"
              label="Custom Occasion"
              placeholder="e.g., Graduation, Just because..."
              value={customOccasion}
              onChange={(e) => setCustomOccasion(e.target.value)}
              className="w-full h-14 px-5 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
            />
          </div>
        )}

        {/* Selected template card */}
        {sourceSongId && sourceSongPreview && (
          <div className="mt-5 rounded-xl border border-text-teal/15 bg-white p-4 shadow-sm relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectSourceSong?.(null);
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-text-teal/60 hover:text-text-teal"
              aria-label="Remove selected template"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pr-8">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                {sourceSongPreview.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sourceSongPreview.imageUrl}
                    alt={sourceSongPreview.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-text-teal truncate min-w-0">
                      {sourceSongPreview.title}
                    </p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-yellow text-text-teal border border-primary-yellow/60 flex-shrink-0">
                      Selected
                    </span>
                  </div>
                  <p className="text-xs text-text-teal/70 mt-0.5">
                    Using this song's persona/style as your template.
                  </p>
                </div>
              </div>

              {hasTemplates && (
                <>
                  {templatesLocked ? (
                    <Link href={pricingHref} className="w-full sm:w-auto flex-shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 h-auto px-3 py-2 text-xs font-semibold w-full whitespace-normal leading-snug"
                      >
                        Upgrade to Creator or Maestro to use templates
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-3 text-xs font-semibold w-full sm:w-auto flex-shrink-0"
                      onClick={() => setShowTemplates(true)}
                    >
                      Choose from more {occasionLabel} songs
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Occasion templates */}
        {(templatesLoading || hasTemplates) && (showTemplates || !sourceSongId) && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold font-heading text-text-teal">
                Choose From Our {occasionLabel} song Templates
              </h3>
              {sourceSongId && (
                <button
                  type="button"
                  className="text-xs font-semibold text-text-teal/80 hover:text-accent-coral transition-colors"
                  onClick={() => setShowTemplates(false)}
                >
                  Hide
                </button>
              )}
            </div>

            <div className={`${templatesLocked ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory scroll-pl-2 pr-2">
              {/* Create new style card */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSourceSong?.(null);
                }}
                className={`min-w-[140px] sm:min-w-[160px] flex-shrink-0 rounded-xl border p-3 text-center transition-all snap-start flex flex-col items-center justify-center gap-2 ${
                  !sourceSongId
                    ? "border-accent-coral bg-accent-coral/10"
                    : "border-gray-200 bg-white hover:border-accent-coral/60"
                }`}
              >
                <Sparkles
                  className={`h-6 w-6 ${
                    !sourceSongId ? "text-accent-coral" : "text-text-teal/60"
                  }`}
                />
                <div className="text-xs font-semibold text-text-teal leading-tight">
                  Create new style
                </div>
              </button>

              {templatesLoading &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="min-w-[180px] sm:min-w-[220px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 snap-start"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-gray-100 rounded mt-2 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}

              {templateSongs.map((s) => {
                const selected = sourceSongId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectSourceSong?.(s.id);
                    }}
                    className={`min-w-[180px] sm:min-w-[220px] flex-shrink-0 rounded-xl border p-3 text-left transition-all snap-start cursor-pointer ${
                      selected
                        ? "border-accent-coral bg-accent-coral/10"
                        : "border-gray-200 bg-white hover:border-accent-coral/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.imageUrl}
                            alt={s.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        {s.song_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPreviewSong({
                                title: s.title,
                                artist: s.service_provider || "Melodia",
                                song_url: s.song_url || undefined,
                                slug: s.slug,
                                suno_variants: s.imageUrl
                                  ? [{ sourceImageUrl: s.imageUrl, imageUrl: s.imageUrl }]
                                  : undefined,
                              });
                            }}
                            className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white/85 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center z-10"
                            aria-label="Play preview"
                          >
                            <Play className="h-4 w-4 text-text-teal ml-0.5" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-text-teal truncate">
                            {s.title}
                          </div>
                          {selected && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-yellow text-text-teal border border-primary-yellow/60">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-teal/70 mt-0.5">
                          Use this template
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {templatesLocked && (
              <div className="mt-3">
                <Link href={pricingHref}>
                  <Button className="w-full min-h-11 h-auto bg-white text-text-teal font-semibold border border-text-teal/20 hover:bg-primary-yellow whitespace-normal leading-snug py-3">
                    Upgrade to Creator or Maestro to use song templates
                  </Button>
                </Link>
                <p className="text-[11px] text-text-teal/70 mt-2 break-words">
                  Song template selection is not allowed in Starter package.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {previewSong && (
        <MediaPlayer
          song={{
            title: previewSong.title,
            artist: previewSong.artist,
            song_url: previewSong.song_url,
            slug: previewSong.slug,
            suno_variants: previewSong.suno_variants,
          }}
          onClose={() => setPreviewSong(null)}
        />
      )}

      <div>
        <FormField
          id="language"
          label="Language"
          placeholder="English"
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          className="w-full h-14 px-5 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
          helperText="Feel free to mix it up! e.g., Hindi + English, Punjabi"
        />
      </div>
    </div>
  );
}
