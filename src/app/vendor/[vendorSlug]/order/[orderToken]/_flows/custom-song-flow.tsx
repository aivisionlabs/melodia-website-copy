"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { CreatePageOccasionSection } from "@/app/(app)/create/_components/create-page-occasion-section";
import { CreatePageRecipientSection } from "@/app/(app)/create/_components/create-page-recipient-section";
import { CreatePageOccasionSheet } from "@/app/(app)/create/_components/create-page-occasion-sheet";
import { CreatePageStoryLyricsSection } from "@/app/(app)/create/_components/create-page-story-lyrics-section";
import { CreatePageLanguageSection } from "@/app/(app)/create/_components/create-page-language-section";
import { CreatePageLanguageSheet } from "@/app/(app)/create/_components/create-page-language-sheet";
import { CreatePageMusicSection } from "@/app/(app)/create/_components/create-page-music-section";
import {
  DEFAULT_STORY_PROMPT,
  OCCASION_STORY_PROMPTS,
  TEMPLATE_PAGE_SIZE,
} from "@/app/(app)/create/_components/create-page-constants";
import type { SongPreview } from "@/app/(app)/create/_components/create-page-types";
import {
  getOccasionIdByLabel,
  getOccasionSuggestions,
  resolveOccasionLabel,
} from "@/lib/occasion-suggestions";
import { getCategorySlugForOccasionLabel } from "@/lib/occasion-category-mapping";
import { templatedSongDisplayTitle } from "@/lib/templated-songs-utils";
import { LyricsReviewPanel } from "@/components/lyrics/LyricsReviewPanel";
import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import SongOptionsDisplay from "@/components/SongOptionsDisplay";
import { Button } from "@/components/ui/button";
import type { SongStatusResponse } from "@/lib/types";
import { hasStreamReadyVariant } from "@/lib/utils/variant-utils";
import type { FlowProps, UserSongInfo } from "../_shared/types";
import { CustomSongFlowSkeleton } from "../_shared/flow-loading-skeletons";

function mapTemplatedSongToPreview(t: any): SongPreview {
  const variants: any[] = Array.isArray(t.song_variants)
    ? t.song_variants
    : t.song_variants && typeof t.song_variants === "object"
      ? Object.values(t.song_variants)
      : [];
  const idx = typeof t.selected_variant === "number" ? t.selected_variant : 0;
  const v = variants[idx] || variants[0] || {};
  return {
    id: t.id as number,
    title: templatedSongDisplayTitle(t) as string,
    slug: t.slug as string,
    imageUrl: (v.sourceImageUrl || v.imageUrl || null) as string | null,
    song_url: (v.sourceAudioUrl || v.streamAudioUrl || v.audioUrl || null) as string | null,
    service_provider: null,
  };
}

const CUSTOM_SONG_POLLING_STATUSES = new Set([
  "form_submitted",
  "lyrics_generation_inprogress",
  "lyrics_revision_requested",
  "lyrics_approved",
  "song_generation_inprogress",
  "processing",
]);

const POLL_INTERVAL_MS = 5_000;

