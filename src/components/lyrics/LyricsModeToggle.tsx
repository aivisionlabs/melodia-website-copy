/**
 * Lyrics Mode Toggle Component
 * Toggle between AI and Custom lyrics modes
 */

"use client";

import type { LyricsMode } from "@/lib/constants/lyrics";

interface LyricsModeToggleProps {
  lyricsMode: LyricsMode;
  hasLyrics: boolean;
  editsRemaining?: number;
  onModeChange: (mode: LyricsMode) => void;
  onCustomModeActivate?: () => void;
}

export default function LyricsModeToggle({
  lyricsMode,
  hasLyrics,
  editsRemaining,
  onModeChange,
  onCustomModeActivate,
}: LyricsModeToggleProps) {
  const showExhaustedMessage = hasLyrics && editsRemaining !== undefined && editsRemaining <= 0;

  return (
    <div className={`mb-6 ${hasLyrics ? 'border-b border-gray-200 pb-4' : ''}`}>
      <label className={`block font-semibold text-text-teal mb-3 ${hasLyrics ? 'text-sm' : 'text-lg'}`}>
        {hasLyrics ? 'Switch to custom lyrics' : 'How would you like to create your lyrics?'}
      </label>
      {showExhaustedMessage && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Magic Lyrics edits exhausted?</strong> You can still input your own custom lyrics below!
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => onModeChange("ai")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            lyricsMode === "ai"
              ? "bg-accent-coral text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {hasLyrics ? "AI Generated" : "Create lyrics for me"}
        </button>
        <button
          onClick={() => {
            onModeChange("custom");
            onCustomModeActivate?.();
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            lyricsMode === "custom"
              ? "bg-accent-coral text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {hasLyrics ? "Input your own" : "Input your own lyrics"}
        </button>
      </div>
      {hasLyrics && lyricsMode === "custom" && (
        <p className="text-xs text-gray-500 mt-2">
          This will create a new version with your custom lyrics
        </p>
      )}
    </div>
  );
}
