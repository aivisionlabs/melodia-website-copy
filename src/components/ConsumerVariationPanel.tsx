"use client";

import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SongOptionsDisplay from "@/components/SongOptionsDisplay";
import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import { MOOD_CHIPS } from "@/app/(app)/create/_components/create-page-constants";
import { isTransliterableLanguage } from "@/lib/transliteration-languages";
import { RecipientDialectConfirm } from "@/app/(app)/create-song/_components/recipient-dialect-confirm";
import { useSongStatusPolling } from "@/hooks/use-song-status-polling";
import type { SongStatusResponse } from "@/lib/types";
import Header from "@/components/Header";

interface ConsumerVariationPanelProps {
  songId: number;
  variationsRemaining: number;
  occasion: string | null;
  languages: string | null;
  recipientName: string | null;
  rejectionReasons?: string[];
  onBack?: () => void;
}

type PanelState = "form" | "generating" | "ready";

export function ConsumerVariationPanel({
  songId,
  variationsRemaining,
  occasion,
  languages,
  recipientName,
  rejectionReasons = [],
  onBack,
}: ConsumerVariationPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [musicStyleNotes, setMusicStyleNotes] = useState("");
  const [nameInput, setNameInput] = useState(recipientName ?? "");
  const [confirmedNameInScript, setConfirmedNameInScript] = useState("");
  const [confirmedNameLanguage, setConfirmedNameLanguage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [variationSongId, setVariationSongId] = useState<number | null>(null);

  const chips = MOOD_CHIPS;
  const canTransliterate = isTransliterableLanguage(languages ?? "");

  const showPronunciationFix = rejectionReasons.includes("INCORRECT_PRONUNCIATION");
  const showMusicFix = rejectionReasons.includes("MUSIC_NOT_EXPECTED") || rejectionReasons.length === 0;
  const showVoiceFix = rejectionReasons.includes("VOICE_NOT_CLEAR");
  const showLyricsFix = rejectionReasons.includes("LYRICS_NOT_MATCH");

  const REASON_LABELS: Record<string, string> = {
    INCORRECT_PRONUNCIATION: "Incorrect Pronunciation",
    VOICE_NOT_CLEAR: "Voice Not Clear",
    MUSIC_NOT_EXPECTED: "Music Not as Expected",
    LYRICS_NOT_MATCH: "Lyrics Mismatch",
  };

  // Poll the variation song status once we have a variationSongId
  const { songStatus: variationSongStatus } = useSongStatusPolling(
    variationSongId,
    {
      intervalMs: 8000,
      maxPollingTime: 10 * 60 * 1000,
      autoStart: !!variationSongId,
      stopOnComplete: true,
      enableExponentialBackoff: true,
      maxRetries: 3,
    },
  );

  const isVariationReady =
    variationSongStatus?.variants?.[0]?.variantStatus === "STREAM_READY" ||
    variationSongStatus?.variants?.[0]?.variantStatus === "DOWNLOAD_READY";

  // Transition to ready state once the variation song is stream-ready
  if (panelState === "generating" && isVariationReady) {
    setPanelState("ready");
  }

  const toggleChip = (label: string) => {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const oldName = (recipientName ?? "").trim();
      const newName = nameInput.trim();
      const nameChanged = newName.length > 0 && newName.toLowerCase() !== oldName.toLowerCase();

      const res = await fetch(`/api/songs/${songId}/create-variation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicStyleChips: selectedChips.length > 0 ? selectedChips : undefined,
          musicStyleNotes: musicStyleNotes.trim() || undefined,
          recipientNameInScript: confirmedNameInScript.trim() || undefined,
          recipientNameScriptLang: confirmedNameLanguage.trim() || undefined,
          ...(nameChanged && { oldRecipientName: oldName, newRecipientName: newName }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create variation. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setPanelState("generating");
      pollForVariationSong();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const pollForVariationSong = () => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/${songId}/variation-status`);
        if (!res.ok) {
          setTimeout(poll, 5_000);
          return;
        }
        const data = await res.json();
        if (data.variationSongId) {
          setVariationSongId(data.variationSongId);
          return; // useSongStatusPolling takes over from here
        }
      } catch {
        // keep polling
      }
      setTimeout(poll, 5_000);
    };
    setTimeout(poll, 5_000);
  };

  if (panelState === "ready" && variationSongStatus) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary-cream text-text-teal">
        <Header showCreateSongCTA={false} />
        <p className="px-4 pt-2 text-xs font-semibold uppercase tracking-widest text-accent-coral text-center">
          Your new version is ready ✨
        </p>
        <div className="flex-1 flex flex-col">
          <SongOptionsDisplay
            songStatus={variationSongStatus}
            fullHeight={false}
            renderHeader={() => null}
            disableNavigation
            allowRejection={false}
          />
        </div>
      </div>
    );
  }

  if (panelState === "generating") {
    return (
      <div className="flex flex-col h-screen bg-secondary-cream text-text-teal">
        <Header showCreateSongCTA={false} />
        <SongCreationLoadingScreen
          stage="song"
          duration={150}
          title="Creating your variation…"
          message="The AI is composing a new version. This usually takes 2–4 minutes."
          showTimer
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary-cream text-text-teal">
      <header className="flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={24} className="text-text-teal" />
        </button>
        <div className="w-8" />
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-heading font-bold text-text-teal">
              Customise &amp; Regenerate
            </h2>
            <p className="text-sm text-text-teal/60">
              {variationsRemaining} variation{variationsRemaining !== 1 ? "s" : ""} remaining
            </p>
          </div>

          {/* Variation form */}
          {panelState === "form" && (
            <div className="rounded-2xl border border-text-teal/10 bg-white p-5 space-y-4 text-left">

              {/* Subtle rejection reason tags */}
              {rejectionReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rejectionReasons.map((code) => (
                    <span
                      key={code}
                      className="rounded-full bg-text-teal/8 px-2.5 py-0.5 text-xs text-text-teal/50"
                    >
                      {REASON_LABELS[code] ?? code}
                    </span>
                  ))}
                </div>
              )}

              {/* INCORRECT_PRONUNCIATION — fix recipient name */}
              {showPronunciationFix && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-teal/50">
                    Correct the name
                  </p>
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
                  {canTransliterate && nameInput.trim().length >= 2 && (
                    <div className="rounded-xl border border-text-teal/10 bg-secondary-cream/60 p-3">
                      <RecipientDialectConfirm
                        name={nameInput}
                        defaultLanguage={languages ?? ""}
                        confirmedValue={confirmedNameInScript}
                        confirmedLanguage={confirmedNameLanguage}
                        onConfirm={(value, lang) => {
                          setConfirmedNameInScript(value);
                          setConfirmedNameLanguage(lang);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MUSIC_NOT_EXPECTED or no reason — pick a different vibe */}
              {showMusicFix && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-teal/50 mb-2">
                    Pick a vibe
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Keep same vibe — selected when nothing else is picked */}
                    <button
                      type="button"
                      onClick={() => setSelectedChips([])}
                      className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
                        selectedChips.length === 0
                          ? "border-accent-coral bg-accent-coral text-white"
                          : "border-text-teal/20 bg-transparent text-text-teal"
                      }`}
                    >
                      🎵 Keep same vibe
                    </button>
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

              {showMusicFix && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-teal/50 mb-1.5">
                    Any style notes?
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
              )}

              {/* VOICE_NOT_CLEAR — no input needed */}
              {showVoiceFix && (
                <div className="rounded-xl bg-secondary-cream/60 px-4 py-3">
                  <p className="text-sm text-text-teal/70">
                    We&apos;ll regenerate this song with a clearer voice.
                  </p>
                </div>
              )}

              {/* LYRICS_NOT_MATCH — no fix input in this flow */}
              {showLyricsFix && (
                <div className="rounded-xl bg-secondary-cream/60 px-4 py-3">
                  <p className="text-sm text-text-teal/70">
                    Our team has been notified about the lyrics mismatch and will work on improving it.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-full"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-full bg-accent-coral font-semibold text-white hover:bg-accent-coral/90"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Generate Variation"
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
