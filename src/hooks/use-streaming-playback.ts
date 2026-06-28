import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  audioElement: HTMLAudioElement | null;
}

interface UseStreamingPlaybackOptions {
  onPlaybackChange?: (variantId: string, state: PlaybackState) => void;
  onDurationAvailable?: (variantId: string, duration: number) => void;
}

interface UseStreamingPlaybackReturn {
  getPlaybackState: (variantId: string) => PlaybackState;
  updatePlaybackState: (variantId: string, updates: Partial<PlaybackState>) => void;
  togglePlayback: (variantId: string, streamAudioUrl: string) => void;
  seekTo: (variantId: string, time: number) => void;
  updateDuration: (variantId: string, duration: number) => void;
  cleanup: () => void;
}

export function useStreamingPlayback(
  options: UseStreamingPlaybackOptions = {}
): UseStreamingPlaybackReturn {
  const { onPlaybackChange, onDurationAvailable } = options;

  const [playbackStates, setPlaybackStates] = useState<{
    [variantId: string]: PlaybackState;
  }>({});

  const audioElementsRef = useRef<{ [variantId: string]: HTMLAudioElement }>({});
  const playbackTimestampsRef = useRef<{ [variantId: string]: number }>({});

  const defaultPlaybackState: PlaybackState = useMemo(() => ({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isLoading: false,
    audioElement: null,
  }), []);

  const getPlaybackState = useCallback((variantId: string): PlaybackState => {
    return playbackStates[variantId] || defaultPlaybackState;
  }, [playbackStates, defaultPlaybackState]);

  const updatePlaybackState = useCallback((
    variantId: string,
    updates: Partial<PlaybackState>
  ) => {
    setPlaybackStates(prev => {
      const currentState = prev[variantId] || defaultPlaybackState;
      const newState = { ...currentState, ...updates };
      onPlaybackChange?.(variantId, newState);
      return {
        ...prev,
        [variantId]: newState,
      };
    });
  }, [onPlaybackChange, defaultPlaybackState]);

  const getOrCreateAudioElement = useCallback((variantId: string): HTMLAudioElement => {
    if (!audioElementsRef.current[variantId]) {
      const audio = new Audio();
      audio.preload = 'metadata';

      audioElementsRef.current[variantId] = audio;

      audio.addEventListener('loadstart', () => {
        updatePlaybackState(variantId, { isLoading: true });
      });

      audio.addEventListener('canplay', () => {
        updatePlaybackState(variantId, { isLoading: false });
      });

      audio.addEventListener('timeupdate', () => {
        updatePlaybackState(variantId, { currentTime: audio.currentTime });
        playbackTimestampsRef.current[variantId] = audio.currentTime;
      });

      audio.addEventListener('durationchange', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          updatePlaybackState(variantId, { duration: audio.duration });
          onDurationAvailable?.(variantId, audio.duration);
        }
      });

      audio.addEventListener('play', () => {
        updatePlaybackState(variantId, { isPlaying: true });
      });

      audio.addEventListener('pause', () => {
        updatePlaybackState(variantId, { isPlaying: false });
      });

      audio.addEventListener('ended', () => {
        updatePlaybackState(variantId, { isPlaying: false, currentTime: 0 });
      });

      audio.addEventListener('error', (e) => {
        console.error(`Audio error for variant ${variantId}:`, e);
        updatePlaybackState(variantId, { isLoading: false, isPlaying: false });
      });
    }
    return audioElementsRef.current[variantId];
  }, [updatePlaybackState, onDurationAvailable]);

  const togglePlayback = useCallback((
    variantId: string,
    streamAudioUrl: string
  ) => {
    const audio = getOrCreateAudioElement(variantId);
    const currentState = getPlaybackState(variantId);

    updatePlaybackState(variantId, { audioElement: audio });

    if (currentState.isPlaying) {
      audio.pause();
    } else {
      if (audio.src !== streamAudioUrl) {
        audio.src = streamAudioUrl;
      }

      const storedTimestamp = playbackTimestampsRef.current[variantId];
      if (storedTimestamp && storedTimestamp > 0) {
        audio.currentTime = storedTimestamp;
      }

      audio.play().catch(error => {
        console.error(`Failed to play audio for variant ${variantId}:`, error);
        updatePlaybackState(variantId, { isLoading: false, isPlaying: false });
      });
    }
  }, [getOrCreateAudioElement, getPlaybackState, updatePlaybackState]);

  const seekTo = useCallback((variantId: string, time: number) => {
    const audio = audioElementsRef.current[variantId];
    if (audio) {
      audio.currentTime = time;
      updatePlaybackState(variantId, { currentTime: time });
      playbackTimestampsRef.current[variantId] = time;
    }
  }, [updatePlaybackState]);

  const updateDuration = useCallback((variantId: string, duration: number) => {
    const currentState = getPlaybackState(variantId);
    if (duration > 0 && duration !== currentState.duration) {
      updatePlaybackState(variantId, { duration });
      onDurationAvailable?.(variantId, duration);
    }
  }, [getPlaybackState, updatePlaybackState, onDurationAvailable]);

  const cleanup = useCallback(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioElementsRef.current = {};
    playbackTimestampsRef.current = {};
    setPlaybackStates({});
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    getPlaybackState,
    updatePlaybackState,
    togglePlayback,
    seekTo,
    updateDuration,
    cleanup,
  };
}
