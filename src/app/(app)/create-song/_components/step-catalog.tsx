"use client";

import {
  SongCatalogCard,
  type SongCatalogCardData,
} from "@/app/(app)/create-song/_components/song-catalog-card";
import { useCreateSongWizard } from "@/app/(app)/create-song/_components/wizard-context";
import { RecipientDialectConfirm } from "@/app/(app)/create-song/_components/recipient-dialect-confirm";
import { OCCASION_OPTIONS } from "@/lib/occasion-suggestions";
import { HeaderLogo } from "@/components/OptimizedLogo";
import { useToast } from "@/hooks/use-toast";
import {
  trackFunnelEvent,
  trackOccasionEvent,
  trackPlayerEvent,
} from "@/lib/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

type TemplatedSongApiItem = {
  id: number;
  title: string;
  template_title: string | null;
  template_lyrics?: string | null;
  description: string | null;
  language?: string | null;
  tags?: string[] | null;
  selected_variant: number | null;
  song_variants: unknown;
  categories?: Array<{ slug: string; name: string }>;
  promotion_tag?: "trending" | "most_preferred" | "new" | null;
};

function parseLanguages(value: string | null | undefined): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeVariants(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) {
    return input.filter(
      (variant): variant is Record<string, unknown> =>
        !!variant && typeof variant === "object",
    );
  }
  if (input && typeof input === "object") {
    return Object.values(input).filter(
      (variant): variant is Record<string, unknown> =>
        !!variant && typeof variant === "object",
    );
  }
  return [];
}

