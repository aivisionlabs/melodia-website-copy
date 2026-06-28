import { useState, useEffect, useCallback, useRef } from 'react';
import { SongStatusResponse } from '@/lib/types';
import { hasStreamReadyVariant } from '@/lib/utils/variant-utils';

export interface UseSongStatusPollingOptions {
  /** Polling interval in milliseconds (default: 10000) */
  intervalMs?: number;
  /** Maximum polling time in milliseconds (default: 10 minutes) */
  maxPollingTime?: number;
  /** Whether to start polling automatically (default: true) */
  autoStart?: boolean;
  /** Whether to stop polling when song is complete (default: true) */
  stopOnComplete?: boolean;
  /** Enable exponential backoff for retries (default: false) */
  enableExponentialBackoff?: boolean;
  /** Max retries for exponential backoff (default: 3) */
  maxRetries?: number;
  /** Callback when status changes */
  onStatusChange?: (status: SongStatusResponse) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseSongStatusPollingReturn {
  /** Current song status response */
  songStatus: SongStatusResponse | null;
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether currently polling */
  isPolling: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether to show loading screen */
  showLoadingScreen: boolean;
  /** Start polling manually */
  startPolling: () => void;
  /** Stop polling manually */
  stopPolling: () => void;
  /** Refresh status once */
  refreshStatus: () => Promise<void>;
}

/**
 * Custom hook for managing song status polling
 */
export function useSongStatusPolling(
  songId: number | null,
  options: UseSongStatusPollingOptions = {}
): UseSongStatusPollingReturn {
  const {
    intervalMs = 10000,
    maxPollingTime = 10 * 60 * 1000, // 10 minutes
    autoStart = true,
    stopOnComplete = true,
    onStatusChange,
    onError,
  } = options;

  // State
  const [songStatus, setSongStatus] = useState<SongStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  // Refs for polling control
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    setIsPolling(false);
  }, []);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (!songId || isPollingRef.current) return;

    isPollingRef.current = true;
    setIsPolling(true);
    startTimeRef.current = Date.now();

    const poll = async () => {
      // Check if we've exceeded max polling time
      if (Date.now() - startTimeRef.current > maxPollingTime) {
        console.log('Max polling time exceeded, stopping polling');
        stopPolling();
        return;
      }

      // Check if we should stop polling (in case status changed externally)
      if (!isPollingRef.current) {
        return;
      }

      try {
        const response = await fetch(`/api/song-status/${songId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check song status');
        }

        const statusResponse: SongStatusResponse = {
          success: true,
          status: data.status,
          variants: data.songVariants,
          slug: data.slug,
          error: data.error,
          message: data.message,
          songId: data.songId,
          taskId: data.taskId,
          lyricsDraftTitle: data.lyricsDraftTitle,
          songRequestId: data.songRequestId,
          variationsRemaining: data.variationsRemaining,
          occasion: data.occasion,
          languages: data.languages,
          recipientName: data.recipientName,
        };

        setSongStatus(statusResponse);
        setError(null);
        setIsLoading(false);

        // Update loading screen state based on variant readiness (demo-mode progressive readiness)
        const variants = statusResponse.variants || [];
        const hasStreamReady = hasStreamReadyVariant(variants);

        if (hasStreamReady) {
          setShowLoadingScreen(false);
        } else if (variants.length > 0) {
          // Variants exist but none streamable yet → keep showing loading
          setShowLoadingScreen(true);
        } else {
          // Fallback to status
          setShowLoadingScreen(statusResponse.status === 'processing');
        }

        onStatusChange?.(statusResponse);

        // Stop polling if completed or failed, or if all variants are download-ready
        const allVariantsDownloadReady =
          variants.length > 0 &&
          variants.every((v) => {
            const variantStatus = (v?.variantStatus || '').toUpperCase();
            return variantStatus === 'DOWNLOAD_READY';
          });

        const shouldStopPolling =
          statusResponse.status === "COMPLETED" ||
          statusResponse.status === "FAILED" ||
          allVariantsDownloadReady;

        if (shouldStopPolling && stopOnComplete) {
          console.log('Stopping polling - Status:', statusResponse.status, 'All variants download ready:', allVariantsDownloadReady);
          stopPolling();
          return;
        }

        // Schedule next poll if still polling
        if (isPollingRef.current) {
          pollingIntervalRef.current = setTimeout(poll, intervalMs);
        }
      } catch (err) {
        console.error('Error polling song status:', err);
        const error = err instanceof Error ? err : new Error('Failed to poll song status');
        setError(error.message);
        onError?.(error);

        // Schedule next poll even on error if still polling
        if (isPollingRef.current) {
          pollingIntervalRef.current = setTimeout(poll, intervalMs);
        }
      }
    };

    // Initial poll
    poll();
  }, [songId, intervalMs, maxPollingTime, stopOnComplete, onStatusChange, onError, stopPolling]);

  /**
   * Refresh status once without starting continuous polling
   */
  const refreshStatus = useCallback(async () => {
    if (!songId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/song-status/${songId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check song status");
      }

      const statusResponse: SongStatusResponse = {
        success: true,
        status: data.status,
        variants: data.songVariants,
        slug: data.slug,
        error: data.error,
        message: data.message,
        songId: data.songId,
        taskId: data.taskId,
        lyricsDraftTitle: data.lyricsDraftTitle,
        songRequestId: data.songRequestId,
        variationsRemaining: data.variationsRemaining,
        occasion: data.occasion,
        languages: data.languages,
        recipientName: data.recipientName,
      };

      setSongStatus(statusResponse);
      // Update loading screen state on manual refresh as well
      const variants = statusResponse.variants || [];
      const hasStreamReady = hasStreamReadyVariant(variants);
      if (hasStreamReady) {
        setShowLoadingScreen(false);
      } else if (variants.length > 0) {
        setShowLoadingScreen(true);
      } else {
        setShowLoadingScreen(statusResponse.status === "processing");
      }

      onStatusChange?.(statusResponse);

      // If autoStart is enabled, and we're not already polling,
      // and the song is not in a final state, start polling.
      if (
        autoStart &&
        !isPollingRef.current &&
        statusResponse.status !== "COMPLETED" &&
        statusResponse.status !== "FAILED"
      ) {
        startPolling();
      }
    } catch (err) {
      console.error("Error refreshing song status:", err);
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to refresh song status");
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [songId, onStatusChange, onError, autoStart, startPolling]);

  // Initial data fetch
  useEffect(() => {
    if (!songId) {
      setSongStatus(null);
      setIsLoading(false);
      return;
    }

    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  // Auto-start polling
  /*
  useEffect(() => {
    if (!autoStart || !songId || !songStatus) return;
    // Start polling if song is not complete and not already polling
    if (
      songStatus.status !== "COMPLETED" &&
      songStatus.status !== "FAILED" &&
      !isPollingRef.current
    ) {
      startPolling();
    }
  }, [autoStart, songId, songStatus, startPolling]);
  */

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    songStatus,
    isLoading,
    isPolling,
    error,
    showLoadingScreen,
    startPolling,
    stopPolling,
    refreshStatus,
  };
}

