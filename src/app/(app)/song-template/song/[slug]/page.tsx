"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import {
  getVariantsList,
  normalizeVariantForPlayer,
  type NormalizedPlayerVariant,
} from "@/lib/utils/variant-utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TemplatedSongDisplay from "./TemplatedSongDisplay";

const POLL_INTERVAL_MS = 3000;

type MappedSong = ReturnType<typeof mapInstanceToSong>;

function mapInstanceToSong(
  instance: {
    id: number;
    slug: string;
    status: string;
    song_title: string;
    recipient_name: string;
    replaced_lyrics?: string | null;
    song_variants: unknown;
  },
  selectedVariantIndex = 0,
) {
  const rawVariants = getVariantsList(instance.song_variants);
  const variants = rawVariants
    .map(normalizeVariantForPlayer)
    .filter((v): v is NormalizedPlayerVariant => !!v);
  const safeVariantIndex = Math.max(
    0,
    Math.min(selectedVariantIndex, Math.max(variants.length - 1, 0)),
  );
  const selected = variants[safeVariantIndex] ?? variants[0];

  const plainLyrics = instance.replaced_lyrics?.trim() || undefined;

  return {
    id: String(instance.id),
    title: instance.recipient_name,
    artist: instance.song_title,
    duration: selected?.duration ?? 0,
    slug: instance.slug,
    selected_variant: safeVariantIndex,
    suno_variants: variants,
    lyrics: plainLyrics ?? null,
    audioUrl:
      selected?.variantStatus === "DOWNLOAD_READY"
        ? selected?.sourceAudioUrl || selected?.audioUrl || selected?.sourceStreamAudioUrl || selected?.streamAudioUrl || undefined
        : selected?.sourceStreamAudioUrl || selected?.streamAudioUrl || undefined,
    song_url:
      selected?.sourceAudioUrl ||
      selected?.streamAudioUrl ||
      selected?.audioUrl ||
      undefined,
  };
}

