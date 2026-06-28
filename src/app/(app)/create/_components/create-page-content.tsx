"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnonymousUser } from "@/hooks/use-anonymous-user";
import { trackFunnelEvent, trackPaymentEvent } from "@/lib/analytics";
import { usePaymentCheckout } from "@/hooks/use-payment-checkout";
import type { PaymentOrderResponse, PaymentResponse } from "@/types/payment";
import { paymentOrderAmountInr } from "@/types/payment";
import {
  getOccasionIdByLabel,
  getOccasionLabelById,
  getOccasionSuggestions,
  resolveOccasionId,
} from "@/lib/occasion-suggestions";
import {
  getCategorySlugForOccasionLabel,
  pickNameDropDefaultOccasion,
} from "@/lib/occasion-category-mapping";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import { toast } from "@/hooks/use-toast";
import {
  validatePhoneNumber,
  normalizePhoneForCashfree,
} from "@/lib/validation";
import { MIN_CUSTOM_LYRICS_LENGTH } from "@/lib/constants/lyrics";
import {
  ALL_OCCASIONS,
  DEFAULT_STORY_PROMPT,
  getDisplayPackageId,
  INTERNAL_PACKAGE_ID,
  OCCASION_STORY_PROMPTS,
  PACKAGES,
  STORY_LIMIT,
  TEMPLATE_PAGE_SIZE,
  type PackageId,
} from "./create-page-constants";
import type { LyricsInputMode, SongPreview } from "./create-page-types";
import { CreatePageBottomCta } from "./create-page-bottom-cta";
import { CreatePageHeader } from "./create-page-header";
import { CreatePageLanguageSection } from "./create-page-language-section";
import { CreatePageLanguageSheet } from "./create-page-language-sheet";
import { CreatePageMusicSection } from "./create-page-music-section";
import { CreatePageOccasionSection } from "./create-page-occasion-section";
import { CreatePageOccasionSheet } from "./create-page-occasion-sheet";
import { CreatePagePackageSection } from "./create-page-package-section";
import { CreatePagePhoneSection } from "./create-page-phone-section";
import { CreatePageRecipientSection } from "./create-page-recipient-section";
import { CreatePageStoryLyricsSection } from "./create-page-story-lyrics-section";
import { CreatePageNameDropTemplateSection } from "./namedrop/create-page-namedrop-template-section";
import { RecipientDialectConfirm } from "@/app/(app)/create-song/_components/recipient-dialect-confirm";
import { isTransliterableLanguage } from "@/lib/transliteration-languages";
import { templatedSongDisplayTitle } from "@/lib/templated-songs-utils";

function extractRecipientNameForTransliteration(
  recipientDetails: string,
  nameOnly: boolean,
): string {
  const trimmed = recipientDetails.trim();
  if (nameOnly) return trimmed;
  return trimmed.split(",")[0]?.trim() || trimmed;
}

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

