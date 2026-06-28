"use client";

import { FormField } from "@/components/forms/FormField";
import {
  getOccasionSuggestions,
  resolveOccasionId,
} from "@/lib/occasion-suggestions";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Character limit for story input (configurable via env variable, defaults to 1000)
const STORY_CHARACTER_LIMIT = parseInt(
  process.env.NEXT_PUBLIC_STORY_CHARACTER_LIMIT || "700",
  10
);

interface CreateSongRequestStep2Props {
  story: string;
  setStory: (value: string) => void;
  moods: string[];
  toggleMood: (mood: string) => void;
  customMood: string;
  setCustomMood: (value: string) => void;
  onBack: () => void;
  occasion: string;
  hideMood?: boolean;
}

export function CreateSongRequestStep2({
  story,
  setStory,
  moods,
  toggleMood,
  customMood,
  setCustomMood,
  onBack,
  occasion,
  hideMood = false,
}: CreateSongRequestStep2Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const fetchSuggestions = () => {
    setSuggestions(getOccasionSuggestions(resolveOccasionId(occasion)));
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion]);

  return (
    <div className="space-y-8">
      <header>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-teal hover:scale-105 transition-transform py-2 mb-4"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Title */}
        <h2 className="font-bold text-text-teal leading-tight mb-1">
          Add your personal touch
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 leading-relaxed">
          This step makes the song truly unique!
        </p>
      </header>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-lg block text-text-teal" htmlFor="song-story">
            The Story Behind the Song, Tell us about the person and the song.
            Write your heart out, don&apos;t hold back?
            <span className="font-normal text-gray-400 text-xs ml-2">
              (Optional)
            </span>
          </label>
        </div>
        <textarea
          id="song-story"
          value={story}
          onChange={(e) => {
            const value = e.target.value;
            // Truncate to character limit if exceeded
            if (value.length > STORY_CHARACTER_LIMIT) {
              setStory(value.slice(0, STORY_CHARACTER_LIMIT));
            } else {
              setStory(value);
            }
          }}
          maxLength={STORY_CHARACTER_LIMIT}
          placeholder="Share a memory, an inside joke, or what makes them special."
          className="w-full min-h-32 p-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-yellow focus:border-transparent text-text-teal placeholder:text-gray-400 transition-all duration-200 text-sm"
        />
        <div
          className={`text-xs font-medium text-right ${
            story.length > STORY_CHARACTER_LIMIT
              ? "text-red-500"
              : story.length > STORY_CHARACTER_LIMIT * 0.9
                ? "text-orange-500"
                : "text-gray-400"
          }`}
        >
          {story.length} / {STORY_CHARACTER_LIMIT}
        </div>
        {story.length > 500 && story.length < STORY_CHARACTER_LIMIT && (
          <p className="text-xs text-amber-600 mt-2">
            Keep the inputs shorter to generate the best lyrics for the song
          </p>
        )}
        {story.length >= STORY_CHARACTER_LIMIT && (
          <p className="text-xs text-orange-500 mt-2">
            Please keep input under {STORY_CHARACTER_LIMIT} characters
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-600">
                Need some inspiration?
              </h4>
              <button
                onClick={fetchSuggestions}
                className="flex items-center gap-1 text-xs text-text-teal hover:text-accent-coral transition-colors"
              >
                <RefreshCw size={12} />
                New suggestions
              </button>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setStory(suggestion)}
                  className="w-full text-left p-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-primary-yellow/20 hover:border-primary-yellow/50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hideMood && (
        <div>
          <h3 className="text-lg font-bold font-heading mb-4 text-text-teal">
            The Vibe
          </h3>
          <h3 className="font-semibold text-base mb-3 text-gray-600">Mood</h3>
          <div className="flex flex-wrap gap-3">
            {(
              [
                "Joyful",
                "Sentimental",
                "Upbeat & Fun",
                "Romantic",
                "Other",
              ] as const
            ).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMood(m)}
                className={`px-5 h-10 rounded-full border-2 transition-all duration-200 font-semibold text-sm ${
                  moods.includes(m)
                    ? "bg-accent-coral text-white border-accent-coral shadow-lg"
                    : "bg-white text-text-teal border-gray-200 hover:bg-gray-50 hover:transform hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {moods.includes("Other") && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="custom-mood"
                  className="text-sm font-semibold text-gray-600"
                >
                  Custom Mood
                </label>
                <span
                  className={`text-xs font-medium ${
                    customMood.length > 50
                      ? "text-red-500"
                      : customMood.length > 40
                        ? "text-orange-500"
                        : "text-gray-400"
                  }`}
                >
                  {customMood.length} / 50
                </span>
              </div>
              <FormField
                id="custom-mood"
                label=""
                placeholder="e.g., Energetic, Peaceful..."
                value={customMood}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 50) {
                    setCustomMood(value);
                  }
                }}
                maxLength={50}
                className="w-full h-14 px-5 bg-white border border-text-teal/20 rounded-lg placeholder-text-teal/50 focus:ring-2 focus:ring-primary-yellow focus:border-transparent font-body"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
