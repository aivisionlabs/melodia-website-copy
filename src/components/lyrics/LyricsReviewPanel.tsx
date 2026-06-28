"use client";

/**
 * LyricsReviewPanel
 *
 * A self-contained, reusable lyrics review component used in the
 * vendor co-branded order flow. UI matches the generate-lyrics page:
 * editable textarea, AI edit bar, music style collapsible, fixed bottom CTA.
 *
 * Decoupled from payment logic — approve/revise actions handled via callbacks.
 */

import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Music,
} from "lucide-react";
import {
  CreatePageSteps,
  type StepItem,
} from "@/app/(app)/create/_components/create-page-steps";

/** One selectable lyrics revision for the version switcher. */
export interface LyricsReviewVersion {
  id: number;
  version: number;
}

interface LyricsReviewPanelProps {
  lyricsDraftId: number;
  customerLyrics: string;
  songTitle?: string;
  musicStyle?: string | null;
  /** AI edits remaining for this order */
  editsRemaining: number;
  isApproving?: boolean;
  isRevising?: boolean;
  approveLabel?: string;
  /**
   * Optional revision list. When more than one version is present, a switcher
   * is rendered between the music-style section and the lyrics card. The parent
   * owns selection — pass the selected version's lyrics via `customerLyrics`/
   * `lyricsDraftId` and update them when `onSelectVersion` fires.
   */
  versions?: LyricsReviewVersion[];
  selectedVersionId?: number | null;
  onSelectVersion?: (id: number) => void;
  /**
   * When true, wraps the panel in a full-height shell with a steps header
   * (matches the /generate-lyrics page). When false (default), the panel
   * renders as a flex child and the caller provides its own page chrome.
   */
  fullPage?: boolean;
  /** Steps shown in the full-page header (only used when `fullPage`). */
  steps?: StepItem[];
  /** Optional back handler — renders a back chevron in the full-page header. */
  onBack?: () => void;
  /** editedLyrics is null when lyrics were not manually modified */
  onApprove: (lyricsDraftId: number, editedLyrics: string | null) => Promise<void>;
  onRequestRevision: (refineText: string) => Promise<void>;
}