function extractTags(song: TemplatedSongApiItem): string[] {
  const tags = (Array.isArray(song.tags) ? song.tags : [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
  if (tags.length > 0) return tags;

  const fallbackCategory = song.categories?.[0]?.name;
  return fallbackCategory ? [fallbackCategory] : ["Personalized"];
}

function toCardSong(song: TemplatedSongApiItem): SongCatalogCardData {
  const variants = normalizeVariants(song.song_variants);
  const selectedIndex =
    typeof song.selected_variant === "number" ? song.selected_variant : 0;
  const selected = variants[selectedIndex] ?? variants[0] ?? {};

  const imageUrl =
    (selected.sourceImageUrl as string | undefined) ??
    (selected.imageUrl as string | undefined) ??
    null;
  const previewAudioUrl =
    (selected.sourceAudioUrl as string | undefined) ??
    (selected.streamAudioUrl as string | undefined) ??
    (selected.audioUrl as string | undefined) ??
    null;

  return {
    id: song.id,
    title: song.template_title || song.title,
    description: song.description || "Pick this song to personalize your gift.",
    imageUrl,
    previewAudioUrl,
    tags: extractTags(song),
    languages: parseLanguages(song.language),
    promotionTag: song.promotion_tag ?? null,
    templateLyrics:
      typeof song.template_lyrics === "string" ? song.template_lyrics : null,
  };
}

export function StepCatalog({
  initialOccasionSlug,
  showRecipientNameTransliteration = false,
}: {
  initialOccasionSlug?: string;
  showRecipientNameTransliteration?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    state,
    isHydrated,
    setRecipientName,
    setRecipientNameInScript,
    setSelectedTemplateId,
    setOccasion,
  } = useCreateSongWizard();

  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [activeOccasionSlug, setActiveOccasionSlug] = useState<string | null>(
    initialOccasionSlug ?? state.occasionSlug,
  );
  const [songs, setSongs] = useState<SongCatalogCardData[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const sheetOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearSheetOpenTimeout = () => {
    if (sheetOpenTimeoutRef.current) {
      clearTimeout(sheetOpenTimeoutRef.current);
      sheetOpenTimeoutRef.current = null;
    }
  };

  const occasionTabs = useMemo(() => {
    const supported = new Set(categorySlugs);
    return OCCASION_OPTIONS.map((option) => ({
      label: option.label,
      slug: option.id,
    })).filter((item) => supported.has(item.slug));
  }, [categorySlugs]);

  const selectedTemplateId = state.selectedTemplateId;
  const canGoNext = state.recipientName.trim().length >= 2;

  useEffect(() => {
    trackFunnelEvent.formStepView(1, "create_song_catalog");
  }, []);

  useEffect(() => () => clearSheetOpenTimeout(), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/templated-songs/categories")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.success && Array.isArray(json.categorySlugs)) {
          setCategorySlugs(
            json.categorySlugs.filter(
              (slug: unknown): slug is string => typeof slug === "string",
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategorySlugs([]);
          toast({
            variant: "snackbar",
            description: "Unable to load occasions right now. Please retry.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!occasionTabs.length) return;
    const supported = new Set(occasionTabs.map((item) => item.slug));
    let nextSlug = activeOccasionSlug;
    if (!nextSlug || !supported.has(nextSlug)) {
      nextSlug =
        initialOccasionSlug && supported.has(initialOccasionSlug)
          ? initialOccasionSlug
          : state.occasionSlug && supported.has(state.occasionSlug)
            ? state.occasionSlug
            : occasionTabs[0]?.slug;
    }
    if (!nextSlug || nextSlug === activeOccasionSlug) return;
    setActiveOccasionSlug(nextSlug);
  }, [
    occasionTabs,
    initialOccasionSlug,
    activeOccasionSlug,
    state.occasionSlug,
  ]);

  useEffect(() => {
    if (!activeOccasionSlug) return;

    const selectedTab = occasionTabs.find(
      (tab) => tab.slug === activeOccasionSlug,
    );
    if (selectedTab?.label) {
      setOccasion(selectedTab.label, activeOccasionSlug);
      trackOccasionEvent.viewOccasion(selectedTab.label, activeOccasionSlug);
    }

    let cancelled = false;
    setLoadingSongs(true);
    fetch(
      `/api/templated-songs?namedrop=true&categorySlug=${encodeURIComponent(activeOccasionSlug)}&includeLyrics=true`,
    )
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success || !Array.isArray(json.templatedSongs)) {
          setSongs([]);
          return;
        }
        const mappedSongs = (json.templatedSongs as TemplatedSongApiItem[])
          .map((song) => {
            try {
              return toCardSong(song);
            } catch {
              return null;
            }
          })
          .filter((song): song is SongCatalogCardData => song !== null);
        setSongs(mappedSongs);
      })
      .catch(() => {
        if (!cancelled) {
          setSongs([]);
          toast({
            variant: "snackbar",
            description: "Unable to load song options right now.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSongs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOccasionSlug, occasionTabs, setOccasion, toast]);

  useEffect(() => {
    if (!activeOccasionSlug) return;
    const params = new URLSearchParams();
    params.set("occasion", activeOccasionSlug);
    router.replace(`/create-song?${params.toString()}`, { scroll: false });
  }, [activeOccasionSlug, router]);

  useEffect(() => {
    if (!isSheetOpen) return;
    trackFunnelEvent.formStepView(2, "create_song_recipient_sheet");
  }, [isSheetOpen]);

  const handleSongSelect = (songId: number) => {
    clearSheetOpenTimeout();
    setSelectedTemplateId(songId);
    trackFunnelEvent.formStepComplete(1, "create_song_selected");

    if (isSheetOpen) return;

    sheetOpenTimeoutRef.current = setTimeout(() => {
      sheetOpenTimeoutRef.current = null;
      setIsSheetOpen(true);
    }, 400);
  };

  const handleCloseRecipientSheet = () => {
    clearSheetOpenTimeout();
    setIsSheetOpen(false);
  };

  const handlePlayToggle = (songId: number) => {
    const nextAudio = audioRefs.current[songId];
    if (!nextAudio) return;

    Object.entries(audioRefs.current).forEach(([id, element]) => {
      if (!element) return;
      if (Number(id) !== songId) {
        element.pause();
        element.currentTime = 0;
      }
    });

    const song = songs.find((s) => s.id === songId);
    const songTitle = song?.title ?? String(songId);

    if (playingSongId === songId) {
      nextAudio.pause();
      setPlayingSongId(null);
      trackPlayerEvent.pause(songTitle, String(songId), nextAudio.currentTime, {
        context: "create_song_catalog",
      });
      return;
    }

    nextAudio
      .play()
      .then(() => {
        setPlayingSongId(songId);
        trackPlayerEvent.play(songTitle, String(songId), false, {
          context: "create_song_catalog",
          occasion: activeOccasionSlug ?? undefined,
        });
      })
      .catch(() => {
        setPlayingSongId(null);
      });
  };

  const navigateToPackageStep = () => {
    trackFunnelEvent.formStepComplete(1, "create_song_recipient_entered");
    const params = new URLSearchParams();
    params.set("step", "package");
    if (activeOccasionSlug) {
      params.set("occasion", activeOccasionSlug);
    }
    router.replace(`/create-song?${params.toString()}`);
  };

  const navigateToCustomSong = () => {
    trackFunnelEvent.formStepComplete(1, "create_song_custom_selected");
    if (activeOccasionSlug === "fathers-day") {
      router.push("/create-song/fathers-day");
      return;
    }
    const params = new URLSearchParams();
    params.set("step", "story");
    if (activeOccasionSlug) {
      params.set("occasion", activeOccasionSlug);
    }
    router.push(`/create-song?${params.toString()}`);
  };

  const premiumCard = (
    <div className="rounded-2xl border-2 border-accent-coral p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-accent-coral" />
          <h3 className="text-sm font-extrabold uppercase leading-tight text-text-teal">
            Create a song for{" "}
            <span className="text-accent-coral">your story</span>
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-extrabold leading-tight text-text-teal">
            ₹599
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-accent-coral">
            Premium
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-on-surface-variant">
        Our AI Engine will write perfect lyrics for you.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-text-teal/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-text-teal">
          Multilingual
        </span>
        <span className="rounded-full border border-text-teal/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-text-teal">
          Personalized
        </span>
        <span className="rounded-full border border-text-teal/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-text-teal">
          Studio Quality Audio
        </span>
      </div>

      <button
        type="button"
        onClick={navigateToCustomSong}
        className="mt-4 h-16 w-full rounded-xl bg-primary-yellow text-base font-black uppercase tracking-tighter text-text-teal transition-transform active:scale-[0.98]"
      >
        Get Your Song →
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-body text-text-teal">
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="inline-block" aria-label="Go to homepage">
            <HeaderLogo alt="Melodia Logo" />
          </Link>
        </div>
      </header>

      <section className="px-4 py-4">
        <h1 className="text-[28px] font-extrabold tracking-tight text-text-teal">
          Make your celebration Special
        </h1>
      </section>

      <div className="px-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Select a Song to Personalize
        </h2>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          {occasionTabs.map((tab) => {
            const active = tab.slug === activeOccasionSlug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => {
                  if (!tab.slug) return;
                  setActiveOccasionSlug(tab.slug);
                  trackOccasionEvent.clickOccasion(
                    tab.label,
                    tab.slug,
                    "create_song",
                  );
                }}
                className={`shrink-0 rounded-full border-2 px-4 py-3 text-xs font-bold uppercase ${
                  active
                    ? "border-accent-coral bg-accent-coral text-white"
                    : "border-transparent bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-4 px-4 pb-32">
        {loadingSongs ? (
          <p className="text-sm text-on-surface-variant">Loading songs...</p>
        ) : songs.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No preset songs found for this occasion.
          </p>
        ) : (
          songs.map((song) => (
            <SongCatalogCard
              key={song.id}
              song={song}
              selected={song.id === selectedTemplateId}
              isPlaying={song.id === playingSongId}
              onSelect={handleSongSelect}
              onTogglePlay={handlePlayToggle}
              audioRef={(element) => {
                audioRefs.current[song.id] = element;
                if (!element) return;
                element.onended = () => setPlayingSongId(null);
              }}
            />
          ))
        )}

        {!loadingSongs ? premiumCard : null}

        {!loadingSongs ? (
          <p className="pt-2 text-center text-xs text-on-surface-variant">
            Need experts to craft your perfect song?{" "}
            <Link
              href={`/create?plan=package_3${activeOccasionSlug ? `&occasion=${encodeURIComponent(activeOccasionSlug)}` : ""}`}
              className="font-semibold text-accent-coral underline underline-offset-2 transition-opacity hover:opacity-80"
              onClick={() =>
                trackFunnelEvent.formStepComplete(
                  1,
                  "create_song_expert_request",
                )
              }
            >
              Drop a request here
            </Link>
          </p>
        ) : null}
      </div>

      {isSheetOpen && isHydrated ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-text-teal/40 backdrop-blur-[2px]"
            onClick={handleCloseRecipientSheet}
            aria-label="Close recipient sheet"
          />

          <div className="fixed bottom-0 left-0 z-50 flex h-[45dvh] w-full flex-col rounded-t-[32px] border-t border-surface-container-high bg-paper-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            <div className="mx-auto mb-2 mt-4 h-1.5 w-12 rounded-full bg-surface-container-highest" />

            <div className="flex flex-grow flex-col overflow-y-auto px-4 pb-6 pt-2">
              <section className="mb-6">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-accent-coral">
                  For who?
                </h3>
                <p className="mb-4 text-sm font-medium text-on-surface-variant">
                  We&apos;ll weave their name into the song
                </p>
                <input
                  value={state.recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="THEIR NAME"
                  className="w-full border-0 border-b-2 border-text-teal bg-transparent p-0 pb-2 text-3xl font-extrabold uppercase text-text-teal placeholder:font-extrabold placeholder:text-text-teal/20 focus:border-primary-yellow focus:ring-0 focus:outline-none"
                />

                {showRecipientNameTransliteration ? (
                  <RecipientDialectConfirm
                    name={state.recipientName}
                    defaultLanguage="Hindi"
                    confirmedValue={state.recipientNameInScript}
                    confirmedLanguage={state.recipientNameScriptLang}
                    onConfirm={setRecipientNameInScript}
                    className="mt-5"
                  />
                ) : null}
              </section>

              <div className="flex-grow" />

              <div className="mt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={navigateToPackageStep}
                  disabled={!canGoNext}
                  className="h-16 w-full rounded-xl bg-primary-yellow text-2xl font-black uppercase italic tracking-tighter text-text-teal transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
