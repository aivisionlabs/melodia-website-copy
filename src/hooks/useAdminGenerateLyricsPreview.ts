"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_LYRICS_PREVIEW_TIMEOUT_MS = 5 * 60 * 1000;

/** Request body for POST /api/admin/generate-lyrics-preview (matches API schema). */
export interface AdminGenerateLyricsPreviewPayload {
  recipientDetails: string;
  languages: string;
  occassion?: string;
  songStory?: string;
  mood?: string | string[];
  /** Create-page flow: reference lyrics from a library template song */
  sourceSongId?: number;
  personaId?: number;
}

/** Response shape from the API. */
export interface AdminGenerateLyricsPreviewResult {
  title: string | null;
  lyrics: string | null;
  musicStyle: string | null;
  description?: string | null;
  language?: string | null;
}

function normalizeMood(mood: string | string[] | undefined): string | string[] | undefined {
  if (mood == null || mood === "") return undefined;
  if (Array.isArray(mood)) return mood.length ? mood : undefined;
  const trimmed = String(mood).trim();
  return trimmed || undefined;
}

export function useAdminGenerateLyricsPreview(options?: {
  onSuccess?: (result: AdminGenerateLyricsPreviewResult) => void;
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLyrics = useCallback(
    async (payload: AdminGenerateLyricsPreviewPayload) => {
      if (payload.recipientDetails.trim().length < 2) {
        toast({
          title: "Invalid input",
          description: "Recipient details (name, relationship) required.",
          variant: "destructive",
        });
        return;
      }
      if (!payload.languages?.trim()) {
        toast({
          title: "Invalid input",
          description: "At least one language required.",
          variant: "destructive",
        });
        return;
      }

      setIsGenerating(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ADMIN_LYRICS_PREVIEW_TIMEOUT_MS);

      try {
        const mood = normalizeMood(payload.mood);
        const body = {
          recipientDetails: payload.recipientDetails.trim(),
          languages: payload.languages.trim(),
          occassion: payload.occassion?.trim() || undefined,
          songStory: payload.songStory?.trim() || undefined,
          mood: mood,
          sourceSongId: payload.sourceSongId,
          personaId: payload.personaId,
        };

        const res = await fetch("/api/admin/generate-lyrics-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (!res.ok) {
          const msg = data?.error || "Lyrics generation failed";
          setError(msg);
          toast({
            title: res.status === 504 ? "Request timed out" : "Lyrics generation failed",
            description: msg,
            variant: "destructive",
          });
          return;
        }

        const result: AdminGenerateLyricsPreviewResult = {
          title: data.title ?? null,
          lyrics: data.lyrics ?? null,
          musicStyle: data.musicStyle ?? null,
          description: data.description ?? null,
          language: data.language ?? null,
        };
        options?.onSuccess?.(result);
      } catch (err) {
        clearTimeout(timeoutId);
        const isAbort = err instanceof Error && err.name === "AbortError";
        const msg = isAbort
          ? "Lyrics generation took too long. Try again or use demo mode (DEMO_MODE=true) for faster previews."
          : err instanceof Error ? err.message : "Network error";
        setError(msg);
        toast({
          title: isAbort ? "Request timed out" : "Error",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [toast, options]
  );

  return { generateLyrics, isGenerating, error };
}
