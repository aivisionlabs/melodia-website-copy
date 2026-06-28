/**
 * Custom hook for fetching and managing lyrics data
 */

import { DEFAULT_EDITS_REMAINING, DEFAULT_MAX_EDITS } from "@/lib/constants/lyrics";
import { logger } from "@/lib/logger";
import { useState, useEffect, useRef } from "react";

interface LyricsDraft {
  id: number;
  version: number;
  modelReadyLyrics: string | null;
  customerLyrics: string | null;
  title: string | null;
  status: string;
  customLyrics?: boolean;
  musicStyle?: string | null;
}

interface SongRequest {
  id: number;
  lyricsEditsUsed?: number;
}

interface PackageData {
  allowedLyricsEdits?: number;
}

interface FetchLyricsResponse {
  success: boolean;
  data?: {
    lyricsDraft: LyricsDraft;
    songRequest: SongRequest;
    package?: PackageData;
    editsRemaining?: number;
  };
}

interface UseLyricsDataOptions {
  songRequestId: number;
  enabled?: boolean;
}

export function useLyricsData({ songRequestId, enabled = true }: UseLyricsDataOptions) {
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [musicStyle, setMusicStyle] = useState<string | null>(null);
  const [lyricsDraftId, setLyricsDraftId] = useState<number | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<string>("draft");
  const [isCustomLyrics, setIsCustomLyrics] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [maxEdits, setMaxEdits] = useState(DEFAULT_MAX_EDITS);
  const [editsRemaining, setEditsRemaining] = useState(DEFAULT_EDITS_REMAINING);
  // Start as loading when we will fetch, so consumers don't act on "no data" before fetch completes (e.g. auto-starting generation when navigating "Back to Lyrics")
  const [isLoading, setIsLoading] = useState(() => enabled && !isNaN(songRequestId) && songRequestId > 0);
  const [error, setError] = useState("");
  const hasInitialized = useRef(false);

  const fetchLyrics = async () => {
    if (!songRequestId || isNaN(songRequestId) || songRequestId <= 0) {
      const errorMsg = `Invalid song request ID: ${songRequestId}`;
      console.error('Invalid song request ID in useLyricsData', {
        songRequestId,
      });
      setError(errorMsg);
      return false;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/fetch-lyrics?requestId=${songRequestId}`
      );

      if (response.ok) {
        const data: FetchLyricsResponse = await response.json();

        if (data.success && data.data) {
          const {
            lyricsDraft,
            songRequest,
            package: packageData,
            editsRemaining: remainingEdits,
          } = data.data;

          // Verify we got the right song request
          if (songRequest && songRequest.id !== songRequestId) {
            const errorMsg = `Wrong song request returned. Expected ID ${songRequestId}, got ${songRequest.id}`;
            logger.error('Wrong song request ID returned in useLyricsData', {
              expectedId: songRequestId,
              receivedId: songRequest.id,
              apiName: 'useLyricsData'
            });
            setError(errorMsg);
            return false;
          }

          // Check if this is custom lyrics
          const isCustom = (lyricsDraft as any).customLyrics || false;
          setIsCustomLyrics(isCustom);

          // Display lyrics are always in customer_lyrics (Romanized); model_ready_lyrics is only for the audio provider
          setLyrics(lyricsDraft.customerLyrics || "");
          setTitle(lyricsDraft.title || "");
          setMusicStyle(lyricsDraft.musicStyle || null);
          setLyricsDraftId(lyricsDraft.id);
          setCurrentVersion(lyricsDraft.version || 1);
          setLyricsStatus(lyricsDraft.status || "draft");

          // Update max edits and remaining edits from package data
          if (packageData?.allowedLyricsEdits) {
            setMaxEdits(packageData.allowedLyricsEdits);
          }
          if (remainingEdits !== undefined && remainingEdits !== null) {
            setEditsRemaining(remainingEdits);
          } else {
            // Fallback: calculate from package data
            const calculated = packageData?.allowedLyricsEdits
              ? packageData.allowedLyricsEdits -
              (songRequest.lyricsEditsUsed || 0)
              : DEFAULT_EDITS_REMAINING;
            setEditsRemaining(calculated);
          }

          return true;
        }
      } else if (response.status === 404) {
        // No lyrics found - this is okay
        console.debug('No lyrics found for song request', {
          songRequestId,
          status: response.status,
        });
        return false;
      } else {
        const errorMsg = `Error fetching lyrics: ${response.status} ${response.statusText}`;
        console.error('Error fetching lyrics in useLyricsData', {
          songRequestId,
          status: response.status,
          statusText: response.statusText,
        });
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error checking existing lyrics";
      console.error('Exception in useLyricsData fetchLyrics', {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
      });
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEditsRemaining = async () => {
    try {
      const response = await fetch(
        `/api/fetch-lyrics?requestId=${songRequestId}`
      );
      if (response.ok) {
        const data: FetchLyricsResponse = await response.json();
        if (data.success && data.data) {
          const { package: packageData, editsRemaining: remainingEdits } =
            data.data;
          if (packageData?.allowedLyricsEdits) {
            setMaxEdits(packageData.allowedLyricsEdits);
          }
          if (remainingEdits !== undefined && remainingEdits !== null) {
            setEditsRemaining(remainingEdits);
          }
        }
      }
    } catch (err) {
      // Log but don't show error to user - not critical
      console.warn('Error refreshing edits remaining in useLyricsData', {
        error: err instanceof Error ? err.message : String(err),
        songRequestId,
      });
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Prevent double execution in React 18 Strict Mode
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    fetchLyrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songRequestId, enabled]);

  return {
    lyrics,
    title,
    musicStyle,
    lyricsDraftId,
    lyricsStatus,
    isCustomLyrics,
    currentVersion,
    maxEdits,
    editsRemaining,
    isLoading,
    error,
    setLyrics,
    setTitle,
    setMusicStyle,
    setLyricsDraftId,
    setLyricsStatus,
    setIsCustomLyrics: setIsCustomLyrics,
    setCurrentVersion,
    refreshEditsRemaining,
    fetchLyrics,
  };
}