export function LyricsReviewPanel({
  lyricsDraftId,
  customerLyrics,
  musicStyle,
  editsRemaining,
  isApproving = false,
  isRevising = false,
  approveLabel = "Approve & Generate Song",
  versions,
  selectedVersionId,
  onSelectVersion,
  fullPage = false,
  steps,
  onBack,
  onApprove,
  onRequestRevision,
}: LyricsReviewPanelProps) {
  const [editedLyrics, setEditedLyrics] = useState(customerLyrics);
  const [lyricsModified, setLyricsModified] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [musicStyleSectionOpen, setMusicStyleSectionOpen] = useState(false);

  // Sync when draft changes (e.g. after AI revision completes)
  useEffect(() => {
    setEditedLyrics(customerLyrics);
    setLyricsModified(false);
  }, [customerLyrics, lyricsDraftId]);

  const isBusy = isApproving || isRevising;

  // Oldest → newest so the switcher reads "Original, Revision 1, …" left-to-right
  // regardless of the order the caller supplies.
  const sortedVersions = versions
    ? [...versions].sort((a, b) => a.version - b.version)
    : [];

  const handleApprove = async () => {
    if (isBusy) return;
    await onApprove(lyricsDraftId, lyricsModified ? editedLyrics : null);
  };

  const handleAISubmit = async () => {
    if (!aiPrompt.trim() || editsRemaining <= 0 || isBusy) return;
    const prompt = aiPrompt.trim();
    setAiPrompt("");
    await onRequestRevision(prompt);
  };

  const content = (
    <div
      className="flex-1 min-h-0 flex flex-col px-4 pt-3"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        gap: "10px",
      }}
    >
      {/* Music style — collapsed by default */}
      {musicStyle && (
        <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setMusicStyleSectionOpen((o) => !o)}
            aria-expanded={musicStyleSectionOpen}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:bg-gray-50/80 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary-yellow/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-3 h-3 text-text-teal" aria-hidden />
              </div>
              <span className="text-[10px] font-bold text-text-teal/40 uppercase tracking-widest">
                Music style
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-text-teal/45 flex-shrink-0 transition-transform duration-200 ${
                musicStyleSectionOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          {musicStyleSectionOpen && (
            <div className="border-t border-gray-100 px-4 pb-3 pt-2">
              <p className="text-sm text-text-teal/70 leading-relaxed">
                {musicStyle}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Revision tabs — show when there is more than one version */}
      {sortedVersions.length > 1 && (
        <div className="flex-shrink-0 border-b border-gray-100 overflow-x-auto no-scrollbar -mx-1 px-1">
          <nav className="flex gap-1 min-w-max py-1" aria-label="Revision tabs">
            {sortedVersions.map((v) => {
              const isActive = selectedVersionId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVersion?.(v.id)}
                  disabled={isBusy}
                  className={`relative whitespace-nowrap py-2.5 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-accent-coral/15 text-accent-coral"
                      : "text-text-teal/60 hover:text-text-teal hover:bg-gray-100"
                  }`}
                >
                  {v.version === 1 ? "Original" : `Revision ${v.version - 1}`}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Lyrics card — fills remaining space, scrolls internally */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
        <div className="flex-shrink-0 mx-5 mt-4 border-t border-gray-50" />
        <textarea
          value={editedLyrics}
          onChange={(e) => {
            setEditedLyrics(e.target.value);
            setLyricsModified(true);
          }}
          className="flex-1 min-h-0 w-full px-6 pt-4 pb-12 text-[13.5px] text-text-teal leading-[1.9] bg-transparent border-none outline-none resize-none font-body overflow-y-auto"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          disabled={isBusy}
        />
        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent rounded-b-3xl" />
      </div>

      {/* AI edit bar */}
      <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="w-5 h-5 rounded-full bg-accent-coral/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-2.5 h-2.5 text-accent-coral"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-text-teal/40 uppercase tracking-widest">
            AI Edit{" "}
            {editsRemaining > 0
              ? `· ${editsRemaining} left`
              : "· No edits left"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 px-4 pb-3">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={
              editsRemaining > 0
                ? "e.g. make it shorter, add a birthday reference..."
                : "No AI edits remaining"
            }
            disabled={editsRemaining <= 0 || isBusy}
            className="flex-1 text-sm bg-transparent outline-none text-text-teal placeholder:text-text-teal/40 font-body min-w-0 disabled:opacity-50 disabled:cursor-not-allowed py-1"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                aiPrompt.trim() &&
                editsRemaining > 0 &&
                !isBusy
              ) {
                handleAISubmit();
              }
            }}
          />
          <button
            onClick={handleAISubmit}
            disabled={!aiPrompt.trim() || editsRemaining <= 0 || isBusy}
            className="w-8 h-8 rounded-full bg-accent-coral flex items-center justify-center flex-shrink-0 disabled:opacity-25 active:scale-90 transition-transform"
            style={{
              boxShadow: aiPrompt.trim()
                ? "0 4px 12px rgba(239,71,111,0.35)"
                : "none",
            }}
          >
            {isRevising ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[48] bg-secondary-cream/95 backdrop-blur-sm border-t border-gray-100 px-5 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        <button
          onClick={handleApprove}
          disabled={isApproving || !editedLyrics.trim() || !!aiPrompt.trim()}
          className="w-full h-14 bg-accent-coral rounded-full font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.40)" }}
        >
          {isApproving ? (
            <>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-white">Processing...</span>
            </>
          ) : (
            <>
              <span className="text-white">{approveLabel}</span>
              <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (!fullPage) {
    return content;
  }

  return (
    <div className="h-svh bg-secondary-cream text-text-teal flex flex-col font-body overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-secondary-cream border-b border-gray-100 z-30">
        <div className="flex items-center px-4 py-3 gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-text-teal/55 hover:text-text-teal transition-colors active:scale-95 flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}

          <div className="flex-1 flex items-center justify-center min-w-0">
            <CreatePageSteps variant="nav" steps={steps} />
          </div>

          <div className="w-14 flex-shrink-0" />
        </div>
      </div>

      {content}
    </div>
  );
}