export default function TemplatedSongPage({}: Record<string, never>) {
  const params = useParams<{ slug?: string | string[] }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugRaw = params?.slug;
  const slug =
    typeof slugRaw === "string"
      ? slugRaw
      : Array.isArray(slugRaw)
        ? slugRaw[0]
        : null;
  const [rawInstance, setRawInstance] = useState<any>(null);
  const [instance, setInstance] = useState<MappedSong | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const variantParam = searchParams.get("song-variant");

  const fetchInstance = useCallback(async (s: string) => {
    const res = await fetch(`/api/templated-songs/instances/${s}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    return data;
  }, []);

  const pollStatus = useCallback(async (s: string) => {
    const res = await fetch(`/api/templated-songs/instances/${s}/status`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get status");
    return data;
  }, []);

  const fetchFeedbackSummary = useCallback(async (s: string) => {
    setFeedbackLoading(true);
    try {
      const res = await fetch(
        `/api/templated-songs/instances/${s}/feedback/summary`,
        {
          cache: "no-store",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load feedback");
      setFeedbackSummary(data);
    } catch {
      setFeedbackSummary(null);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  /** Consider done only when backend marks completion. */
  const isStatusComplete = useCallback(
    (statusData: { status?: string | null; song_variants?: unknown }) => {
      const s = (statusData.status ?? "").toString().toLowerCase();
      return s === "completed" || s === "success";
    },
    [],
  );

  useEffect(() => {
    if (!slug) return;
    cancelledRef.current = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInstance(slug);
        if (cancelledRef.current) return;
        const inst = data as any;
        const mapped = mapInstanceToSong(inst);
        setRawInstance(inst);
        setInstance(mapped);
        void fetchFeedbackSummary(slug);

        const shouldPoll =
          inst.status === "processing" ||
          inst.status === "queued" ||
          (!mapped.audioUrl && (mapped.suno_variants?.length ?? 0) === 0);

        if (shouldPoll) {
          const poll = async () => {
            if (cancelledRef.current) return;
            try {
              const statusData = await pollStatus(slug);
              if (cancelledRef.current) return;
              if (isStatusComplete(statusData)) {
                const full = await fetchInstance(slug);
                if (!cancelledRef.current) {
                  setRawInstance(full);
                  setInstance(mapInstanceToSong(full));
                }
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                return;
              }
            } catch {
              // Continue polling on error
            }
          };
          poll();
          pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }
      } catch (e: unknown) {
        if (!cancelledRef.current)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelledRef.current = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [slug, fetchInstance, pollStatus, isStatusComplete, fetchFeedbackSummary]);

  const displaySong = useMemo(() => {
    if (!rawInstance) return null;
    return mapInstanceToSong(rawInstance, selectedVariantIndex);
  }, [rawInstance, selectedVariantIndex]);

  const variantCount = instance?.suno_variants?.length ?? 0;
  const variantIndex = Math.max(
    0,
    Math.min(selectedVariantIndex, Math.max(variantCount - 1, 0)),
  );
  const initialVariantFromQuery = Number.parseInt(variantParam ?? "", 10);
  const safeInitialVariant = Number.isNaN(initialVariantFromQuery)
    ? 0
    : Math.max(0, initialVariantFromQuery);
  const currentVariantParamValue = searchParams.get("song-variant");

  useEffect(() => {
    setSelectedVariantIndex(safeInitialVariant);
  }, [safeInitialVariant]);

  useEffect(() => {
    if (!slug || !variantCount) return;
    if (variantIndex !== selectedVariantIndex) {
      setSelectedVariantIndex(variantIndex);
    }
    if (String(variantIndex) !== currentVariantParamValue) {
      router.replace(
        `/song-template/song/${slug}?song-variant=${variantIndex}`,
        {
          scroll: false,
        },
      );
    }
  }, [
    slug,
    variantCount,
    variantIndex,
    selectedVariantIndex,
    currentVariantParamValue,
    router,
  ]);

  const handleSelectVariant = useCallback(
    async (newIndex: number) => {
      if (!slug) return;
      const safeNewIndex = Math.max(
        0,
        Math.min(newIndex, Math.max(variantCount - 1, 0)),
      );
      if (safeNewIndex === selectedVariantIndex) return;

      setSelectedVariantIndex(safeNewIndex);
      router.replace(
        `/song-template/song/${slug}?song-variant=${safeNewIndex}`,
        {
          scroll: false,
        },
      );

      try {
        await fetch(`/api/templated-songs/instances/${slug}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant_index: safeNewIndex,
            event_type: "variant_listened",
          }),
        });
      } catch {
        // Keep switching non-blocking.
      }
    },
    [slug, variantCount, selectedVariantIndex, router],
  );

  const submitVariantFeedback = useCallback(
    async (
      decision: "liked" | "disliked",
      rating?: number,
      extras?: {
        reasons?: string[];
        other_text?: string;
        positive_aspects?: string[];
        positive_other_text?: string;
      },
    ) => {
      if (!slug) return;
      setFeedbackSubmitting(true);
      try {
        const payload: Record<string, unknown> = {
          variant_index: variantIndex,
          event_type: "variant_decision",
          decision,
        };
        if (typeof rating === "number") {
          payload.rating = rating;
          payload.event_type = "variant_rated";
        }
        if (extras?.reasons?.length) {
          payload.reasons = extras.reasons;
        }
        if (extras?.other_text?.trim()) {
          payload.other_text = extras.other_text.trim();
        }
        if (extras?.positive_aspects?.length) {
          payload.positive_aspects = extras.positive_aspects;
        }
        if (extras?.positive_other_text?.trim()) {
          payload.positive_other_text = extras.positive_other_text.trim();
        }
        const res = await fetch(
          `/api/templated-songs/instances/${slug}/feedback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save feedback");
        }
        await fetchFeedbackSummary(slug);
      } catch {
        // Non-blocking: keep playback uninterrupted
      } finally {
        setFeedbackSubmitting(false);
      }
    },
    [slug, variantIndex, fetchFeedbackSummary],
  );

  if (loading && !instance) {
    return (
      <div className="flex flex-col min-h-screen pb-24 md:pb-0 bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <Header showCreateSongCTA={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-yellow" />
          <p className="font-body text-text/80">Loading your song…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !instance) {
    return (
      <div className="flex flex-col min-h-screen pb-24 md:pb-0 bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
        <Header showCreateSongCTA={false} />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="font-body text-text">{error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!instance) {
    return null;
  }

  if (instance.audioUrl || (instance.suno_variants?.length ?? 0) > 0) {
    return (
      <TemplatedSongDisplay
        song={displaySong}
        selectedVariantIndex={variantIndex}
        totalVariants={variantCount}
        onVariantChange={handleSelectVariant}
        feedbackSummary={feedbackSummary}
        submitVariantFeedback={submitVariantFeedback}
        feedbackSubmitting={feedbackSubmitting}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0 bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
      <Header showCreateSongCTA={false} />
      <div className="flex-1 flex flex-col">
        <SongCreationLoadingScreen
          stage="song"
          title="Generating your song..."
          message="We're crafting a beautiful song for you"
        />
        <div className="text-center pb-6">
          <Link
            href="/song-template"
            className="font-body text-sm text-primary-yellow hover:underline font-medium"
          >
            Back to Templates
          </Link>
          <span className="font-body text-text/60 text-sm">
            {" "}
            · You can also find this song under &quot;My generated songs&quot;
            on the Templates page.
          </span>
        </div>
      </div>
      <Footer />
    </div>
  );
}
