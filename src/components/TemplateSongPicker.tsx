"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Music,
  Loader2,
  Check,
  Play,
  Sparkles,
  ArrowRight,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InlineAudioPlayer from "@/components/InlineAudioPlayer";
import { SongArtwork } from "@/components/SongArtwork";
import { templatedSongDisplayTitle } from "@/lib/templated-songs-utils";

interface SongVariant {
  sourceAudioUrl?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  sourceImageUrl?: string;
  imageUrl?: string;
  duration?: number;
}

interface CategoryPill {
  id: number;
  name: string;
  slug: string;
  sequence?: number;
}

interface TemplatedSong {
  id: number;
  title: string;
  template_title?: string | null;
  slug: string;
  song_variants: unknown;
  display_order: number | null;
  language?: string | null;
  description?: string | null;
  categories?: Array<{ id: number; name: string; slug: string }>;
}

function getVariantsList(songVariants: unknown): SongVariant[] {
  if (Array.isArray(songVariants)) return songVariants as SongVariant[];
  if (songVariants && typeof songVariants === "object") {
    return Object.values(songVariants as object).filter(
      Boolean,
    ) as SongVariant[];
  }
  return [];
}

function getBestAudioUrl(template: TemplatedSong): string | null {
  const variants = getVariantsList(template.song_variants);
  if (variants.length === 0) return null;
  const v = variants[0];
  if (!v) return null;
  return v.sourceAudioUrl ?? v.streamAudioUrl ?? v.audioUrl ?? null;
}

function getBestImageUrl(template: TemplatedSong): string | null {
  const variants = getVariantsList(template.song_variants);
  if (variants.length === 0) return null;
  const v = variants[0];
  if (!v) return null;
  return v.sourceImageUrl ?? v.imageUrl ?? null;
}

