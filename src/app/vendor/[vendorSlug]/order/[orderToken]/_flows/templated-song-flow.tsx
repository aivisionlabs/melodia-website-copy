"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2, Music } from "lucide-react";
import { CreatePageOccasionSection } from "@/app/(app)/create/_components/create-page-occasion-section";
import { CreatePageOccasionSheet } from "@/app/(app)/create/_components/create-page-occasion-sheet";
import { ALL_OCCASIONS } from "@/app/(app)/create/_components/create-page-constants";
import {
  CreatePageNameDropTemplateSection,
  type NameDropTemplate,
} from "@/app/(app)/create/_components/namedrop/create-page-namedrop-template-section";
import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import { TemplatedSongVendorDisplay } from "@/components/TemplatedSongVendorDisplay";
import { getCategorySlugForOccasionLabel } from "@/lib/occasion-category-mapping";
import {
  getVariantsList,
  normalizeVariantForPlayer,
  type NormalizedPlayerVariant,
} from "@/lib/utils/variant-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlowProps } from "../_shared/types";
import { TemplatedSongFlowSkeleton } from "../_shared/flow-loading-skeletons";
import { templatedSongDisplayTitle } from "@/lib/templated-songs-utils";

const TEMPLATED_SONG_POLLING_STATUSES = new Set([
  "song_generation_inprogress",
  "processing",
]);

const POLL_INTERVAL_MS = 5_000;

/** Player can render when Suno-style status is set or when URLs exist (real API often omits variantStatus). */
function isNormalizedVariantPlayable(v: NormalizedPlayerVariant): boolean {
  const vs = (v.variantStatus || "").toUpperCase();
  if (vs === "STREAM_READY" || vs === "DOWNLOAD_READY") return true;
  return !!(
    v.streamAudioUrl ||
    v.sourceStreamAudioUrl ||
    v.audioUrl ||
    v.sourceAudioUrl
  );
}

interface SongVariant {
  sourceAudioUrl?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  sourceImageUrl?: string;
  imageUrl?: string;
}

interface TemplatedSong {
  id: number;
  title: string;
  template_title?: string | null;
  template_lyrics?: string | null;
  slug: string;
  song_variants: unknown;
  display_order: number | null;
  language?: string | null;
  description?: string | null;
  categories?: Array<{ id: number; name: string; slug: string }>;
}

function getBestAudioUrl(template: TemplatedSong): string | null {
  const variants = getVariantsList(template.song_variants) as SongVariant[];
  const v = variants[0];
  if (!v) return null;
  return v.sourceAudioUrl ?? v.audioUrl ?? null;
}

function getBestImageUrl(template: TemplatedSong): string | null {
  const variants = getVariantsList(template.song_variants) as SongVariant[];
  const v = variants[0];
  if (!v) return null;
  return v.sourceImageUrl ?? v.imageUrl ?? null;
}

function toNameDropTemplates(templates: TemplatedSong[]): NameDropTemplate[] {
  return templates.map((t) => ({
    id: t.id,
    title: templatedSongDisplayTitle(t),
    slug: t.slug,
    language: t.language,
    description: t.description,
    imageUrl: getBestImageUrl(t),
    previewAudioUrl: getBestAudioUrl(t),
    templateLyrics: t.template_lyrics,
  }));
}

