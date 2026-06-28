"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { trackPlayerEvent } from "@/lib/analytics";
import { useIOSAudio } from "./useIOSAudio";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioError: boolean;
  isLoading: boolean;
  isPlayLoading: boolean;
}

interface AudioPlayerActions {
  togglePlay: () => Promise<void>;
  skipTime: (seconds: number) => void;
  seekTo: (time: number) => void;
  formatTime: (time: number) => string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

interface UseAudioPlayerOptions {
  audioUrl?: string;
  songTitle: string;
  songId: string;
  songSlug?: string; // Song slug for play count tracking
  skipPlayTracking?: boolean; // Skip play count tracking (e.g., for admin portal)
  songMetadata?: Record<string, any>; // Additional song metadata for analytics
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
}

export function useAudioPlayer({
  audioUrl,
  songTitle,
  songId,
  songSlug,
  skipPlayTracking = false,
  songMetadata,
  onPlay,
  onPause,
  onError,
}: UseAudioPlayerOptions): AudioPlayerState & AudioPlayerActions {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playCountTrackedRef = useRef(false); // Track if we've already counted this play session
  const pathname = usePathname();

  const { isIOS, iosAudioUnlocked, unlockIOSAudio } = useIOSAudio();

  // Helper function to track play count (non-blocking)
  const trackPlayCount = useCallback(() => {
    // Skip if already tracked for this play session
    if (playCountTrackedRef.current) return;

    // Skip if explicitly disabled
    if (skipPlayTracking) return;

    // Skip if in admin portal (double check via pathname)
    if (pathname?.includes('/song-admin-portal') || pathname?.includes('/admin')) {
      return;
    }

    // Need song slug to track
    if (!songSlug) return;

    // Mark as tracked immediately to prevent duplicate calls
    playCountTrackedRef.current = true;

    // Fire-and-forget: don't await, don't block audio playback
    fetch(`/api/song-plays/${songSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((error) => {
      // Silently handle errors - don't block or show to user
      console.error('Failed to track play count (non-blocking):', error);
      // Reset on error so we can retry next time
      playCountTrackedRef.current = false;
    });
  }, [songSlug, skipPlayTracking, pathname]);

  // Helper function to get the correct audio URL
  const getAudioUrl = useCallback(() => {
    return audioUrl;
  }, [audioUrl]);

  // Handle audio loading and errors
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset loading state when audio URL changes
    setIsLoading(false);
    setAudioError(false);

    const handleCanPlay = () => {
      setIsLoading(false);
      setAudioError(false);
    };

    const handleError = () => {
      console.warn(
        "Audio file not available or failed to load. This is expected for demo purposes."
      );
      setIsLoading(false);
      setAudioError(true);
    };

    const handleLoadStart = () => {
      if (getAudioUrl()) {
        setIsLoading(true);
        setAudioError(false);
      }
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setAudioError(false);
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
      setAudioError(false);
    };

    // iOS-specific: Handle when audio is ready
    const handleLoadedData = () => {
      setIsLoading(false);
      setAudioError(false);
    };

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(
      () => {
        if (isLoading) {
          setIsLoading(false);
          setAudioError(true);
        }
      },
      isIOS ? 5000 : 10000
    ); // 5 second timeout on iOS, 10 seconds on other platforms

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("loadeddata", handleLoadedData);

    return () => {
      clearTimeout(loadingTimeout);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [getAudioUrl, isLoading, isIOS]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;

    // iOS-specific: Unlock audio on first interaction
    if (isIOS && !iosAudioUnlocked) {
      console.log("🔓 Unlocking iOS audio...");
      unlockIOSAudio(); // Call without await to keep it synchronous
    }

    if (isPlaying) {
      if (audio) {
        audio.pause();
      }
      // Clear demo interval if running
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setIsPlaying(false);
      // Reset play count tracking when paused (so next play will be tracked)
      playCountTrackedRef.current = false;
      onPause?.();

      // Track pause event
      trackPlayerEvent.pause(songTitle, songId, currentTime, songMetadata);
    } else {
      // If no audio URL or audio error, simulate playing for demo
      if (!getAudioUrl() || audioError) {
        setIsPlaying(true);
        onPlay?.();
        // Track demo play event
        trackPlayerEvent.play(songTitle, songId, true, songMetadata);

        // Simulate time progression for demo
        demoIntervalRef.current = setInterval(() => {
          setCurrentTime((prev) => {
            const newTime = prev + 0.1;
            if (newTime >= 40) {
              // Reset after 40 seconds
              if (demoIntervalRef.current) {
                clearInterval(demoIntervalRef.current);
                demoIntervalRef.current = null;
              }
              setIsPlaying(false);
              setCurrentTime(0);
              // Track demo end event
              trackPlayerEvent.audioEnd(songTitle, songId, 40, songMetadata);
              return 0;
            }
            return newTime;
          });
        }, 100);
      } else {
        // Show loading state when trying to play actual audio
        setIsPlayLoading(true);

        // Try to play actual audio - MUST call play() synchronously for iOS
        if (audio) {
          try {
            // Set volume before playing (iOS requirement)
            audio.volume = 1;

            // iOS-specific: Load if not loaded, but don't wait
            if (isIOS && audio.readyState < 2) {
              audio.load();
            }

            // CRITICAL: Call play() immediately to preserve user gesture
            // This must be synchronous for iOS
            const playPromise = audio.play();

            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log("✅ Audio playing successfully");
                  setIsPlaying(true);
                  setAudioError(false);
                  setIsPlayLoading(false);
                  onPlay?.();
                  // Track play event
                  trackPlayerEvent.play(songTitle, songId, false, songMetadata);
                  // Track play count
                  trackPlayCount();
                })
                .catch((error) => {
                  console.error("❌ Play error:", error, {
                    name: error.name,
                    message: error.message,
                    readyState: audio.readyState,
                  });
                  // If play fails, try one more time after a brief moment
                  console.log("🔄 Retrying play in 100ms...");
                  setTimeout(() => {
                    audio
                      .play()
                      .then(() => {
                        console.log("✅ Retry successful");
                        setIsPlaying(true);
                        setAudioError(false);
                        setIsPlayLoading(false);
                        onPlay?.();
                        trackPlayerEvent.play(songTitle, songId, false, songMetadata);
                        // Track play count
                        trackPlayCount();
                      })
                      .catch((retryError) => {
                        console.error("❌ Retry failed:", retryError);
                        setAudioError(true);
                        setIsPlayLoading(false);
                        onError?.("play_error");
                        trackPlayerEvent.audioError(
                          songTitle,
                          songId,
                          "play_error",
                          songMetadata
                        );
                      });
                  }, 100);
                });
            }
          } catch (error) {
            console.error("❌ Synchronous play error:", error);
            setAudioError(true);
            setIsPlayLoading(false);
            onError?.("play_error");
            // Track audio error
            trackPlayerEvent.audioError(songTitle, songId, "play_error", songMetadata);
          }
        }
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current && !audioError) {
      const newTime = Math.max(
        0,
        Math.min(audioRef.current.currentTime + seconds, duration || Infinity)
      );
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      // Track skip event
      if (seconds > 0) {
        trackPlayerEvent.skipForward(songTitle, songId, seconds, songMetadata);
      } else {
        trackPlayerEvent.skipBackward(songTitle, songId, Math.abs(seconds), songMetadata);
      }
    } else if (!getAudioUrl() || audioError) {
      // Handle demo mode
      const newTime = Math.max(0, Math.min(currentTime + seconds, 40));
      setCurrentTime(newTime);

      // Track skip event in demo mode
      if (seconds > 0) {
        trackPlayerEvent.skipForward(songTitle, songId, seconds, songMetadata);
      } else {
        trackPlayerEvent.skipBackward(songTitle, songId, Math.abs(seconds), songMetadata);
      }
    }
  };

  const seekTo = (time: number) => {
    const previousTime = currentTime;

    // Track seek event
    trackPlayerEvent.seek(songTitle, songId, previousTime, time, songMetadata);

    if (audioRef.current && !audioError) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    } else if (!getAudioUrl() || audioError) {
      // Handle demo mode
      setCurrentTime(time);
    }
  };

  // iOS-specific: Immediately set error state if no audio URL on iOS
  useEffect(() => {
    if (isIOS && !getAudioUrl()) {
      setAudioError(true);
      setIsLoading(false);
    }
  }, [isIOS, getAudioUrl]);

  // iOS-specific: Preload audio as soon as component mounts
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && isIOS && getAudioUrl()) {
      // Load audio early on iOS to prepare for playback
      const loadAudio = () => {
        try {
          audio.load();
        } catch (error) {
          console.warn("Early audio load failed:", error);
        }
      };

      // Load after a short delay to ensure DOM is ready
      const timeoutId = setTimeout(loadAudio, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isIOS, getAudioUrl]);

  // Reset play count tracking when song changes
  useEffect(() => {
    playCountTrackedRef.current = false;
  }, [songSlug]);

  // When audio URL changes (e.g. variant switch), reset play state and pause so the play button reflects the new source
  useEffect(() => {
    setIsPlaying(false);
    setIsPlayLoading(false);
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  }, [audioUrl]);

  // Cleanup demo interval on unmount
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    audioError,
    isLoading,
    isPlayLoading,
    // Actions
    togglePlay,
    skipTime,
    seekTo,
    formatTime,
    // Refs for components to use
    audioRef,
  };
}
