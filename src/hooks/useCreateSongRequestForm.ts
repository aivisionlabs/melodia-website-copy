"use client";

/**
 * useCreateSongRequestForm
 *
 * Extracts the pure form state and UI logic from create-song-request/page.tsx
 * so that the same form can be rendered in both the standard create flow
 * and the vendor co-branded order flow (without routing or payment concerns).
 *
 * What this hook manages:
 *   - Multi-step form state (step, all field values)
 *   - Occasion-based template song fetching
 *   - Source song preview fetching (similar-style flow)
 *   - Mood toggle logic
 *   - Step navigation and validation
 *
 * What this hook does NOT do:
 *   - Navigate or redirect (caller handles routing)
 *   - Submit to any API (caller passes an onSubmit callback)
 *   - Handle payment or packages
 */

import { useState, useEffect, useRef } from "react";
import { getOccasionIdByLabel } from "@/lib/occasion-suggestions";

export type CreateSongFormStep = 1 | 2;

export interface SongPreview {
  id: number;
  title: string;
  imageUrl?: string | null;
  slug?: string;
  song_url?: string | null;
  service_provider?: string | null;
}

export interface CreateSongFormValues {
  recipientDetails: string;
  occasion: string;
  customOccasion: string;
  languages: string;
  story: string;
  moods: string[];
  customMood: string;
  sourceSongId: number | null;
}

export interface UseCreateSongRequestFormOptions {
  /** Initial occasion to pre-select (e.g. from partner order metadata). */
  initialOccasion?: string;
  /** Whether to include the source-song / similar-style section. Default true. */
  enableSimilarStyle?: boolean;
}

export function useCreateSongRequestForm({
  initialOccasion = "Adult Birthday",
  enableSimilarStyle = true,
}: UseCreateSongRequestFormOptions = {}) {
  const [step, setStep] = useState<CreateSongFormStep>(1);
  const [error, setError] = useState<string | null>(null);

  // Form field state
  const [recipientDetails, setRecipientDetails] = useState("");
  const [occasion, setOccasion] = useState<string>(initialOccasion);
  const [customOccasion, setCustomOccasion] = useState("");
  const [languages, setLanguages] = useState<string>("English");
  const [story, setStory] = useState("");
  const [moods, setMoods] = useState<string[]>(["Joyful"]);
  const [customMood, setCustomMood] = useState("");
  const [sourceSongId, setSourceSongId] = useState<number | null>(null);

  // Derived data from APIs
  const [sourceSongPreview, setSourceSongPreview] = useState<SongPreview | null>(null);
  const [templateSongs, setTemplateSongs] = useState<SongPreview[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const hasTrackedStep = useRef<number | null>(null);

  const effectiveOccasion = occasion === "Other" ? customOccasion.trim() : occasion;

  // Clear mood when similar-style source song selected
  useEffect(() => {
    if (!sourceSongId) return;
    setMoods([]);
    setCustomMood("");
  }, [sourceSongId]);

  // Fetch selected source song preview
  useEffect(() => {
    if (!enableSimilarStyle) return;
    let cancelled = false;
    async function run() {
      if (!sourceSongId) {
        setSourceSongPreview(null);
        return;
      }
      try {
        const resp = await fetch(`/api/library-song/${sourceSongId}`);
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.success && json.song) {
          setSourceSongPreview(json.song);
        } else {
          setSourceSongPreview(null);
        }
      } catch {
        if (!cancelled) setSourceSongPreview(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [sourceSongId, enableSimilarStyle]);

  // Fetch occasion-based persona templates
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const occ = effectiveOccasion;
      if (!occ) {
        setTemplateSongs([]);
        return;
      }
      setTemplatesLoading(true);
      try {
        const resp = await fetch(
          `/api/persona-templates?occasion=${encodeURIComponent(occ)}&limit=12`,
        );
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.success && Array.isArray(json.songs)) {
          setTemplateSongs(json.songs);
        } else {
          setTemplateSongs([]);
        }
      } catch {
        if (!cancelled) setTemplateSongs([]);
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [effectiveOccasion]);

  const toggleMood = (m: string) => {
    if (m === "Other") {
      if (moods.includes("Other")) {
        setMoods((prev) => prev.filter((x) => x !== "Other"));
        setCustomMood("");
      } else {
        setMoods(["Other"]);
        setCustomMood("");
      }
    } else {
      setMoods((prev) => {
        const withoutOther = prev.filter((x) => x !== "Other");
        return withoutOther.includes(m)
          ? withoutOther.filter((x) => x !== m)
          : [...withoutOther, m];
      });
      if (!moods.includes(m)) {
        setCustomMood("");
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, (prev as number) - 1) as CreateSongFormStep);
  };

  const validateAndGoNext = (): boolean => {
    if (!recipientDetails || recipientDetails.trim().length === 0) {
      setError(
        "Please enter the recipient's name and relationship (e.g., 'Sarah, my best friend' or 'Rohan, my brother').",
      );
      return false;
    }
    if (recipientDetails.trim().length < 2) {
      setError("Please provide at least 2 characters for the recipient details.");
      return false;
    }
    setError(null);
    setStep(2);
    return true;
  };

  /** Computed form values for submission. */
  const formValues: CreateSongFormValues = {
    recipientDetails,
    occasion:
      occasion === "Other"
        ? customOccasion
        : getOccasionIdByLabel(occasion) ?? occasion,
    customOccasion,
    languages,
    story,
    moods: moods.includes("Other") ? [customMood] : moods,
    customMood,
    sourceSongId,
  };

  return {
    // Step management
    step,
    setStep,
    handleBack,
    validateAndGoNext,

    // Field state
    recipientDetails,
    setRecipientDetails,
    occasion,
    setOccasion,
    customOccasion,
    setCustomOccasion,
    languages,
    setLanguages,
    story,
    setStory,
    moods,
    toggleMood,
    customMood,
    setCustomMood,
    sourceSongId,
    setSourceSongId,

    // Derived data
    sourceSongPreview,
    templateSongs,
    templatesLoading,
    effectiveOccasion,

    // UI state
    error,
    setError,

    // Computed
    formValues,
    hasTrackedStep,
  };
}