export interface TemplateSongPickerProps {
  /** Pre-filter templates to a specific category slug. null = show all categories. */
  categorySlug?: string | null;
  /** Initial value for the recipient name input. Empty string if not supplied. */
  initialName?: string | null;
  onGenerate: (templateId: number, name: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function TemplateSongPicker({
  categorySlug,
  initialName,
  onGenerate,
  isGenerating,
  error,
}: TemplateSongPickerProps) {
  const [templates, setTemplates] = useState<TemplatedSong[]>([]);
  const [categories, setCategories] = useState<CategoryPill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categorySlug ?? "all",
  );
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [recipientName, setRecipientName] = useState(initialName ?? "");

  // Fetch categories (only when no categorySlug constraint)
  useEffect(() => {
    if (categorySlug) return; // vendor pre-filtered — skip category fetch
    const load = async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.categories?.length) {
          setCategories(data.categories);
        }
      } catch {
        // Non-blocking
      }
    };
    load();
  }, [categorySlug]);

  // Fetch templates
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const url =
          selectedCategory === "all"
            ? "/api/templated-songs?namedrop=true"
            : `/api/templated-songs?namedrop=true&categorySlug=${encodeURIComponent(selectedCategory)}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setTemplates(data.templatedSongs ?? []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCategory]);

  const handleGenerate = async () => {
    if (!selectedTemplateId || !recipientName.trim() || isGenerating) return;
    await onGenerate(selectedTemplateId, recipientName.trim());
  };

  return (
    <div>
      {/* Header */}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Template carousel section */}
      <section
        className="relative py-6 md:py-8 rounded-3xl overflow-hidden border border-white/10 shadow-elegant mb-8
          bg-[linear-gradient(135deg,rgba(7,59,76,0.96)_0%,rgba(29,78,216,0.45)_35%,rgba(239,71,111,0.35)_70%,rgba(7,59,76,0.98)_100%)]"
        aria-label="Choose a template"
      >
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,209,102,0.35),transparent_60%)] blur-2xl" />
          <div className="absolute -bottom-28 -left-28 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,71,111,0.22),transparent_60%)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:18px_18px] opacity-25" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 px-4 md:px-6">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-3 bg-gradient-to-br from-primary-yellow to-yellow-400 rounded-2xl shadow-lg transform -rotate-6">
                <Sparkles className="w-6 h-6 text-text-teal" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white font-heading">
                  Choose a template and make it yours!
                </h2>
                <p className="text-white/75 font-body mt-1 max-w-md">
                  Pick a song template, preview it, and generate your
                  personalized version.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm font-body">
              <span>Scroll to explore</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Category filter pills — only shown when no vendor-imposed category filter */}
          {!categorySlug && categories.length > 0 && (
            <div className="px-4 md:px-6 pb-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full border transition-all duration-300 shadow-elegant cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-[var(--primary-yellow)] text-[var(--text-teal)] border-[var(--primary-yellow)]"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                  }`}
                  aria-current={selectedCategory === "all" ? "page" : undefined}
                >
                  <span className="font-body text-sm font-medium">All</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full border transition-all duration-300 shadow-elegant cursor-pointer ${
                      selectedCategory === cat.slug
                        ? "bg-[var(--primary-yellow)] text-[var(--text-teal)] border-[var(--primary-yellow)]"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                    }`}
                    aria-current={
                      selectedCategory === cat.slug ? "page" : undefined
                    }
                  >
                    <span className="font-body text-sm font-medium">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template cards */}
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-[color:rgba(7,59,76,0.98)] to-transparent z-20" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[color:rgba(7,59,76,0.98)] to-transparent z-20" />

            <div className="flex gap-4 md:gap-5 overflow-x-auto pb-3 pt-2 px-4 md:px-6 scrollbar-hide snap-x">
              {loading ? (
                <div className="flex items-center justify-center py-12 px-4">
                  <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-white/80 font-body py-8 px-4">
                  No templates available yet.
                </p>
              ) : (
                templates.map((t, idx) => {
                  const displayTitle = templatedSongDisplayTitle(t);
                  const audioUrl = getBestAudioUrl(t);
                  const imageUrl = getBestImageUrl(t);
                  const isSelected = selectedTemplateId === t.id;
                  return (
                    <div
                      key={t.id}
                      data-template-card
                      className="flex-shrink-0 w-64 md:w-72 snap-center group relative"
                      style={{
                        animation: `fade-in 0.5s ease-out ${idx * 0.1}s backwards`,
                      }}
                    >
                      <div
                        className={`rounded-2xl p-3 transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col border backdrop-blur-md ${
                          isSelected
                            ? "border-primary-yellow bg-white/15 ring-2 ring-primary-yellow/50"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {/* Image / artwork area */}
                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={displayTitle}
                              width={320}
                              height={320}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              sizes="(max-width: 768px) 256px, 288px"
                              loading={idx === 0 ? "eager" : "lazy"}
                            />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              <SongArtwork className="w-full h-full" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                          {audioUrl && (
                            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                              <Button
                                size="icon"
                                className="rounded-full w-11 h-11 bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/25 text-white shadow-lg"
                                aria-label="Preview"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const card = e.currentTarget.closest(
                                    "[data-template-card]",
                                  );
                                  const playBtn =
                                    card?.querySelector<HTMLButtonElement>(
                                      "[data-template-play] button",
                                    );
                                  playBtn?.click();
                                }}
                              >
                                <Play className="h-5 w-5 ml-0.5 fill-current" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col flex-grow">
                          <h3
                            className="font-heading font-bold text-lg text-white line-clamp-1 mb-1"
                            title={displayTitle}
                          >
                            {displayTitle}
                          </h3>
                          {(t as any).tags && (t as any).tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {((t as any).tags as string[]).slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/75 font-body leading-none"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {(t.language ||
                            (t.categories && t.categories.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              {t.language && (
                                <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-xs font-medium text-white/80">
                                  {t.language}
                                </span>
                              )}
                              {t.categories?.slice(0, 3).map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center rounded-full bg-white/15 border border-white/20 px-2 py-0.5 text-xs font-medium text-white/90"
                                >
                                  {c.name}
                                </span>
                              ))}
                              {t.categories && t.categories.length > 3 && (
                                <span className="text-xs text-white/70">
                                  +{t.categories.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {audioUrl && (
                            <div
                              className="mb-3 -mx-1 min-h-[40px]"
                              data-template-play
                            >
                              <InlineAudioPlayer
                                audioUrl={audioUrl}
                                songTitle={displayTitle}
                                songId={`templated-${t.id}`}
                                skipPlayTracking
                                className="w-full [&_input]:max-w-full"
                              />
                            </div>
                          )}
                          <div className="mt-auto">
                            <Button
                              onClick={() =>
                                setSelectedTemplateId((prev) =>
                                  prev === t.id ? null : t.id,
                                )
                              }
                              className={`w-full font-bold transition-all duration-300 group/btn shadow-sm ${
                                isSelected
                                  ? "bg-primary-yellow text-text-teal hover:bg-primary-yellow/90"
                                  : "bg-white text-text-teal hover:bg-primary-yellow hover:text-text-teal"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-4 h-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                                  Use template
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Name input — shown when a template is selected */}
      {selectedTemplateId && (
        <section className="rounded-xl border border-border bg-white/80 p-6 shadow-sm max-w-xl">
          <h3 className="text-lg font-semibold text-text mb-3">
            Create your song
          </h3>
          <p className="text-text/80 font-body text-sm mb-4">
            Enter the name of the person you want to dedicate this song to. The
            name will be woven into the lyrics.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="recipient-name"
                  className="block text-sm font-medium text-text mb-1"
                >
                  Recipient name
                </label>
                <Input
                  id="recipient-name"
                  placeholder="e.g. Priya"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="font-body"
                  disabled={isGenerating}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !recipientName.trim()}
                className="bg-primary-yellow text-text hover:bg-primary-yellow/90 shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Music className="h-4 w-4 mr-2" />
                )}
                Generate song
              </Button>
            </div>
          </div>
        </section>
      )}

      {!selectedTemplateId && templates.length > 0 && !loading && (
        <p className="text-text/70 font-body text-sm">
          Select a template above to enter a name and generate your personalized
          song.
        </p>
      )}
    </div>
  );
}