export function TemplatedSongFlow({
  state,
  fetchState,
  orderToken,
}: FlowProps) {
  const { order, templated_instance } = state;

  const [occasion, setOccasion] = useState<string>(
    order.occasion || "Adult Birthday",
  );
  const [customOccasion, setCustomOccasion] = useState("");
  const [showOccasionSheet, setShowOccasionSheet] = useState(false);
  const [validOccasions, setValidOccasions] = useState<string[]>(ALL_OCCASIONS);

  const [templates, setTemplates] = useState<TemplatedSong[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    () => order.template_id ?? null,
  );
  const [recipientName, setRecipientName] = useState(order.customer_name ?? "");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const effectiveOccasion =
    occasion === "Other" ? customOccasion.trim() : occasion;
  const categorySlug =
    getCategorySlugForOccasionLabel(effectiveOccasion) ?? null;

  // Filter valid occasions based on available templates
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/templated-songs?namedrop=true", { cache: "no-store" });
        const data = await res.json();
        if (
          res.ok &&
          Array.isArray(data.templatedSongs) &&
          data.templatedSongs.length > 0
        ) {
          const slugSet = new Set<string>(
            data.templatedSongs.flatMap(
              (t: { categories?: Array<{ slug: string }> }) =>
                (t.categories ?? []).map((c) => c.slug),
            ),
          );
          const filtered = ALL_OCCASIONS.filter((occ) => {
            const slug = getCategorySlugForOccasionLabel(occ);
            return slug !== null && slugSet.has(slug);
          });
          if (filtered.length > 0) setValidOccasions(filtered);
        }
      } catch {
        // Non-blocking — fall back to full list
      }
    };
    load();
  }, []);

  // Fetch templates filtered by category
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTemplatesLoading(true);
      try {
        const url = categorySlug
          ? `/api/templated-songs?namedrop=true&categorySlug=${encodeURIComponent(categorySlug)}`
          : "/api/templated-songs?namedrop=true";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          const list: TemplatedSong[] =
            res.ok && Array.isArray(data.templatedSongs)
              ? data.templatedSongs
              : [];
          setTemplates(list);
          if (
            order.template_id != null &&
            list.some((t) => t.id === order.template_id)
          ) {
            setSelectedTemplateId(order.template_id);
          } else {
            setSelectedTemplateId(null);
          }
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setSelectedTemplateId(null);
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, order.template_id]);

  useEffect(() => {
    if (!TEMPLATED_SONG_POLLING_STATUSES.has(order.status)) return;
    void fetchState();
    const intervalId = window.setInterval(() => {
      void fetchState();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [order.status, fetchState]);

  const handleGenerate = async () => {
    if (!selectedTemplateId || !recipientName.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(
        `/api/vendor-order/${orderToken}/generate-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            recipientName: recipientName.trim(),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to start generation.",
        );
      }
      await fetchState();
    } catch (e: unknown) {
      setGenerateError(
        e instanceof Error ? e.message : "Failed to start generation.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Partner only auto-starts when BOTH `template_id` and `customer_name` are in the
  // create request; that path is not `pending` (customer sees generating or player).
  // Any `pending` order is therefore one where the partner did not pre-supply both
  // fields, or the order predates that behavior — the customer must use this
  // template + recipient screen (the row may still have one of the two for prefill).
  if (order.status === "pending") {
    if (templatesLoading) {
      return <TemplatedSongFlowSkeleton />;
    }

    return (
      <>
        <CreatePageOccasionSection
          occasion={occasion}
          customOccasion={customOccasion}
          onOpenSheet={() => setShowOccasionSheet(true)}
        />

        {generateError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{generateError}</p>
          </div>
        )}

        <CreatePageNameDropTemplateSection
          loading={templatesLoading}
          templates={toNameDropTemplates(templates)}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
          renderSelectedAction={() => (
            <div className="mt-3 rounded-xl border border-text-teal/10 bg-white p-4">
              <label
                htmlFor="recipient-name"
                className="block text-sm font-medium text-text-teal mb-1"
              >
                Recipient name
              </label>
              <p className="text-xs text-text-teal/60 mb-2">
                Enter the name of the person you want to dedicate this song to.
                The name will be woven into the lyrics.
              </p>
              <div className="flex gap-3 items-end">
                <Input
                  id="recipient-name"
                  placeholder="e.g. Priya"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="flex-1 font-body"
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !recipientName.trim()}
                  className="bg-primary-yellow text-text-teal hover:bg-primary-yellow/90 shrink-0"
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
          )}
        />

        <CreatePageOccasionSheet
          isOpen={showOccasionSheet}
          onClose={() => setShowOccasionSheet(false)}
          occasion={occasion}
          customOccasion={customOccasion}
          onOccasionSelect={(occ) => {
            setOccasion(occ);
            if (occ !== "Other") setShowOccasionSheet(false);
          }}
          onCustomOccasionChange={setCustomOccasion}
          onConfirmOther={() => setShowOccasionSheet(false)}
          occasions={validOccasions}
        />
      </>
    );
  }

  // Check if any variant is already stream-ready (playable) even while still processing
  const instanceVariants = templated_instance
    ? getVariantsList(templated_instance.song_variants)
        .map(normalizeVariantForPlayer)
        .filter((v): v is NormalizedPlayerVariant => !!v)
    : [];
  const isFirstVariantStreamReady =
    instanceVariants.length > 0 &&
    isNormalizedVariantPlayable(instanceVariants[0]);

  if (order.status === "song_generation_inprogress") {
    // Show player early if a variant is already stream-ready
    if (isFirstVariantStreamReady && templated_instance) {
      return (
        <>
          <TemplatedSongVendorDisplay
            instance={templated_instance}
            orderToken={orderToken}
          />
          <div className="text-center py-4 px-4">
            <p className="text-xs text-text-teal/50">
              Need help?{" "}
              <a
                href={`https://wa.me/+917483464565?text=${encodeURIComponent(
                  `Hi, I need some help with my order.\n\nOrderId: ${orderToken}\n}`,
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
      );
    }

    return (
      <SongCreationLoadingScreen
        stage="song"
        duration={120}
        title="Generating your song"
        message="The AI is composing and recording your personalized song. This usually takes 2–4 minutes."
      />
    );
  }

  if (order.status === "completed" && !templated_instance) {
    return (
      <SongCreationLoadingScreen
        showTimer={false}
        title="Loading your song"
        message="One moment while we get everything ready for you."
        stage="song"
      />
    );
  }

  if (order.status === "completed" && templated_instance) {
    return (
      <>
        <TemplatedSongVendorDisplay
          instance={templated_instance}
          orderToken={orderToken}
        />
        <div className="text-center py-4 px-4">
          <p className="text-xs text-text-teal/50">
            Need help?{" "}
            <a
              href={`https://wa.me/+917483464565?text=${encodeURIComponent(
                `Hi, I need some help with my order.\n\nOrderId: ${orderToken}\n}`,
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
    );
  }

  if (order.status === "failed") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-teal mb-2">
          Something went wrong
        </h2>
        <p className="text-text-teal/60 text-sm">
          We encountered an issue generating your song. Please contact support.
        </p>
        <p className="text-xs text-text-teal/50 mt-4">
          Need help?{" "}
          <a
            href={`https://wa.me/+917483464565?text=${encodeURIComponent(
              `Hi, I need some help with my order.\n\nOrderId: ${orderToken}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-text-teal/60 hover:text-text-teal/80 transition-colors"
          >
            Reach out to us on WhatsApp
          </a>
        </p>
      </div>
    );
  }

  return null;
}
