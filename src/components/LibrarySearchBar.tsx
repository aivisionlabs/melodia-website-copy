"use client";

import { Search, X, Mic, MicOff } from "lucide-react";
import { useState, useCallback } from "react";
import { debounce } from "@/lib/utils";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { trackSearchEvent } from "@/lib/analytics";

interface LibrarySearchBarProps {
  onSearch: (query: string) => void;
  onSuggestions?: (suggestions: string[]) => void;
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export function LibrarySearchBar({
  onSearch,
  onSuggestions,
  initialQuery = "",
  placeholder = "Search songs...",
  className = "",
}: LibrarySearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [showVoiceError, setShowVoiceError] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const debouncedSearch = useCallback(
    debounce((...args: unknown[]) => {
      const searchQuery = args[0] as string;
      onSearch(searchQuery);
      setIsSearching(false);
    }, 600),
    [onSearch]
  );

  const debouncedSuggestions = useCallback(
    debounce((...args: unknown[]) => {
      const searchQuery = args[0] as string;
      if (onSuggestions && searchQuery.trim().length >= 2) {
        // This would typically call an API to get suggestions
        // For now, we'll pass empty array and let the parent handle it
        onSuggestions([]);
      }
    }, 200),
    [onSuggestions]
  );

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setQuery(transcript);
      setIsSearching(true);
      debouncedSearch(transcript);

      // Track voice search analytics
      trackSearchEvent.search(transcript, 0, "voice", "fuzzy"); // Results count will be updated when search completes
    },
    [debouncedSearch]
  );

  const handleVoiceError = useCallback((error: string) => {
    setShowVoiceError(true);
    setShowPermissionPrompt(false);
    // Auto-hide error after 6 seconds
    setTimeout(() => setShowVoiceError(false), 6000);
  }, []);

  const {
    isListening,
    isSupported,
    hasPermission,
    isInitializing,
    error: voiceError,
    startListening,
    stopListening,
    clearError,
    requestPermission,
  } = useVoiceSearch({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      setIsSearching(true);
      debouncedSearch(value);
    } else {
      setIsSearching(false);
      onSearch("");
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsSearching(false);
    onSearch("");
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Clear any existing errors
    clearError();
    setShowVoiceError(false);
    setShowPermissionPrompt(false);

    // If we don't have permission, show a friendly prompt first
    if (!hasPermission && isSupported) {
      setShowPermissionPrompt(true);
      // Auto-hide permission prompt after 4 seconds
      setTimeout(() => setShowPermissionPrompt(false), 4000);
    }

    await startListening();
  };

  const handleRequestPermission = async () => {
    setShowPermissionPrompt(false);
    const granted = await requestPermission();
    if (granted) {
      await startListening();
    }
  };

  return (
    <div className={`relative max-w-md mx-auto ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-teal/60 h-4 w-4" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className={`w-full pl-10 pr-20 py-3 border rounded-xl bg-white/90 backdrop-blur-sm text-text-teal placeholder-text-teal/60 focus:outline-none transition-all duration-300 shadow-sm ${
            isListening
              ? "border-primary-yellow/60 ring-2 ring-primary-yellow/30 bg-primary-yellow/5"
              : "border-primary-yellow/30 focus:ring-2 focus:ring-primary-yellow/50 focus:border-primary-yellow/50"
          }`}
        />
        {/* Voice Search Button */}
        {isSupported && !isInitializing && (
          <button
            onClick={handleVoiceToggle}
            className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
              isListening
                ? "text-white bg-red-500 hover:bg-red-600 shadow-lg scale-110 animate-pulse"
                : hasPermission
                  ? "text-text-teal/70 hover:text-text-teal hover:bg-primary-yellow/20 hover:scale-105"
                  : "text-text-teal/50 hover:text-text-teal hover:bg-primary-yellow/10 hover:scale-105"
            }`}
            aria-label={
              isListening ? "Stop voice search" : "Start voice search"
            }
            title={
              isListening
                ? "Stop voice search"
                : hasPermission
                  ? "Click to search by voice"
                  : "Click to enable voice search"
            }
            disabled={isSearching}
          >
            <div className="relative">
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {/* Subtle pulse animation when ready for voice input */}
              {!isListening && hasPermission && (
                <div className="absolute inset-0 rounded-full bg-primary-yellow/20 animate-ping opacity-20"></div>
              )}
            </div>
          </button>
        )}

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-teal/60 hover:text-text-teal transition-colors duration-200"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Loading Spinner */}
        {isSearching && !isListening && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-yellow"></div>
          </div>
        )}
      </div>

      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="mt-2 text-center animate-fade-in">
          <div className="inline-flex items-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm shadow-sm">
            <Mic className="h-4 w-4 mr-2" />
            <span className="mr-3">
              Microphone permission needed for voice search
            </span>
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Allow
            </button>
          </div>
        </div>
      )}

      {/* Voice Error Message */}
      {showVoiceError && voiceError && (
        <div className="mt-2 text-center animate-fade-in">
          <div className="inline-flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm">
            <Mic className="h-4 w-4 mr-2" />
            {voiceError}
          </div>
        </div>
      )}

      {/* Voice Search Status */}
      {isListening && (
        <div className="mt-2 text-center animate-fade-in">
          <div className="inline-flex items-center px-3 py-2 bg-primary-yellow/10 border border-primary-yellow/30 rounded-lg text-text-teal text-sm">
            <div className="w-2 h-2 bg-primary-yellow rounded-full mr-2 animate-pulse"></div>
            Listening... Speak now
          </div>
        </div>
      )}
    </div>
  );
}
