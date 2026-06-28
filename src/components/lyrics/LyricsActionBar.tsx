/**
 * Lyrics Action Bar Component
 * Bottom action bar with buttons for different states
 */

"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { LyricsMode, EditMode } from "@/lib/constants/lyrics";
import { MIN_CUSTOM_LYRICS_LENGTH } from "@/lib/constants/lyrics";

interface LyricsActionBarProps {
  lyricsMode: LyricsMode;
  editMode: EditMode;
  lyrics: string;
  lyricsStatus: string;
  isCustomLyrics: boolean;
  editsRemaining: number;
  isProcessingCustom: boolean;
  isRefining: boolean;
  isApproving: boolean;
  customLyricsInput: string;
  refinePrompt: string;
  pendingChangesCount?: number;
  onProcessCustom: () => void;
  onRefine: () => void;
  onCancelEdit: () => void;
  onApprove: () => void;
  onContinue: () => void;
  onGenerate: () => void;
}

export default function LyricsActionBar({
  lyricsMode,
  editMode,
  lyrics,
  lyricsStatus,
  isCustomLyrics,
  editsRemaining,
  isProcessingCustom,
  isRefining,
  isApproving,
  customLyricsInput,
  refinePrompt,
  pendingChangesCount = 0,
  onProcessCustom,
  onRefine,
  onCancelEdit,
  onApprove,
  onContinue,
  onGenerate,
}: LyricsActionBarProps) {
  // Custom lyrics mode - show process button
  if (lyricsMode === "custom") {
    return (
      <Button
        className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        onClick={onProcessCustom}
        disabled={
          isProcessingCustom ||
          !customLyricsInput.trim() ||
          customLyricsInput.trim().length < MIN_CUSTOM_LYRICS_LENGTH
        }
      >
        {isProcessingCustom ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Process Lyrics"
        )}
      </Button>
    );
  }

  // AI edit mode - show refine UI
  if (editMode === "ai") {
    return (
      <>
        <Button
          className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200 mb-3"
          onClick={onRefine}
          disabled={isRefining || (!refinePrompt.trim() && pendingChangesCount === 0)}
        >
          {isRefining ? "Updating Lyrics..." : "Submit Changes"}
        </Button>
        <button
          className="w-full text-text-teal font-semibold text-center py-2"
          onClick={onCancelEdit}
        >
          Cancel
        </button>
      </>
    );
  }

  // Lyrics exist - show approve/continue buttons
  if (lyrics) {
    if (lyricsStatus === "approved" || isCustomLyrics) {
      return (
        <Button
          onClick={onContinue}
          disabled={isApproving}
          className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
        >
          {isApproving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      );
    }

    return (
      <>
        <Button
          onClick={onApprove}
          disabled={isApproving}
          className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
        >
          {isApproving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting Generation...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Approve & Continue
            </>
          )}
        </Button>
      </>
    );
  }

  // No lyrics - show generate button
  return (
    <Button
      className="w-full h-14 bg-accent-coral text-white text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
      onClick={onGenerate}
    >
      Generate Lyrics
    </Button>
  );
}
