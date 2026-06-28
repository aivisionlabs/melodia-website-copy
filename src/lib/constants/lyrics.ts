/**
 * Constants for lyrics generation and editing
 */

export const MIN_CUSTOM_LYRICS_LENGTH = 50;
export const DEFAULT_MAX_EDITS = 2;
export const DEFAULT_EDITS_REMAINING = 2;

export const LOADING_SCREEN_DURATION = 40;

export const LOADING_MESSAGES = {
  GENERATING: {
    title: "Producing your lyrics",
    message: "Your masterpiece needs perfect lyrics. We are working on it.",
  },
  REFINING: {
    title: "Refining your lyrics",
    message: "We are working our magic on your lyrics. Hang tight!",
  },
  PROCESSING_CUSTOM: {
    title: "Processing your lyrics",
    message: "We are processing your custom lyrics, Hang tight!.",
  },
} as const;

export type LyricsMode = "ai" | "custom";
export type EditMode = "ai" | null;
export type LyricsStatus = "draft" | "approved" | "pending";