export function CreatePageContent({
  showRecipientNameTransliteration = false,
}: {
  showRecipientNameTransliteration?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { anonymousUserId } = useAnonymousUser();
  const { scriptLoaded, scriptError, openCheckout } = usePaymentCheckout();

  const planFromUrl = useMemo((): PackageId | undefined => {
    const plan = searchParams.get("plan");
    if (
      plan &&
      (PACKAGES.some((p) => p.id === plan) || plan === INTERNAL_PACKAGE_ID)
    ) {
      return plan as PackageId;
    }
    return undefined;
  }, [searchParams]);

  const [selectedPackage, setSelectedPackage] = useState<PackageId | undefined>(
    () => {
      const plan = searchParams.get("plan");
      if (
        plan &&
        (PACKAGES.some((p) => p.id === plan) || plan === INTERNAL_PACKAGE_ID)
      ) {
        return plan as PackageId;
      }
      return "package_2";
    },
  );

  /** Only true if first load already had `?plan=` (e.g. /pricing → /create). */
  const [landedWithPlanQuery] = useState(() => {
    const plan = searchParams.get("plan");
    return !!(
      plan &&
      (PACKAGES.some((p) => p.id === plan) || plan === INTERNAL_PACKAGE_ID)
    );
  });

  /** User chose "Change package" after landing with `?plan=`. */
  const [packageChoiceExpanded, setPackageChoiceExpanded] = useState(false);
  const [occasion, setOccasion] = useState("Kids Birthday");
  const [customOccasion, setCustomOccasion] = useState("");
  const [recipientDetails, setRecipientDetails] = useState("");
  const [recipientNameInScript, setRecipientNameInScript] = useState("");
  const [recipientNameScriptLang, setRecipientNameScriptLang] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [story, setStory] = useState("");
  const [lyricsInputMode, setLyricsInputMode] =
    useState<LyricsInputMode>("story");
  const [inputLyrics, setInputLyrics] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [advancedMusicChips, setAdvancedMusicChips] = useState<string[]>([]);
  const [musicStyleNotes, setMusicStyleNotes] = useState("");
  const [sourceSongId, setSourceSongId] = useState<number | null>(null);
  const [sourceSongPreview, setSourceSongPreview] =
    useState<SongPreview | null>(null);
  const [templateSongs, setTemplateSongs] = useState<SongPreview[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesLoadingMore, setTemplatesLoadingMore] = useState(false);
  const [templateHasMore, setTemplateHasMore] = useState(false);
  const [templateNextOffset, setTemplateNextOffset] = useState(0);
  const [nameDropTemplates, setNameDropTemplates] = useState<
    Array<{
      id: number;
      title: string;
      slug: string;
      language?: string | null;
      imageUrl?: string | null;
      previewAudioUrl?: string | null;
      templateLyrics?: string | null;
    }>
  >([]);
  const [nameDropTemplatesLoading, setNameDropTemplatesLoading] =
    useState(false);
  const [nameDropTemplateId, setNameDropTemplateId] = useState<number | null>(
    null,
  );
  /** `null` = not loaded yet. Category slugs in DB with ≥1 active templated song (drives NameDrop, no hardcoded occasion list). */
  const [nameDropTemplateCategorySlugs, setNameDropTemplateCategorySlugs] =
    useState<Set<string> | null>(null);

  const [storySuggestions, setStorySuggestions] = useState<string[]>([]);
  const [showInspiration, setShowInspiration] = useState(false);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const [mobileNumber, setMobileNumber] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);

  const [showOccasionSheet, setShowOccasionSheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [langSearchText, setLangSearchText] = useState("");
  const [musicTab, setMusicTab] = useState<"create" | "template">("template");
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const recipientRef = useRef<HTMLInputElement>(null);
  const occasionSectionRef = useRef<HTMLDivElement>(null);
  const lastScrolledPlanParamRef = useRef<string | null>(null);
  const languageSectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const lastTrackedPrefillPlanRef = useRef<string | null>(null);
  const templatesFetchSeq = useRef(0);
  const templateScrollRef = useRef<HTMLDivElement>(null);
  const templateLoadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const scrollToOccasionSection = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        occasionSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

  const effectiveOccasion =
    occasion === "Other" ? customOccasion.trim() : occasion;
  const effectiveOccasionId =
    occasion === "Other" ? null : getOccasionIdByLabel(occasion);
  const effectiveLanguage =
    lyricsInputMode === "lyrics"
      ? "From lyrics"
      : selectedLanguages.length > 0
        ? selectedLanguages.join(" + ")
        : "English";
  const templatesLocked = selectedPackage === "package_1";
  const isNameDrop = selectedPackage === "package_1";
  const isConcierge = selectedPackage === "package_3";
  const nameDropCategorySlug =
    getCategorySlugForOccasionLabel(effectiveOccasion);
  const isNameDropOccasionSupported = useMemo(() => {
    if (!isNameDrop) return true;
    if (!nameDropCategorySlug) return false;
    if (nameDropTemplateCategorySlugs === null) return true;
    return nameDropTemplateCategorySlugs.has(nameDropCategorySlug);
  }, [isNameDrop, nameDropCategorySlug, nameDropTemplateCategorySlugs]);
  const showNameDropFlow = isNameDrop && isNameDropOccasionSupported;
  const selectedNameDropTemplate = useMemo(
    () => nameDropTemplates.find((t) => t.id === nameDropTemplateId) ?? null,
    [nameDropTemplates, nameDropTemplateId],
  );
  const transliterationDefaultLanguage = showNameDropFlow
    ? selectedNameDropTemplate?.language ?? "Hindi"
    : effectiveLanguage;
  const recipientNameForTransliteration = extractRecipientNameForTransliteration(
    recipientDetails,
    isNameDrop,
  );
  const showRecipientTransliteration =
    showRecipientNameTransliteration &&
    recipientNameForTransliteration.length >= 2 &&
    isTransliterableLanguage(transliterationDefaultLanguage);

  /** NameDrop sheet occasions. */
  const nameDropSheetOccasions = useMemo((): string[] | undefined => {
    if (!isNameDrop || nameDropTemplateCategorySlugs === null) return undefined;
    return ALL_OCCASIONS.filter((o) => {
      if (o === "Other") return true;
      const s = getCategorySlugForOccasionLabel(o);
      return s != null && nameDropTemplateCategorySlugs.has(s);
    });
  }, [isNameDrop, nameDropTemplateCategorySlugs]);
  const createPageHeaderSteps = useMemo(
    () =>
      showNameDropFlow
        ? [
            { num: "1", label: "Input fields", active: true },
            { num: "2", label: "Pay & Get 2 songs", active: false },
          ]
        : isConcierge
          ? [
              { num: "1", label: "Share details", active: true },
              { num: "2", label: "Pay & Expert handoff", active: false },
            ]
          : undefined,
    [showNameDropFlow, isConcierge],
  );
  const hasValidLyricsInput =
    lyricsInputMode === "lyrics"
      ? inputLyrics.trim().length >= MIN_CUSTOM_LYRICS_LENGTH &&
        inputLyrics.length <= STORY_LIMIT * 3
      : true;

  const canSubmit = isNameDrop
    ? !!selectedPackage &&
      !!(occasion && (occasion !== "Other" || customOccasion.trim())) &&
      !!nameDropTemplateId &&
      recipientDetails.trim().length >= 2 &&
      mobileNumber.trim().length >= 10
    : !!selectedPackage &&
      !!(occasion && (occasion !== "Other" || customOccasion.trim())) &&
      recipientDetails.trim().length >= 2 &&
      (lyricsInputMode === "story" ? selectedLanguages.length > 0 : true) &&
      hasValidLyricsInput &&
      mobileNumber.trim().length >= 10;

  const updateSourceSongInUrl = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id && id > 0) params.set("sourceSongId", String(id));
      else params.delete("sourceSongId");
      const qs = params.toString();
      router.replace(qs ? `/create?${qs}` : "/create", { scroll: false });
    },
    [router, searchParams],
  );

  const updatePlanInUrl = useCallback(
    (id: PackageId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("plan", id);
      router.replace(`/create?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const updateOccasionInUrl = useCallback(
    (occ: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const occId = getOccasionIdByLabel(occ);
      if (occId) params.set("occasion", occId);
      else params.delete("occasion");
      if (selectedPackage) params.set("plan", selectedPackage);
      router.replace(`/create?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedPackage],
  );

  const handleUpgradeNameDropToFullCustom = useCallback(() => {
    const pkg = PACKAGES.find((p) => p.id === "package_2");
    if (pkg) trackFunnelEvent.packageSelect(pkg.name, pkg.price, pkg.id);
    setNameDropTemplateId(null);
    setFieldErrors((p) => ({ ...p, nameDropTemplate: "" }));
    setSelectedPackage("package_2");
    updatePlanInUrl("package_2");
  }, [updatePlanInUrl]);

  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackFunnelEvent.formStepView(1, "create_page");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/templated-songs/categories")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success && Array.isArray(j.categorySlugs)) {
          setNameDropTemplateCategorySlugs(new Set(j.categorySlugs));
        } else {
          setNameDropTemplateCategorySlugs(new Set());
        }
      })
      .catch(() => {
        if (!cancelled) setNameDropTemplateCategorySlugs(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const plan = searchParams.get("plan");
    const isKnownPackage =
      !!plan &&
      (PACKAGES.some((pkg) => pkg.id === plan) || plan === INTERNAL_PACKAGE_ID);
    if (isKnownPackage) setSelectedPackage(plan as PackageId);
    const occ = searchParams.get("occasion");
    if (occ) {
      const id = resolveOccasionId(occ);
      const label = id
        ? getOccasionLabelById(id)
        : ALL_OCCASIONS.includes(occ)
          ? occ
          : null;
      if (label) setOccasion(label);
    }
  }, [searchParams]);

  useEffect(() => {
    setPackageChoiceExpanded(false);
  }, [planFromUrl]);

  useEffect(() => {
    if (!landedWithPlanQuery || !planFromUrl) {
      if (!planFromUrl) lastTrackedPrefillPlanRef.current = null;
      return;
    }
    if (lastTrackedPrefillPlanRef.current === planFromUrl) return;
    lastTrackedPrefillPlanRef.current = planFromUrl;
    const displayId = getDisplayPackageId(planFromUrl);
    const pkg = displayId
      ? PACKAGES.find((p) => p.id === displayId)
      : undefined;
    if (pkg) {
      trackFunnelEvent.createPlanPrefilled(pkg.name, pkg.price, planFromUrl);
    }
  }, [planFromUrl, landedWithPlanQuery]);

  useEffect(() => {
    const rawPlan = searchParams.get("plan");
    const validPlan =
      rawPlan &&
      (PACKAGES.some((p) => p.id === rawPlan) ||
        rawPlan === INTERNAL_PACKAGE_ID)
        ? rawPlan
        : null;

    if (!validPlan) {
      lastScrolledPlanParamRef.current = null;
      return;
    }

    if (lastScrolledPlanParamRef.current === validPlan) {
      return;
    }
    lastScrolledPlanParamRef.current = validPlan;

    scrollToOccasionSection();
  }, [searchParams, scrollToOccasionSection]);

  useEffect(() => {
    const raw = searchParams.get("sourceSongId");
    if (!raw) {
      setSourceSongId(null);
      return;
    }
    const parsed = parseInt(raw, 10);
    setSourceSongId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }, [searchParams]);

  useEffect(() => {
    if (sourceSongId && lyricsInputMode !== "lyrics") {
      setMoods([]);
      setMusicTab("template");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSongId, lyricsInputMode]);

  useEffect(() => {
    if (selectedPackage === "package_1" && sourceSongId) {
      setSourceSongId(null);
      updateSourceSongInUrl(null);
      setMusicTab("create");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackage]);

  useEffect(() => {
    if (
      selectedPackage !== "package_1" ||
      nameDropTemplateCategorySlugs === null
    )
      return;
    if (nameDropTemplateCategorySlugs.size === 0) return;

    if (occasion === "Other") {
      if (!customOccasion.trim()) {
        const next = pickNameDropDefaultOccasion(
          nameDropTemplateCategorySlugs,
          ALL_OCCASIONS,
        );
        if (next !== "Other") {
          setOccasion(next);
          setCustomOccasion("");
          updateOccasionInUrl(next);
        }
      }
      return;
    }

    const slug = getCategorySlugForOccasionLabel(occasion);
    if (slug && nameDropTemplateCategorySlugs.has(slug)) return;

    const next = pickNameDropDefaultOccasion(
      nameDropTemplateCategorySlugs,
      ALL_OCCASIONS,
    );
    if (next === occasion) return;
    setOccasion(next);
    setCustomOccasion("");
    updateOccasionInUrl(next);
    if (slug) {
      toast({
        variant: "snackbar",
        description: `NameDrop has no template for that category yet. Showing ${next} templates instead.`,
        duration: 6000,
      });
    }
  }, [
    selectedPackage,
    occasion,
    customOccasion,
    nameDropTemplateCategorySlugs,
    updateOccasionInUrl,
  ]);

  useEffect(() => {
    // sourceSongId now references a templated_songs.id; preview is resolved from
    // templateSongs carousel directly via selectedTemplateInCarousel.
    setSourceSongPreview(null);
  }, [sourceSongId]);

  useEffect(() => {
    let cancelled = false;
    if (!showNameDropFlow) {
      setNameDropTemplates([]);
      setNameDropTemplatesLoading(false);
      setNameDropTemplateId(null);
      return;
    }

    const categorySlug = getCategorySlugForOccasionLabel(effectiveOccasion);
    if (!categorySlug) {
      setNameDropTemplates([]);
      setNameDropTemplatesLoading(false);
      setNameDropTemplateId(null);
      return;
    }

    setNameDropTemplatesLoading(true);
    fetch(
      `/api/templated-songs?namedrop=true&categorySlug=${encodeURIComponent(categorySlug)}`,
    )
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success || !Array.isArray(j.templatedSongs)) {
          setNameDropTemplates([]);
          setNameDropTemplateId(null);
          return;
        }

        const mapped = j.templatedSongs.map((t: any) => {
          const variants = Array.isArray(t.song_variants)
            ? t.song_variants
            : t.song_variants && typeof t.song_variants === "object"
              ? Object.values(t.song_variants)
              : [];
          const selectedIdx =
            typeof t.selected_variant === "number" ? t.selected_variant : 0;
          const selected = variants[selectedIdx] || variants[0] || {};
          const imageUrl =
            selected?.sourceImageUrl || selected?.imageUrl || null;
          const previewAudioUrl =
            selected?.sourceAudioUrl ||
            selected?.streamAudioUrl ||
            selected?.audioUrl ||
            null;

          return {
            id: t.id as number,
            title: templatedSongDisplayTitle(t) as string,
            slug: t.slug as string,
            language: (t.language || null) as string | null,
            description: (t.description || null) as string | null,
            imageUrl,
            previewAudioUrl,
            templateLyrics: (t.template_lyrics || null) as string | null,
          };
        });

        setNameDropTemplates(mapped);
        setNameDropTemplateId((prev) =>
          prev && mapped.some((x: any) => x.id === prev) ? prev : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setNameDropTemplates([]);
          setNameDropTemplateId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setNameDropTemplatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showNameDropFlow, effectiveOccasion]);

  useEffect(() => {
    let cancelled = false;
    const categorySlug = getCategorySlugForOccasionLabel(effectiveOccasion);
    if (!effectiveOccasion || !categorySlug) {
      setTemplateSongs([]);
      setTemplateHasMore(false);
      setTemplateNextOffset(0);
      setTemplatesLoading(false);
      setTemplatesLoadingMore(false);
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

  // On occasion change, reset the music tab so the new occasion's template count
  // is re-evaluated from scratch (auto-switch below will set to "create" if needed).
  useEffect(() => {
    setMusicTab("template");
  }, [effectiveOccasion]);

  // When templates finish loading with fewer than 3 results, fall back to the
  // "create your own" mood-chips view so the empty template carousel isn't shown.
  useEffect(() => {
    if (!templatesLoading && templateSongs.length < 3 && musicTab === "template") {
      setMusicTab("create");
    }
  }, [templatesLoading, templateSongs.length, musicTab]);

  const loadMoreTemplates = useCallback(() => {
    const categorySlug = getCategorySlugForOccasionLabel(effectiveOccasion);
    if (
      !effectiveOccasion ||
      !categorySlug ||
      !templateHasMore ||
      templatesLoading ||
      templatesLoadingMore
    ) {
      return;
    }
    const seq = templatesFetchSeq.current;
    const offset = templateNextOffset;
    setTemplatesLoadingMore(true);
    fetch(
      `/api/templated-songs?categorySlug=${encodeURIComponent(categorySlug)}&limit=${TEMPLATE_PAGE_SIZE}&offset=${offset}`,
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

  useEffect(() => {
    if (musicTab !== "template" || templatesLocked) return;
    const root = templateScrollRef.current;
    const sentinel = templateLoadMoreSentinelRef.current;
    if (
      !root ||
      !sentinel ||
      !templateHasMore ||
      templatesLoading ||
      templatesLoadingMore ||
      !effectiveOccasion
    ) {
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreTemplates();
        }
      },
      { root, rootMargin: "120px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [
    musicTab,
    templatesLocked,
    templateHasMore,
    templatesLoading,
    templatesLoadingMore,
    effectiveOccasion,
    loadMoreTemplates,
  ]);

  useEffect(() => {
    setStorySuggestions(getOccasionSuggestions(effectiveOccasionId));
  }, [effectiveOccasionId]);

  useEffect(() => {
    setPlaceholderIndex(0);
    setShowInspiration(false);
  }, [effectiveOccasion, effectiveOccasionId]);

  const placeholderText = useMemo(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const placeholders = prompts.placeholders;
    return (
      placeholders[placeholderIndex % placeholders.length] ??
      "Share a memory..."
    );
  }, [effectiveOccasion, placeholderIndex]);

  useEffect(() => {
    const prompts =
      OCCASION_STORY_PROMPTS[effectiveOccasion] || DEFAULT_STORY_PROMPT;
    const count = prompts.placeholders.length;
    if (count <= 1) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % count);
    }, 2500);
    return () => clearInterval(interval);
  }, [effectiveOccasion, effectiveOccasionId]);

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

  const handleTabSwitch = (tab: "create" | "template") => {
    setMusicTab(tab);
    if (tab === "create") {
      setSourceSongId(null);
      updateSourceSongInUrl(null);
    } else {
      setMoods([]);
    }
  };

  const toggleMood = (m: string) => {
    if (sourceSongId) {
      setSourceSongId(null);
      updateSourceSongInUrl(null);
    }
    setMoods((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  };

  const removeLanguage = (lang: string) => {
    setSelectedLanguages((prev) => prev.filter((l) => l !== lang));
  };

  const toggleLanguagePreset = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const handleLyricsInputModeChange = (mode: LyricsInputMode) => {
    setLyricsInputMode(mode);
    if (mode === "lyrics") {
      setSourceSongId(null);
      updateSourceSongInUrl(null);
      setMusicTab("create");
      setSelectedLanguages([]);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.inputLyrics;
        delete next.language;
        return next;
      });
    } else {
      setFieldErrors((prev) => {
        if (!prev.inputLyrics) return prev;
        const next = { ...prev };
        delete next.inputLyrics;
        return next;
      });
    }
    trackFunnelEvent.inputModeChange(mode);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedPackage) {
      errs.package = "Please choose a package to continue";
    }
    if (!occasion) {
      errs.occasion = "Please select an occasion";
    }
    if (!recipientDetails || recipientDetails.trim().length < 2) {
      errs.recipient = isNameDrop
        ? "Please enter the recipient's name"
        : "Please enter the recipient's name and relationship";
    }
    if (
      !isNameDrop &&
      lyricsInputMode === "story" &&
      selectedLanguages.length === 0
    ) {
      errs.language = "Please select at least one language";
    }
    if (
      !isNameDrop &&
      lyricsInputMode === "lyrics" &&
      inputLyrics.trim().length < MIN_CUSTOM_LYRICS_LENGTH
    ) {
      errs.inputLyrics = `Please enter at least ${MIN_CUSTOM_LYRICS_LENGTH} characters of lyrics`;
    }
    if (isNameDrop && !nameDropTemplateId) {
      errs.nameDropTemplate = "Please select a NameDrop template";
    }
    const phoneErr = validatePhoneNumber(mobileNumber.trim());
    if (!mobileNumber.trim()) {
      errs.mobileNumber = "WhatsApp number is required";
    } else if (phoneErr) {
      errs.mobileNumber = phoneErr;
    }
    setFieldErrors(errs);
    if (errs.package) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (errs.occasion) {
      setShowOccasionSheet(true);
    } else if (errs.recipient) {
      recipientRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      recipientRef.current?.focus();
    } else if (errs.nameDropTemplate) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (errs.language) {
      languageSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    return Object.keys(errs).length === 0;
  };

  /**
   * 299 NameDrop & 1499 Concierge: open Cashfree/Razorpay immediately;
   * back from Cashfree / Razorpay cancel → /payment?requestId= with review
   */
  const initiateDirectPaymentCheckout = useCallback(
    async (songRequestId: number, paidPackageId: PackageId) => {
      const pkg = PACKAGES.find((p) => p.id === paidPackageId);
      const pkgName = pkg?.name ?? "Personalized Song";

      if (!scriptLoaded || scriptError) {
        router.push(`/payment?requestId=${songRequestId}`);
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songRequestId,
          }),
        });

        const orderData: PaymentOrderResponse = await response.json();

        if (!response.ok || !orderData.success) {
          router.push(`/payment?requestId=${songRequestId}`);
          setIsSubmitting(false);
          return;
        }

        const price = paymentOrderAmountInr(orderData);

        trackPaymentEvent.paymentInitiated(
          songRequestId,
          price,
          orderData.provider || "unknown",
          pkgName,
        );

        // So “back” from Cashfree lands on /payment (review) instead of /create
        if (typeof window !== "undefined") {
          window.history.replaceState(
            window.history.state,
            "",
            `/payment?requestId=${songRequestId}`,
          );
        }

        openCheckout({
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          orderId: orderData.orderId,
          name: "Melodia",
          description: "Personalized Song Generation",
          handler: async (paymentResponse: PaymentResponse) => {
            try {
              await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  payment_id: paymentResponse.paymentId,
                  order_id: paymentResponse.orderId,
                  signature: paymentResponse.signature,
                }),
              });
            } catch {
              // payment page can verify on load
            }
            window.location.replace(`/payment?requestId=${songRequestId}`);
          },
          onCancel: () => {
            setIsSubmitting(false);
            trackPaymentEvent.paymentCancelled(songRequestId, price);
            router.push(`/payment?requestId=${songRequestId}`);
          },
          theme: { color: "#EF476F" },
          providerData: orderData.providerData,
        });

        if (
          orderData.provider !== "cashfree" ||
          !orderData.providerData?.checkoutUrl
        ) {
          setIsSubmitting(false);
        }
      } catch (e) {
        console.error("Direct payment checkout after create:", e);
        trackPaymentEvent.paymentFailed(
          songRequestId,
          pkg?.price ?? 0,
          e instanceof Error ? e.message : "Checkout failed",
          pkgName,
        );
        router.push(`/payment?requestId=${songRequestId}`);
        setIsSubmitting(false);
      }
    },
    [router, scriptLoaded, scriptError, openCheckout],
  );

  const handleRecipientDetailsChange = useCallback((value: string) => {
    setRecipientDetails((prev) => {
      if (prev !== value) {
        setRecipientNameInScript("");
        setRecipientNameScriptLang("");
      }
      return value;
    });
    if (fieldErrors.recipient) {
      setFieldErrors((p) => ({ ...p, recipient: "" }));
    }
  }, [fieldErrors.recipient]);

  const handleRecipientNameInScriptConfirm = useCallback(
    (value: string, language: string) => {
      setRecipientNameInScript(value);
      setRecipientNameScriptLang(language);
    },
    [],
  );

  const handleReviewClick = () => {
    setError(null);
    if (!validate()) return;
    trackFunnelEvent.formStepComplete(1, "create_page");
    const normalizedPhone = normalizePhoneForCashfree(mobileNumber.trim());
    handleCreateSongRequest(normalizedPhone, "");
  };

  const handleCreateSongRequest = async (mobile: string, email: string) => {
    if (!selectedPackage) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        recipientDetails,
        recipientNameInScript: recipientNameInScript.trim() || undefined,
        recipientNameScriptLang: recipientNameScriptLang.trim() || undefined,
        occasion:
          occasion === "Other"
            ? customOccasion
            : effectiveOccasionId ?? occasion,
        languages: isNameDrop ? "NameDrop" : effectiveLanguage,
        story: isNameDrop ? "" : lyricsInputMode === "story" ? story : "",
        lyricsInputMode: isNameDrop ? "story" : lyricsInputMode,
        inputLyrics:
          !isNameDrop && lyricsInputMode === "lyrics" ? inputLyrics.trim() : "",
        mood: isNameDrop ? [] : moods,
        languagePreferences: languagePreferences.trim() || undefined,
        advancedMusicChips: isNameDrop ? [] : advancedMusicChips,
        musicStyleNotes: isNameDrop ? "" : musicStyleNotes.trim() || undefined,
        mobileNumber: mobile,
        email,
        userId: null,
        anonymousUserId,
        selectedPackage,
        ...(isNameDrop && nameDropTemplateId
          ? {
              nameDropTemplateId,
              requestSource: "namedrop_template",
            }
          : {}),
        ...(!isNameDrop && lyricsInputMode === "story" && sourceSongId
          ? { nameDropTemplateId: sourceSongId, requestSource: "music_template_style" }
          : {}),
      };
      const res = await fetch("/api/create-song-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData?.issues && Array.isArray(errData.issues)) {
          const first = errData.issues[0];
          let msg = first?.message || "Validation error";
          if (first?.path?.includes("recipientDetails"))
            msg = isNameDrop
              ? "Please enter the recipient's name."
              : "Please enter the recipient's name and relationship.";
          else if (first?.path?.includes("languages"))
            msg = "Please enter a language for the song.";
          else if (first?.path?.includes("inputLyrics"))
            msg = `Please enter at least ${MIN_CUSTOM_LYRICS_LENGTH} characters of lyrics.`;
          throw new Error(msg);
        }
        throw new Error(
          errData?.errorMessage ||
            errData?.error ||
            "Failed to create song request",
        );
      }
      const { requestId } = await res.json();
      trackFunnelEvent.songRequestSubmit(requestId, selectedPackage);
      queueMySongsNudge(requestId, "request_captured");
      // Payment-first for every package. Personalized (599 / internal) generates and
      // reviews lyrics *after* payment on /generate-lyrics; NameDrop (299) and Concierge
      // (1499) keep their post-payment destinations. Straight to Cashfree/Razorpay;
      // back/cancel → /payment?requestId= for review + retry.
      await initiateDirectPaymentCheckout(requestId, selectedPackage);
      return;
    } catch (err) {
      setError(`Sorry, there was an error. ${err}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-cream font-body">
      <CreatePageHeader
        onBack={() => router.back()}
        steps={createPageHeaderSteps}
      />

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-36">
        <CreatePagePackageSection
          selectedPackage={selectedPackage}
          onSelectPackage={(id) => {
            setSelectedPackage(id);
            updatePlanInUrl(id);
            setPackageChoiceExpanded(false);
            setFieldErrors((p) => ({ ...p, package: "" }));
            scrollToOccasionSection();
          }}
          packageError={fieldErrors.package}
          prefilledSummary={Boolean(
            landedWithPlanQuery && planFromUrl && !packageChoiceExpanded,
          )}
          onExpandPackageChoice={() => setPackageChoiceExpanded(true)}
        />

        <div ref={occasionSectionRef} className="scroll-mt-24">
          <CreatePageOccasionSection
            occasion={occasion}
            customOccasion={customOccasion}
            occasionError={fieldErrors.occasion}
            onOpenSheet={() => setShowOccasionSheet(true)}
          />
        </div>

        {!showNameDropFlow ? (
          <CreatePageRecipientSection
            recipientRef={recipientRef}
            effectiveOccasion={effectiveOccasion}
            recipientDetails={recipientDetails}
            onRecipientChange={handleRecipientDetailsChange}
            recipientFocused={recipientFocused}
            onRecipientFocus={() => setRecipientFocused(true)}
            onRecipientBlur={() => setRecipientFocused(false)}
            recipientError={fieldErrors.recipient}
            nameOnlyRecipient={isNameDrop}
          />
        ) : null}

        {!showNameDropFlow && showRecipientTransliteration ? (
          <RecipientDialectConfirm
            name={recipientNameForTransliteration}
            defaultLanguage={transliterationDefaultLanguage}
            confirmedValue={recipientNameInScript}
            confirmedLanguage={recipientNameScriptLang}
            onConfirm={handleRecipientNameInScriptConfirm}
            className="mb-7 rounded-2xl border border-text-teal/10 bg-white p-4"
          />
        ) : null}

        {showNameDropFlow ? (
          <>
            <CreatePageNameDropTemplateSection
              loading={nameDropTemplatesLoading}
              templates={nameDropTemplates}
              selectedTemplateId={nameDropTemplateId}
              onSelectTemplate={(id) => {
                setNameDropTemplateId(id);
                setFieldErrors((p) => ({ ...p, nameDropTemplate: "" }));
              }}
              effectiveOccasion={effectiveOccasion}
              recipientRef={recipientRef}
              recipientDetails={recipientDetails}
              onRecipientChange={handleRecipientDetailsChange}
              recipientFocused={recipientFocused}
              onRecipientFocus={() => setRecipientFocused(true)}
              onRecipientBlur={() => setRecipientFocused(false)}
              recipientError={fieldErrors.recipient}
              onUpgradeToFullCustom={handleUpgradeNameDropToFullCustom}
            />
            {showRecipientTransliteration && nameDropTemplateId ? (
              <RecipientDialectConfirm
                name={recipientNameForTransliteration}
                defaultLanguage={transliterationDefaultLanguage}
                confirmedValue={recipientNameInScript}
                confirmedLanguage={recipientNameScriptLang}
                onConfirm={handleRecipientNameInScriptConfirm}
                className="mb-5 rounded-2xl border border-text-teal/10 bg-white p-4"
              />
            ) : null}
            {fieldErrors.nameDropTemplate ? (
              <p className="-mt-3 mb-4 text-xs font-medium text-red-500">
                {fieldErrors.nameDropTemplate}
              </p>
            ) : null}
          </>
        ) : (
          <CreatePageStoryLyricsSection
            lyricsInputMode={lyricsInputMode}
            onLyricsInputModeChange={handleLyricsInputModeChange}
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
            inputLyricsError={fieldErrors.inputLyrics}
          />
        )}

        {!showNameDropFlow && lyricsInputMode === "story" && (
          <CreatePageLanguageSection
            languageSectionRef={languageSectionRef}
            selectedLanguages={selectedLanguages}
            onRemoveLanguage={removeLanguage}
            onToggleLanguagePreset={toggleLanguagePreset}
            onOpenLanguageSheet={() => {
              setLangSearchText("");
              setShowLanguageSheet(true);
            }}
            languageError={fieldErrors.language}
            languagePreferences={languagePreferences}
            onLanguagePreferencesChange={setLanguagePreferences}
          />
        )}

        {!showNameDropFlow ? (
          <CreatePageMusicSection
            lyricsInputMode={lyricsInputMode}
            moods={moods}
            onToggleMood={toggleMood}
            musicTab={musicTab}
            onTabSwitch={handleTabSwitch}
            templatesLocked={templatesLocked}
            sourceSongId={sourceSongId}
            onUpdateSourceSongInUrl={updateSourceSongInUrl}
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
        ) : null}

        <CreatePagePhoneSection
          mobileNumber={mobileNumber}
          onMobileNumberChange={(value) => {
            const v = value.replace(/[^\d\s+\-()]/g, "");
            setMobileNumber(v);
            if (fieldErrors.mobileNumber)
              setFieldErrors((p) => ({ ...p, mobileNumber: "" }));
          }}
          phoneFocused={phoneFocused}
          onPhoneFocus={() => setPhoneFocused(true)}
          onPhoneBlur={() => setPhoneFocused(false)}
          mobileError={fieldErrors.mobileNumber}
        />
      </div>

      <CreatePageBottomCta
        selectedPackage={getDisplayPackageId(selectedPackage)}
        error={error}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        buttonLabel="Proceed to Pay"
        submittingLabel="Processing..."
        onReviewClick={handleReviewClick}
      />

      <CreatePageOccasionSheet
        isOpen={showOccasionSheet}
        onClose={() => setShowOccasionSheet(false)}
        occasion={occasion}
        customOccasion={customOccasion}
        onOccasionSelect={(occ) => {
          setOccasion(occ);
          updateOccasionInUrl(occ);
          setFieldErrors((p) => ({ ...p, occasion: "" }));
          if (occ !== "Other") setShowOccasionSheet(false);
        }}
        onCustomOccasionChange={setCustomOccasion}
        onConfirmOther={() => {
          if (customOccasion.trim()) setShowOccasionSheet(false);
        }}
        occasions={nameDropSheetOccasions}
      />

      <CreatePageLanguageSheet
        isOpen={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        langSearchText={langSearchText}
        onLangSearchChange={setLangSearchText}
        selectedLanguages={selectedLanguages}
        onToggleLanguage={toggleLanguagePreset}
        onRemoveLanguage={removeLanguage}
      />
    </div>
  );
}
