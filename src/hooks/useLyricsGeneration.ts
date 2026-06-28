/**
 * Custom hook for lyrics generation operations
 * Handles AI generation, refinement, and custom lyrics processing
 */

import { useState } from "react";
import { useToastHelpers } from "@/hooks/use-toast";
import { trackFunnelEvent } from "@/lib/analytics";
import { MIN_CUSTOM_LYRICS_LENGTH } from "@/lib/constants/lyrics";
import { logger } from "@/lib/logger";

interface UseLyricsGenerationOptions {
  songRequestId: number;
  onSuccess?: (data: {
    lyrics: string;
    title: string;
    lyricsDraftId: number;
    status: string;
    version?: number;
    musicStyle?: string | null;
    isCustomLyrics?: boolean;
  }) => void;
}

interface LyricsDraftResponse {
  draft: {
    lyrics: string;
    title: string;
    id: number;
    version?: number;
    status?: string;
    musicStyle?: string | null;
    custom_lyrics?: boolean;
  };
}

export function useLyricsGeneration({
  songRequestId,
  onSuccess,
}: UseLyricsGenerationOptions) {
  const toast = useToastHelpers();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);
  const [isRegeneratingStyle, setIsRegeneratingStyle] = useState(false);
  const [isUpdatingStyle, setIsUpdatingStyle] = useState(false);
  const [error, setError] = useState("");

  const generateLyrics = async () => {
    if (!songRequestId || isNaN(songRequestId) || songRequestId <= 0) {
      const errorMsg = `Invalid song request ID: ${songRequestId}`;
      console.error('Invalid song request ID in useLyricsGeneration', {
        songRequestId,
      });
      setError(errorMsg);
      return;
    }

    setIsGenerating(true);
    setError("");

    trackFunnelEvent.lyricsGenerationStart(songRequestId);

    try {
      const response = await fetch("/api/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songRequestId,
          language: "English",
        }),
      });

      const data: LyricsDraftResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || "Failed to generate lyrics");
      }

      const result = {
        lyrics: data.draft.lyrics,
        title: data.draft.title,
        lyricsDraftId: data.draft.id,
        status: data.draft.status || "draft",
        version: data.draft.version,
        musicStyle: data.draft.musicStyle || null,
      };

      trackFunnelEvent.lyricsGenerationComplete(
        songRequestId,
        data.draft.version || 1
      );

      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to generate lyrics";
      logger.error('Error generating lyrics in useLyricsGeneration', {
        error: err instanceof Error ? err : new Error(String(err)),
        songRequestId,
        apiName: 'useLyricsGeneration'
      });
      setError(errorMsg);
      toast.error("Generation Failed", errorMsg);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const refineLyrics = async (lyricsDraftId: number, refinePrompt: string) => {
    if (!refinePrompt.trim() || !lyricsDraftId) {
      return;
    }

    setIsRefining(true);
    setError("");

    try {
      const response = await fetch("/api/refine-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyricsDraftId,
          editPrompt: refinePrompt,
        }),
      });

      const data: LyricsDraftResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || "Failed to refine lyrics");
      }

      const result = {
        lyrics: data.draft.lyrics,
        title: data.draft.title,
        lyricsDraftId: data.draft.id,
        status: data.draft.status || "draft",
        version: data.draft.version,
      };

      trackFunnelEvent.lyricsEdit(songRequestId, "ai_refine");

      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to refine lyrics";
      console.error('Error refining lyrics in useLyricsGeneration', {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
        lyricsDraftId,
      });
      setError(errorMsg);
      toast.error("Update Failed", errorMsg);
      throw err;
    } finally {
      setIsRefining(false);
    }
  };

  const processCustomLyrics = async (customLyrics: string) => {
    if (!customLyrics.trim() || customLyrics.trim().length < MIN_CUSTOM_LYRICS_LENGTH) {
      const errorMsg = `Please enter at least ${MIN_CUSTOM_LYRICS_LENGTH} characters of lyrics`;
      console.warn('Custom lyrics too short in useLyricsGeneration', {
        songRequestId,
        length: customLyrics.trim().length,
        minLength: MIN_CUSTOM_LYRICS_LENGTH,
      });
      setError(errorMsg);
      return;
    }

    setIsProcessingCustom(true);
    setError("");

    trackFunnelEvent.lyricsGenerationStart(songRequestId);

    try {
      const response = await fetch("/api/process-custom-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songRequestId,
          customLyrics: customLyrics.trim(),
        }),
      });

      const data: LyricsDraftResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || "Failed to process custom lyrics");
      }

      const result = {
        lyrics: data.draft.lyrics,
        title: data.draft.title,
        lyricsDraftId: data.draft.id,
        status: data.draft.status || "approved",
        version: data.draft.version,
        isCustomLyrics: data.draft.custom_lyrics === true,
      };

      trackFunnelEvent.lyricsGenerationComplete(
        songRequestId,
        data.draft.version || 1
      );

      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to process custom lyrics";
      console.error('Error processing custom lyrics in useLyricsGeneration', {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
        customLyricsLength: customLyrics.length,
      });
      setError(errorMsg);
      toast.error("Processing Failed", errorMsg);
      throw err;
    } finally {
      setIsProcessingCustom(false);
    }
  };

  /**
   * Save manually edited lyrics as a new draft version (two-phase architecture).
   * Stores the user's Romanized text directly as customer_lyrics; model_ready_lyrics
   * is generated later at approval time by the audio-model crafter.
   */
  const saveEdits = async (lyricsDraftId: number, editedLyrics: string) => {
    if (!editedLyrics.trim() || !lyricsDraftId) return null;

    setIsProcessingCustom(true);
    setError("");

    try {
      const response = await fetch("/api/update-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsDraftId, editedLyrics }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save lyrics");
      }

      const result = {
        lyrics: data.draft.lyrics,
        title: data.draft.title,
        lyricsDraftId: data.draft.id,
        status: data.draft.status || "draft",
        version: data.draft.version,
      };

      trackFunnelEvent.lyricsEdit(songRequestId, "manual");

      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to save lyrics";
      logger.error('Error saving edited lyrics', {
        error: err instanceof Error ? err : new Error(String(err)),
        songRequestId,
        lyricsDraftId,
        apiName: 'useLyricsGeneration',
      });
      setError(errorMsg);
      toast.error("Save Failed", errorMsg);
      return null;
    } finally {
      setIsProcessingCustom(false);
    }
  };

  const regenerateMusicStyle = async (lyricsDraftId: number): Promise<string | null> => {
    if (!lyricsDraftId) return null;

    setIsRegeneratingStyle(true);
    setError("");

    try {
      const response = await fetch("/api/regenerate-music-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsDraftId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate music style");
      }

      return data.musicStyle || null;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to regenerate music style";
      logger.error('Error regenerating music style', {
        error: err instanceof Error ? err : new Error(String(err)),
        lyricsDraftId,
        apiName: 'useLyricsGeneration'
      });
      setError(errorMsg);
      toast.error("Regeneration Failed", errorMsg);
      return null;
    } finally {
      setIsRegeneratingStyle(false);
    }
  };

  const updateMusicStyle = async (lyricsDraftId: number, musicStyle: string): Promise<string | null> => {
    if (!lyricsDraftId || !musicStyle.trim()) return null;

    setIsUpdatingStyle(true);
    setError("");

    try {
      const response = await fetch("/api/update-music-style", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsDraftId, musicStyle: musicStyle.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update music style");
      }

      return data.musicStyle || null;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to update music style";
      logger.error('Error updating music style', {
        error: err instanceof Error ? err : new Error(String(err)),
        lyricsDraftId,
        apiName: 'useLyricsGeneration'
      });
      setError(errorMsg);
      toast.error("Update Failed", errorMsg);
      return null;
    } finally {
      setIsUpdatingStyle(false);
    }
  };

  return {
    generateLyrics,
    refineLyrics,
    processCustomLyrics,
    saveEdits,
    regenerateMusicStyle,
    updateMusicStyle,
    isGenerating,
    isRefining,
    isProcessingCustom,
    isRegeneratingStyle,
    isUpdatingStyle,
    error,
    setError,
  };
}
