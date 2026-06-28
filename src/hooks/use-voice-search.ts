"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceSearchOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  error: string | null;
  isInitializing: boolean;
}

export function useVoiceSearch({
  onResult,
  onError,
  language = 'en-US'
}: UseVoiceSearchOptions) {
  const [state, setState] = useState<VoiceSearchState>({
    isListening: false,
    isSupported: false,
    hasPermission: false,
    error: null,
    isInitializing: true
  });

  const recognitionRef = useRef<any>(null);

  // Check browser support and permissions on mount
  useEffect(() => {
    const checkSupportAndPermissions = async () => {
      if (typeof window === 'undefined') {
        setState(prev => ({ ...prev, isInitializing: false }));
        return;
      }

      // Check if speech recognition is supported
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const isSupported = !!SpeechRecognition;

      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          isInitializing: false
        }));
        return;
      }

      // Check microphone permission
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setState(prev => ({
            ...prev,
            isSupported: true,
            hasPermission: permission.state === 'granted',
            isInitializing: false
          }));

          // Listen for permission changes
          permission.addEventListener('change', () => {
            setState(prev => ({
              ...prev,
              hasPermission: permission.state === 'granted'
            }));
          });
        } else {
          // Fallback for browsers without permissions API
          setState(prev => ({
            ...prev,
            isSupported: true,
            hasPermission: true, // Assume permission is available
            isInitializing: false
          }));
        }
      } catch {
        // If permission check fails, assume it's available
        setState(prev => ({
          ...prev,
          isSupported: true,
          hasPermission: true,
          isInitializing: false
        }));
      }
    };

    checkSupportAndPermissions();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Try to access microphone to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately

      setState(prev => ({ ...prev, hasPermission: true, error: null }));
      return true;
    } catch {
      const errorMessage = 'Microphone permission is required for voice search';
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  const startListening = useCallback(async () => {
    if (!state.isSupported) {
      const errorMsg = 'Voice search is not supported in this browser. Please use Chrome, Safari, or Firefox.';
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      return;
    }

    // Check and request permission if needed
    if (!state.hasPermission) {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        return;
      }
    }

    try {
      // Use Webkit Speech Recognition (Chrome/Safari) or Speech Recognition (Firefox)
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();

        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = language;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          setState(prev => ({ ...prev, isListening: true, error: null }));
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setState(prev => ({ ...prev, isListening: false }));
          onResult(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          let errorMessage = 'Speech recognition error';

          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try speaking again.';
              break;
            case 'audio-capture':
              errorMessage = 'Microphone not found. Please check your microphone connection.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone access denied. Please allow microphone permission and try again.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your internet connection.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not available.';
              break;
            case 'bad-grammar':
              errorMessage = 'Speech recognition grammar error.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          setState(prev => ({
            ...prev,
            isListening: false,
            error: errorMessage
          }));
          onError?.(errorMessage);
        };

        recognitionRef.current.onend = () => {
          setState(prev => ({ ...prev, isListening: false }));
        };
      }

      recognitionRef.current.start();
    } catch {
      const errorMsg = 'Failed to start voice search. Please try again.';
      setState(prev => ({
        ...prev,
        isListening: false,
        error: errorMsg
      }));
      onError?.(errorMsg);
    }
  }, [state.isSupported, state.hasPermission, language, onResult, onError, requestPermission]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearError,
    requestPermission
  };
}
