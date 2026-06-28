"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SongOptionsDisplay from "@/components/SongOptionsDisplay";
import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import { OCCASION_MUSIC_CHIPS } from "@/app/(app)/create/_components/create-page-constants";
import { isTransliterableLanguage } from "@/lib/transliteration-languages";
import { RecipientDialectConfirm } from "@/app/(app)/create-song/_components/recipient-dialect-confirm";
import type { SongStatusResponse } from "@/lib/types";

interface VariationPanelProps {
  orderToken: string;
  variationsRemaining: number;
  occasion: string | null;
  languages: string;
  recipientName: string;
  onVariationComplete: () => void;
}

type PanelState = "idle" | "form" | "submitting" | "generating" | "ready";

export function VariationPanel({
  orderToken,
  variationsRemaining,
  occasion,
  languages,
  recipientName,
  onVariationComplete,
}: VariationPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [musicStyleNotes, setMusicStyleNotes] = useState("");
  const [showNameFix, setShowNameFix] = useState(false);
  const [nameInput, setNameInput] = useState(recipientName);
  const [confirmedNameInScript, setConfirmedNameInScript] = useState("");
  const [confirmedNameLanguage, setConfirmedNameLanguage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [variationSongStatus, setVariationSongStatus] =
    useState<SongStatusResponse | null>(null);

  const chips =
    OCCASION_MUSIC_CHIPS[occasion ?? ""] ??
    OCCASION_MUSIC_CHIPS["Adult Birthday"] ??
    [];
  const canFixName = isTransliterableLanguage(languages);

  const toggleChip = (label: string) => {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );
  };

  const handleSubmit = async () => {
    setPanelState("submitting");
    setError(null);

    try {
      const res = await fetch(
        `/api/vendor-order/${orderToken}/create-variation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            musicStyleChips:
              selectedChips.length > 0 ? selectedChips : undefined,
            musicStyleNotes: musicStyleNotes.trim() || undefined,
            recipientNameInScript:
              confirmedNameInScript.trim() || undefined,
            recipientNameScriptLang:
              confirmedNameLanguage.trim() || undefined,
            ...(nameInput.trim().toLowerCase() !== recipientName.toLowerCase() && {
              oldRecipientName: recipientName,
              newRecipientName: nameInput.trim(),
            }),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create variation. Please try again.");
        setPanelState("form");
        return;
      }

      // Start polling for the variation song status via the parent order's variations list
      setPanelState("generating");
      pollForVariation(data.variationRequestId);
    } catch {
      setError("Something went wrong. Please try again.");
      setPanelState("form");
    }
  };

  const pollForVariation = (variationRequestId: number) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/vendor-order/${orderToken}`);
        if (!res.ok) return;
        const data = await res.json();

        const variationSongs: Array<{
          slug: string;
          status: string | null;
          song_variants: unknown;
        }> = data.variations ?? [];

        // Find a completed variation
        const ready = variationSongs.find((v) => v.status === "completed");
        if (ready) {
          const rawVariants = Array.isArray(ready.song_variants)
            ? (ready.song_variants as any[])
            : Object.values((ready.song_variants as Record<string, any>) ?? {});
          if (rawVariants.length > 0) {
            const songStatus: SongStatusResponse = {
              success: true,
              status: "completed",
              slug: ready.slug,
              variants: rawVariants.map((v: any) => ({
                id: v.id ?? "",
                audioUrl: v.audioUrl ?? v.audio_url ?? "",
                streamAudioUrl: v.streamAudioUrl ?? v.stream_audio_url ?? v.audioUrl ?? "",
                sourceStreamAudioUrl: v.sourceStreamAudioUrl ?? v.source_stream_audio_url,
                sourceAudioUrl: v.sourceAudioUrl ?? v.source_audio_url,
                imageUrl: v.imageUrl ?? v.image_url ?? "",
                sourceImageUrl: v.sourceImageUrl ?? v.source_image_url ?? v.imageUrl ?? "",
                title: v.title ?? "",
                tags: v.tags,
                modelName: v.modelName ?? "V5",
                duration: v.duration,
                variantStatus: v.variantStatus ?? "DOWNLOAD_READY",
              })),
            } as unknown as SongStatusResponse;
            setVariationSongStatus(songStatus);
            setPanelState("ready");
            onVariationComplete();
            return;
          }
        }
      } catch {
        // keep polling
      }
      setTimeout(poll, 5_000);
    };
    setTimeout(poll, 5_000);
  };

  if (variationsRemaining <= 0) return null;

  return (
    <div className="mt-4 mx-4 rounded-2xl border border-text-teal/10 bg-surface-container-high overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() =>
          setPanelState((s) => (s === "idle" ? "form" : s === "form" ? "idle" : s))
        }
        disabled={panelState === "submitting" || panelState === "generating"}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-accent-coral" />
          <span className="text-sm font-semibold text-text-teal">
            Not happy? Try a variation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-teal/50">
            {variationsRemaining} remaining
          </span>
          {panelState === "form" ? (
            <ChevronUp className="h-4 w-4 text-text-teal/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-teal/40" />
          )}
        </div>
      </button>

      {/* Form */}
      {panelState === "form" && (
        <div className="px-4 pb-4 space-y-4 border-t border-text-teal/10">
          {/* Music style chips */}
          {chips.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-teal/50 mb-2">
                Pick a vibe
              </p>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => toggleChip(chip.label)}
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
                      selectedChips.includes(chip.label)
                        ? "border-accent-coral bg-accent-coral text-white"
                        : "border-text-teal/20 bg-transparent text-text-teal"
                    }`}
                  >
                    {chip.emoji} {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Free-text notes */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-teal/50 mb-1.5">
              Any other style notes?
            </p>
            <textarea
              value={musicStyleNotes}
              onChange={(e) => setMusicStyleNotes(e.target.value)}
              placeholder="e.g. slower tempo, more acoustic, add flute…"
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border border-text-teal/20 bg-transparent p-2.5 text-sm text-text-teal placeholder:text-text-teal/30 focus:border-text-teal/50 focus:outline-none resize-none"
            />
          </div>

          {/* Name fix toggle */}
          {canFixName && (
            <div>
              <button
                type="button"
                onClick={() => setShowNameFix((v) => !v)}
                className="text-xs font-semibold text-text-teal/60 underline underline-offset-2"
              >
                {showNameFix ? "Hide" : "Fix how the name sounds in the song"}
              </button>
              {showNameFix && (
                <div className="mt-3 space-y-3">
                  <input
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setConfirmedNameInScript("");
                      setConfirmedNameLanguage("");
                    }}
                    placeholder="e.g. Priya"
                    maxLength={60}
                    className="w-full rounded-xl border border-text-teal/20 bg-transparent p-2.5 text-sm text-text-teal placeholder:text-text-teal/30 focus:border-text-teal/50 focus:outline-none"
                  />
                  {nameInput.trim().length >= 2 && (
                    <RecipientDialectConfirm
                      name={nameInput}
                      defaultLanguage={languages}
                      confirmedValue={confirmedNameInScript}
                      confirmedLanguage={confirmedNameLanguage}
                      onConfirm={(value, lang) => {
                        setConfirmedNameInScript(value);
                        setConfirmedNameLanguage(lang);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full h-11 rounded-full bg-accent-coral font-semibold text-white hover:bg-accent-coral/90"
          >
            Generate Variation
          </Button>
        </div>
      )}

      {/* Generating state */}
      {panelState === "generating" && (
        <div className="px-4 pb-4 border-t border-text-teal/10">
          <SongCreationLoadingScreen
            stage="song"
            duration={120}
            title="Creating your variation"
            message="The AI is composing a new version. This usually takes 2–4 minutes."
          />
        </div>
      )}

      {/* Ready state */}
      {panelState === "ready" && variationSongStatus && (
        <div className="border-t border-text-teal/10">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-widest text-accent-coral">
            Your variation is ready
          </p>
          <SongOptionsDisplay
            songStatus={variationSongStatus}
            fullHeight={false}
            renderHeader={() => null}
            disableNavigation
            allowRejection={false}
          />
        </div>
      )}
    </div>
  );
}
