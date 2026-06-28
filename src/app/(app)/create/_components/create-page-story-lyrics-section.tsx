"use client";

import { RefreshCw } from "lucide-react";
import { MIN_CUSTOM_LYRICS_LENGTH } from "@/lib/constants/lyrics";
import {
  DEFAULT_STORY_PROMPT,
  MANUAL_LYRICS_LIMIT,
  OCCASION_STORY_PROMPTS,
  STORY_LIMIT,
} from "./create-page-constants";
import type { LyricsInputMode } from "./create-page-types";
import { InfoBubble } from "./info-bubble";

export function CreatePageStoryLyricsSection({
  lyricsInputMode,
  onLyricsInputModeChange,
  effectiveOccasion,
  story,
  onStoryChange,
  inputLyrics,
  onInputLyricsChange,
  placeholderText,
  storySuggestions,
  showInspiration,
  onShowInspiration,
  onRefreshStorySuggestions,
  onPickSuggestion,
  inputLyricsError,
  hideModeToggle = false,
  hideFieldLabel = false,
}: {
  lyricsInputMode: LyricsInputMode;
  onLyricsInputModeChange: (mode: LyricsInputMode) => void;
  effectiveOccasion: string;
  story: string;
  onStoryChange: (value: string) => void;
  inputLyrics: string;
  onInputLyricsChange: (value: string) => void;
  placeholderText: string;
  storySuggestions: string[];
  showInspiration: boolean;
  onShowInspiration: (show: boolean) => void;
  onRefreshStorySuggestions: () => void;
  onPickSuggestion: (text: string) => void;
  inputLyricsError?: string;
  hideModeToggle?: boolean;
  /** Hides the floating label and optional/required tag (info bubble stays visible) */
  hideFieldLabel?: boolean;
}) {
  const infoBubbleText =
    lyricsInputMode === "story"
      ? "Share memories, inside jokes, or what makes the recipient special. This makes the song truly unique!"
      : "Paste your lyrics in any language. We will structure and process them for song generation while preserving your original text for display.";

  return (
    <div className="relative mb-7">
      {!hideModeToggle ? (
        <div className="mb-3">
          <div className="flex bg-gray-100 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => onLyricsInputModeChange("story")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                lyricsInputMode === "story"
                  ? "bg-white text-text-teal shadow-sm"
                  : "text-text-teal/40 hover:text-text-teal/60"
              }`}
            >
              Share Story
            </button>
            <button
              type="button"
              onClick={() => onLyricsInputModeChange("lyrics")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                lyricsInputMode === "lyrics"
                  ? "bg-white text-text-teal shadow-sm"
                  : "text-text-teal/40 hover:text-text-teal/60"
              }`}
            >
              I Have Lyrics
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`relative rounded-2xl border-2 bg-white px-4 pb-3 transition-all ${
          hideFieldLabel ? "pt-4" : "pt-5"
        } ${
          (
            lyricsInputMode === "story"
              ? story.trim().length > 0
              : inputLyrics.trim().length > 0
          )
            ? "border-primary-yellow/50"
            : "border-text-teal/15 focus-within:border-primary-yellow"
        }`}
      >
        {!hideFieldLabel ? (
          <label className="absolute -top-[11px] left-4 flex items-center gap-1.5 bg-secondary-cream px-1.5">
            <span className="text-xs font-semibold text-text-teal/65">
              {lyricsInputMode === "story"
                ? (
                    OCCASION_STORY_PROMPTS[effectiveOccasion] ||
                    DEFAULT_STORY_PROMPT
                  ).label
                : "Paste your full lyrics"}
            </span>
            <span className="text-[10px] text-text-teal/35 font-medium bg-gray-100 px-1.5 rounded-full">
              {lyricsInputMode === "story" ? "Optional" : "Required"}
            </span>
            <InfoBubble text={infoBubbleText} />
          </label>
        ) : (
          <div className="absolute top-3 right-4">
            <InfoBubble text={infoBubbleText} />
          </div>
        )}

        <textarea
          value={lyricsInputMode === "story" ? story : inputLyrics}
          onChange={(e) => {
            const v = e.target.value;
            if (lyricsInputMode === "story") {
              if (v.length <= STORY_LIMIT) onStoryChange(v);
            } else {
              onInputLyricsChange(v);
            }
          }}
          placeholder={
            lyricsInputMode === "story"
              ? (placeholderText ?? "Share a memory...")
              : "Type or paste your complete lyrics here..."
          }
          rows={lyricsInputMode === "story" ? 4 : 8}
          className="w-full bg-transparent text-sm text-text-teal placeholder-text-teal/35 outline-none resize-none leading-relaxed"
        />
        <div className="flex justify-end">
          <span
            className={`text-[11px] font-medium ${
              lyricsInputMode === "story"
                ? story.length > STORY_LIMIT * 0.9
                  ? "text-orange-400"
                  : "text-text-teal/30"
                : inputLyrics.length > MANUAL_LYRICS_LIMIT
                  ? "text-red-500"
                  : inputLyrics.length > MANUAL_LYRICS_LIMIT * 0.9
                    ? "text-orange-400"
                    : "text-text-teal/30"
            }`}
          >
            {lyricsInputMode === "story"
              ? `${story.length}/${STORY_LIMIT}`
              : `${inputLyrics.length}/${MANUAL_LYRICS_LIMIT}`}
          </span>
        </div>
        {lyricsInputMode === "lyrics" &&
          inputLyrics.length > MANUAL_LYRICS_LIMIT && (
            <p className="text-[11px] text-red-500 font-medium mt-1">
              ⚠ Lyrics exceed the maximum length of {MANUAL_LYRICS_LIMIT}{" "}
              characters. Please shorten them to continue.
            </p>
          )}
        {lyricsInputMode === "lyrics" &&
          inputLyrics.length <= MANUAL_LYRICS_LIMIT && (
            <p className="text-[10px] text-text-teal/35 mt-1">
              Minimum {MIN_CUSTOM_LYRICS_LENGTH} characters required.
            </p>
          )}
      </div>

      {inputLyricsError && (
        <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
          ⚠ {inputLyricsError}
        </p>
      )}

      {lyricsInputMode === "story" && storySuggestions.length > 0 && !story && (
        <div className="mt-3">
          {!showInspiration ? (
            <button
              type="button"
              onClick={() => onShowInspiration(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors px-1 text-primary-yellow"
            >
              ✨ Need inspiration?
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-semibold text-text-teal/50">
                  ✨ Need inspiration?
                </p>
                <button
                  type="button"
                  onClick={() => onRefreshStorySuggestions()}
                  className="flex items-center gap-1 text-[11px] text-text-teal/40 hover:text-accent-coral transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
              <div className="space-y-2">
                {storySuggestions.slice(0, 2).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onPickSuggestion(s)}
                    className="w-full text-left p-3 bg-primary-yellow/8 border border-primary-yellow/25 rounded-xl text-[11px] text-text-teal/65 hover:bg-primary-yellow/15 transition-all leading-relaxed active:scale-[0.99]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