export function CustomSongFlow({ state, fetchState, orderToken }: FlowProps) {
  const { order, song_request, lyrics_drafts, user_song } = state;
  // Track which draft version the customer is viewing
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

  // ── Action state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRevising, setIsRevising] = useState(false);

  // ── Variation state ───────────────────────────────────────────────────────
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Occasion ──────────────────────────────────────────────────────────────
  const [occasion, setOccasion] = useState<string>(
    resolveOccasionLabel((order.metadata?.occasion as string) || "Adult Birthday") ||
      "Adult Birthday",
  );
  const [customOccasion, setCustomOccasion] = useState("");
  const [showOccasionSheet, setShowOccasionSheet] = useState(false);

  // ── Recipient ─────────────────────────────────────────────────────────────
  const [recipientDetails, setRecipientDetails] = useState("");
  const [recipientFocused, setRecipientFocused] = useState(false);

  // ── Story / lyrics ────────────────────────────────────────────────────────
  const [lyricsInputMode, setLyricsInputMode] = useState<"story" | "lyrics">(
    "story",
  );
  const [story, setStory] = useState("");
  const [inputLyrics, setInputLyrics] = useState("");
  const [storySuggestions, setStorySuggestions] = useState<string[]>([]);
  const [showInspiration, setShowInspiration] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // ── Language ──────────────────────────────────────────────────────────────
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [langSearchText, setLangSearchText] = useState("");

  // ── Music section ─────────────────────────────────────────────────────────
  const [moods, setMoods] = useState<string[]>([]);
  const [musicTab, setMusicTab] = useState<"create" | "template">("template");
  const [advancedMusicChips, setAdvancedMusicChips] = useState<string[]>([]);
  const [musicStyleNotes, setMusicStyleNotes] = useState("");

  // ── Reference song / templates ────────────────────────────────────────────
  const [sourceSongId, setSourceSongId] = useState<number | null>(null);
  const [sourceSongPreview, setSourceSongPreview] =
    useState<SongPreview | null>(null);
  const [templateSongs, setTemplateSongs] = useState<SongPreview[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesLoadingMore, setTemplatesLoadingMore] = useState(false);
  const [templateHasMore, setTemplateHasMore] = useState(false);
  const [templateNextOffset, setTemplateNextOffset] = useState(0);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Refs ──────────────────────────────────────────────────────────────────
  const recipientRef = useRef<HTMLInputElement>(null);
  const languageSectionRef = useRef<HTMLDivElement>(null);
  const templateScrollRef = useRef<HTMLDivElement>(null);
  const templateLoadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const templatesFetchSeq = useRef(0);

  // ── Computed ──────────────────────────────────────────────────────────────
  const effectiveOccasion =
    occasion === "Other" ? customOccasion.trim() : occasion;
  const effectiveOccasionId =
    occasion === "Other" ? null : getOccasionIdByLabel(occasion);

  const placeholderText = useMemo(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const placeholders = prompts.placeholders;
    return (
      placeholders[placeholderIndex % placeholders.length] ??
      "Share a memory..."
    );
  }, [effectiveOccasion, placeholderIndex]);

  const selectedTemplateInCarousel = useMemo(
    () =>
      sourceSongId
        ? templateSongs.find((s) => s.id === sourceSongId)
        : undefined,
    [sourceSongId, templateSongs],
  );

  const songForInlinePlayer = useMemo(() => {
    if (!sourceSongId) return null;
    if (selectedTemplateInCarousel) return selectedTemplateInCarousel;
    if (sourceSongPreview?.id === sourceSongId) return sourceSongPreview;
    return null;
  }, [sourceSongId, selectedTemplateInCarousel, sourceSongPreview]);

  const showOffCarouselSelectedSlot =
    !!sourceSongId && !templateSongs.some((s) => s.id === sourceSongId);

  const musicSectionTab: "create" | "template" =
    lyricsInputMode === "lyrics" ? "create" : musicTab;

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setStorySuggestions(getOccasionSuggestions(effectiveOccasionId));
    setShowInspiration(false);
    setPlaceholderIndex(0);
  }, [effectiveOccasionId]);

  // Rotate placeholder text every 2.5s
  useEffect(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const count = prompts.placeholders.length;
    if (count <= 1) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % count);
    }, 2500);
    return () => clearInterval(interval);
  }, [effectiveOccasion]);

  // Load template songs when occasion changes
  useEffect(() => {
    let cancelled = false;
    const categorySlug = getCategorySlugForOccasionLabel(effectiveOccasion);
    if (!effectiveOccasion || !categorySlug) {
      setTemplateSongs([]);
      setTemplateHasMore(false);
      setTemplateNextOffset(0);
      setTemplatesLoading(false);
      return;
    }
    const seq = ++templatesFetchSeq.current;
    setTemplateSongs([]);
    setTemplateNextOffset(0);
    setTemplateHasMore(true);
    setTemplatesLoading(true);
    setTemplatesLoadingMore(false);

    fetch(
      `/api/templated-songs?categorySlug=${encodeURIComponent(categorySlug)}&limit=${TEMPLATE_PAGE_SIZE}&offset=0`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || templatesFetchSeq.current !== seq) return;
        if (j?.success) {
          const songs: SongPreview[] = (j.templatedSongs || []).map(mapTemplatedSongToPreview);
          setTemplateSongs(songs);
          setTemplateHasMore(!!j.hasMore);
          setTemplateNextOffset(songs.length);
        } else {
          setTemplateSongs([]);
          setTemplateHasMore(false);
          setTemplateNextOffset(0);
        }
      })
      .catch(() => {
        if (cancelled || templatesFetchSeq.current !== seq) return;
        setTemplateSongs([]);
        setTemplateHasMore(false);
        setTemplateNextOffset(0);
      })
      .finally(() => {
        if (cancelled || templatesFetchSeq.current !== seq) return;
        setTemplatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveOccasion]);

  // Load more templates (pagination)
  const loadMoreTemplates = useCallback(() => {
    const categorySlug = getCategorySlugForOccasionLabel(effectiveOccasion);
    if (
      !effectiveOccasion ||
      !categorySlug ||
      !templateHasMore ||
      templatesLoading ||
      templatesLoadingMore
    )
      return;
    const seq = ++templatesFetchSeq.current;
    setTemplatesLoadingMore(true);

    fetch(
      `/api/templated-songs?categorySlug=${encodeURIComponent(categorySlug)}&limit=${TEMPLATE_PAGE_SIZE}&offset=${templateNextOffset}`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (templatesFetchSeq.current !== seq) return;
        if (!j?.success) {
          setTemplateHasMore(false);
          return;
        }
        const batch: SongPreview[] = (j.templatedSongs || []).map(mapTemplatedSongToPreview);
        setTemplateSongs((prev) => {
          const ids = new Set(prev.map((s) => s.id));
          const added = batch.filter((s) => !ids.has(s.id));
          return added.length ? [...prev, ...added] : prev;
        });
        setTemplateHasMore(!!j.hasMore);
        setTemplateNextOffset((prev) => prev + batch.length);
      })
      .catch(() => {
        if (templatesFetchSeq.current !== seq) return;
        setTemplateHasMore(false);
      })
      .finally(() => {
        if (templatesFetchSeq.current !== seq) return;
        setTemplatesLoadingMore(false);
      });
  }, [
    effectiveOccasion,
    templateHasMore,
    templateNextOffset,
    templatesLoading,
    templatesLoadingMore,
  ]);

  // IntersectionObserver for template infinite scroll
  useEffect(() => {
    if (musicTab !== "template") return;
    const root = templateScrollRef.current;
    const sentinel = templateLoadMoreSentinelRef.current;
    if (
      !root ||
      !sentinel ||
      !templateHasMore ||
      templatesLoading ||
      templatesLoadingMore ||
      !effectiveOccasion
    )
      return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreTemplates();
      },
      { root, rootMargin: "120px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [
    musicTab,
    templateHasMore,
    templatesLoading,
    templatesLoadingMore,
    effectiveOccasion,
    loadMoreTemplates,
  ]);

  useEffect(() => {
    setSourceSongPreview(null);
  }, [sourceSongId]);

  // Auto-select latest draft when drafts list changes
  useEffect(() => {
    if (lyrics_drafts.length === 0) return;
    const latestId = lyrics_drafts[0].id;
    setSelectedDraftId((prev) => {
      if (prev !== null && lyrics_drafts.some((d) => d.id === prev))
        return prev;
      return latestId;
    });
  }, [lyrics_drafts]);

  useEffect(() => {
    if (!CUSTOM_SONG_POLLING_STATUSES.has(order.status)) return;
    const intervalId = window.setInterval(() => {
      void fetchState();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [order.status, fetchState]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTabSwitch = (tab: "create" | "template") => {
    setMusicTab(tab);
    if (tab === "create") setSourceSongId(null);
    else setMoods([]);
  };

  const toggleMood = (label: string) => {
    if (sourceSongId) setSourceSongId(null);
    setMoods((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  };

  const updateSourceSong = (id: number | null) => {
    setSourceSongId(id);
    if (id !== null) setMoods([]);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!effectiveOccasion) errs.occasion = "Please select an occasion";
    if (recipientDetails.trim().length < 2)
      errs.recipient = "Please enter the recipient's name";
    if (lyricsInputMode === "story" && selectedLanguages.length === 0)
      errs.language = "Please select at least one language";
    setFieldErrors(errs);

    if (errs.occasion) setShowOccasionSheet(true);
    else if (errs.recipient) {
      recipientRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      recipientRef.current?.focus();
    } else if (errs.language) {
      languageSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    return Object.keys(errs).length === 0;
  };

  const doSubmitForm = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/vendor-order/${orderToken}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientDetails,
          occasion: effectiveOccasionId ?? effectiveOccasion,
          languages:
            lyricsInputMode === "lyrics"
              ? "From lyrics"
              : selectedLanguages.join(" + "),
          lyricsInputMode,
          story: lyricsInputMode === "story" ? story : undefined,
          inputLyrics:
            lyricsInputMode === "lyrics" ? inputLyrics.trim() : undefined,
          moods,
          languagePreferences: languagePreferences.trim() || undefined,
          advancedMusicChips,
          musicStyleNotes: musicStyleNotes.trim() || undefined,
          nameDropTemplateId: sourceSongId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to submit song details.",
        );
      }
      await fetchState();
    } catch (e: unknown) {
      setFormError(
        e instanceof Error ? e.message : "Failed to submit song details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (
    lyricsDraftId: number,
    editedLyrics: string | null,
  ) => {
    setIsApproving(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/vendor-order/${orderToken}/approve-lyrics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lyricsDraftId,
            ...(editedLyrics != null ? { customerLyrics: editedLyrics } : {}),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to approve lyrics.",
        );
      }
      await fetchState();
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : "Failed to approve lyrics.",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleRevise = async (refineText: string) => {
    setIsRevising(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/vendor-order/${orderToken}/revise-lyrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refineText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to request revision.",
        );
      }
      await fetchState();
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : "Failed to request revision.",
      );
    } finally {
      setIsRevising(false);
    }
  };

  // ── Resolved state ────────────────────────────────────────────────────────

  // Memoize songStatus so SongOptionsDisplay doesn't reset variant selection on re-render
  // Include song_variants in deps so stream-ready updates during processing are picked up
  const memoizedSongStatus = useMemo(
    () =>
      user_song
        ? buildSongStatusFromUserSong(user_song, order.song_request_id)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user_song?.id,
      user_song?.status,
      user_song?.slug,
      user_song?.song_variants,
    ],
  );

  const selectedDraft =
    lyrics_drafts.find((d) => d.id === selectedDraftId) ??
    lyrics_drafts[0] ??
    null;

  const isLyricsReviewState =
    order.status === "lyrics_ready_for_review" ||
    order.status === "lyrics_revision_requested";

  // Lyrics review UI needs drafts from /api/vendor-order — avoid empty flash
  if (isLyricsReviewState && !selectedDraft) {
    return <CustomSongFlowSkeleton showBottomCtaSkeleton={false} />;
  }

  // ── Lyrics review state (full-height layout) ──────────────────────────────
  if (isLyricsReviewState && selectedDraft) {
    return (
      <>
        {actionError && (
          <div className="flex-shrink-0 px-4 pt-3">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 text-sm">{actionError}</p>
            </div>
          </div>
        )}

        {order.status === "lyrics_revision_requested" && (
          <SongCreationLoadingScreen
            stage="lyrics"
            title="Refining your lyrics"
            message="We are working our magic on your lyrics. Hang tight!"
          />
        )}

        {order.status === "lyrics_ready_for_review" &&
          selectedDraft.customer_lyrics && (
            <LyricsReviewPanel
              lyricsDraftId={selectedDraft.id}
              customerLyrics={selectedDraft.customer_lyrics}
              songTitle={selectedDraft.song_title}
              musicStyle={selectedDraft.music_style}
              editsRemaining={Math.max(
                0,
                2 - (song_request?.lyrics_edits_used ?? 0),
              )}
              versions={lyrics_drafts.map((d) => ({
                id: d.id,
                version: d.version,
              }))}
              selectedVersionId={selectedDraftId}
              onSelectVersion={setSelectedDraftId}
              isApproving={isApproving}
              isRevising={isRevising}
              onApprove={handleApprove}
              onRequestRevision={handleRevise}
            />
          )}
      </>
    );
  }

  // ── Non-lyrics-review states ──────────────────────────────────────────────
  return (
    <>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-36">
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{actionError}</p>
          </div>
        )}

        {order.status === "pending" && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-text-teal font-heading">
                Create Your Personalised Song
              </h1>
              {order.customer_name && (
                <p className="text-text-teal/60 mt-1 text-sm">
                  Hi {order.customer_name}! Fill in the details below and
                  we&apos;ll craft a song just for you.
                </p>
              )}
            </div>

            <CreatePageOccasionSection
              occasion={occasion}
              customOccasion={customOccasion}
              occasionError={fieldErrors.occasion}
              onOpenSheet={() => setShowOccasionSheet(true)}
            />

            <CreatePageRecipientSection
              recipientRef={recipientRef}
              effectiveOccasion={effectiveOccasion}
              recipientDetails={recipientDetails}
              onRecipientChange={(v) => {
                setRecipientDetails(v);
                if (fieldErrors.recipient)
                  setFieldErrors((p) => ({ ...p, recipient: "" }));
              }}
              recipientFocused={recipientFocused}
              onRecipientFocus={() => setRecipientFocused(true)}
              onRecipientBlur={() => setRecipientFocused(false)}
              recipientError={fieldErrors.recipient}
            />

            <CreatePageStoryLyricsSection
              lyricsInputMode={lyricsInputMode}
              onLyricsInputModeChange={(mode) => {
                setLyricsInputMode(mode);
                if (mode === "lyrics") {
                  setSourceSongId(null);
                  setMusicTab("create");
                  setSelectedLanguages([]);
                }
              }}
              effectiveOccasion={effectiveOccasion}
              story={story}
              onStoryChange={setStory}
              inputLyrics={inputLyrics}
              onInputLyricsChange={setInputLyrics}
              placeholderText={placeholderText}
              storySuggestions={storySuggestions}
              showInspiration={showInspiration}
              onShowInspiration={setShowInspiration}
              onRefreshStorySuggestions={() =>
                setStorySuggestions(getOccasionSuggestions(effectiveOccasionId))
              }
              onPickSuggestion={(text) => {
                setStory(text);
                setShowInspiration(false);
              }}
            />

            {lyricsInputMode === "story" && (
              <CreatePageLanguageSection
                languageSectionRef={languageSectionRef}
                selectedLanguages={selectedLanguages}
                onRemoveLanguage={(lang) =>
                  setSelectedLanguages((prev) => prev.filter((l) => l !== lang))
                }
                onToggleLanguagePreset={(lang) =>
                  setSelectedLanguages((prev) =>
                    prev.includes(lang)
                      ? prev.filter((l) => l !== lang)
                      : [...prev, lang],
                  )
                }
                onOpenLanguageSheet={() => {
                  setLangSearchText("");
                  setShowLanguageSheet(true);
                }}
                languageError={fieldErrors.language}
                languagePreferences={languagePreferences}
                onLanguagePreferencesChange={setLanguagePreferences}
              />
            )}

            <CreatePageMusicSection
              lyricsInputMode={lyricsInputMode}
              moods={moods}
              onToggleMood={toggleMood}
              musicTab={musicSectionTab}
              onTabSwitch={handleTabSwitch}
              templatesLocked={false}
              sourceSongId={sourceSongId}
              onUpdateSourceSongInUrl={updateSourceSong}
              templateScrollRef={templateScrollRef}
              templateLoadMoreSentinelRef={templateLoadMoreSentinelRef}
              templateSongs={templateSongs}
              templatesLoading={templatesLoading}
              templatesLoadingMore={templatesLoadingMore}
              templateHasMore={templateHasMore}
              showOffCarouselSelectedSlot={showOffCarouselSelectedSlot}
              sourceSongPreview={sourceSongPreview}
              songForInlinePlayer={songForInlinePlayer}
              occasion={effectiveOccasion}
              advancedMusicChips={advancedMusicChips}
              onToggleAdvancedMusicChip={(chip) =>
                setAdvancedMusicChips((prev) =>
                  prev.includes(chip)
                    ? prev.filter((c) => c !== chip)
                    : [...prev, chip],
                )
              }
              musicStyleNotes={musicStyleNotes}
              onMusicStyleNotesChange={setMusicStyleNotes}
            />

            {formError && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-sm">{formError}</p>
              </div>
            )}
          </div>
        )}

        {(order.status === "form_submitted" ||
          order.status === "lyrics_generation_inprogress") && (
          <SongCreationLoadingScreen
            stage="lyrics"
            title="Crafting your lyrics"
            message="Our RJ is writing a personalised song just for you. This takes about a minute."
          />
        )}

        {order.status === "lyrics_approved" && (
          <SongCreationLoadingScreen
            stage="song"
            duration={120}
            title="Generating your song"
            message="The AI is composing and recording your personalised song. This usually takes 2–4 minutes."
          />
        )}

        {order.status === "song_generation_inprogress" &&
          (memoizedSongStatus &&
          hasStreamReadyVariant(memoizedSongStatus.variants as any) ? (
            <>
              <SongOptionsDisplay
                songStatus={memoizedSongStatus}
                fullHeight={false}
                renderHeader={(actions) => (
                  <div className="flex items-center justify-end px-4 py-3 bg-[#FEFBF7]">
                    {actions}
                  </div>
                )}
                disableNavigation
              />
              <div className="text-center py-4 px-4">
                <p className="text-xs text-text-teal/50">
                  Need help?{" "}
                  <a
                    href={`https://wa.me/+917483464565?text=${encodeURIComponent(
                      `Hi, I need some help with my order.\n\nOrder: ${orderToken}\nVendor: ${state.vendor.name}${order.customer_name ? `\nName: ${order.customer_name}` : ""}\nSong ID: ${user_song?.id}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-text-teal/60 hover:text-text-teal/80 transition-colors"
                  >
                    Reach out to us on WhatsApp
                  </a>
                </p>
              </div>
            </>
          ) : (
            <SongCreationLoadingScreen
              stage="song"
              duration={120}
              title="Generating your song"
              message="The AI is composing and recording your personalised song. This usually takes 2–4 minutes."
            />
          ))}

        {order.status === "completed" && !memoizedSongStatus && (
          <SongCreationLoadingScreen
            showTimer={false}
            title="Loading your song"
            message="One moment while we get everything ready for you."
            stage="song"
          />
        )}

        {order.status === "completed" && memoizedSongStatus && (
          <>
            <SongOptionsDisplay
              songStatus={memoizedSongStatus}
              fullHeight={false}
              renderHeader={(actions) => (
                <div className="flex items-center justify-end px-4 py-3 bg-[#FEFBF7]">
                  {actions}
                </div>
              )}
              disableNavigation
            />
            <div className="text-center py-4 px-4">
              <p className="text-xs text-text-teal/50">
                Need help?{" "}
                <a
                  href={`https://wa.me/+917483464565?text=${encodeURIComponent(
                    `Hi, I need some help with my order.\n\nOrder: ${orderToken}\nVendor: ${state.vendor.name}${order.customer_name ? `\nName: ${order.customer_name}` : ""}\nSong ID: ${user_song?.id}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-text-teal/60 hover:text-text-teal/80 transition-colors"
                >
                  Reach out to us on WhatsApp
                </a>
              </p>
            </div>
          </>
        )}

        {order.status === "failed" && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-teal mb-2">
              Something went wrong
            </h2>
            <p className="text-text-teal/60 text-sm">
              We encountered an issue generating your song. Please contact
              support.
            </p>
            <p className="text-xs text-text-teal/50 mt-4">
              Need help?{" "}
              <a
                href={`https://wa.me/+917483464565?text=${encodeURIComponent(
                  `Hi, I need some help with my order.\n\nOrder: ${orderToken}\nVendor: ${state.vendor.name}${order.customer_name ? `\nName: ${order.customer_name}` : ""}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-text-teal/60 hover:text-text-teal/80 transition-colors"
              >
                Reach out to us on WhatsApp
              </a>
            </p>
          </div>
        )}
      </main>

      {/* Fixed bottom CTA — only for the pending form */}
      {order.status === "pending" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-secondary-cream/96 backdrop-blur-md border-t border-text-teal/8"
          style={{ boxShadow: "0 -4px 24px rgba(7,59,76,0.08)" }}
        >
          <div className="max-w-lg mx-auto px-4 py-4 text-white">
            <Button
              onClick={doSubmitForm}
              disabled={isSubmitting}
              className="w-full h-14 bg-accent-coral text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting…
                </span>
              ) : (
                <span className="flex items-center gap-2 text-white">
                  Create My Song
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      <CreatePageOccasionSheet
        isOpen={showOccasionSheet}
        onClose={() => setShowOccasionSheet(false)}
        occasion={occasion}
        customOccasion={customOccasion}
        onOccasionSelect={(occ) => {
          setOccasion(occ);
          setFieldErrors((p) => ({ ...p, occasion: "" }));
          if (occ !== "Other") setShowOccasionSheet(false);
        }}
        onCustomOccasionChange={setCustomOccasion}
        onConfirmOther={() => setShowOccasionSheet(false)}
      />

      <CreatePageLanguageSheet
        isOpen={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        langSearchText={langSearchText}
        onLangSearchChange={setLangSearchText}
        selectedLanguages={selectedLanguages}
        onToggleLanguage={(lang) =>
          setSelectedLanguages((prev) =>
            prev.includes(lang)
              ? prev.filter((l) => l !== lang)
              : [...prev, lang],
          )
        }
        onRemoveLanguage={(lang) =>
          setSelectedLanguages((prev) => prev.filter((l) => l !== lang))
        }
      />
    </>
  );
}

// ─── Build SongStatusResponse from user_song data ─────────────────────────────

function buildSongStatusFromUserSong(
  userSong: UserSongInfo,
  songRequestId?: number | null,
): SongStatusResponse {
  const variants = Array.isArray(userSong.song_variants)
    ? (userSong.song_variants as any[])
    : Object.values((userSong.song_variants as Record<string, any>) ?? {});

  return {
    success: true,
    status: userSong.status === "completed" ? "completed" : "processing",
    songId: userSong.id,
    slug: userSong.slug,
    songRequestId: songRequestId ?? undefined,
    variants: variants.map((v: any) => ({
      id: v.id ?? "",
      audioUrl: v.audioUrl ?? v.audio_url ?? "",
      streamAudioUrl:
        v.streamAudioUrl ?? v.stream_audio_url ?? v.audioUrl ?? "",
      sourceStreamAudioUrl: v.sourceStreamAudioUrl ?? v.source_stream_audio_url,
      sourceAudioUrl: v.sourceAudioUrl ?? v.source_audio_url,
      imageUrl: v.imageUrl ?? v.image_url ?? "",
      sourceImageUrl:
        v.sourceImageUrl ?? v.source_image_url ?? v.imageUrl ?? "",
      prompt: v.prompt,
      modelName: v.modelName ?? v.model_name ?? "V5",
      title: v.title ?? "",
      tags: v.tags,
      createTime: v.createTime ?? v.create_time,
      duration: v.duration,
      variantStatus: v.variantStatus ?? v.variant_status ?? "DOWNLOAD_READY",
    })),
  };
}
