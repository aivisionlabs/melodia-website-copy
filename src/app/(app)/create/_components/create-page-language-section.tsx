"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { LANGUAGE_PRESETS } from "./create-page-constants";
import { InfoBubble } from "./info-bubble";

export function CreatePageLanguageSection({
  languageSectionRef,
  selectedLanguages,
  onRemoveLanguage,
  onToggleLanguagePreset,
  onOpenLanguageSheet,
  languageError,
  languagePreferences,
  onLanguagePreferencesChange,
}: {
  languageSectionRef: RefObject<HTMLDivElement | null>;
  selectedLanguages: string[];
  onRemoveLanguage: (lang: string) => void;
  onToggleLanguagePreset: (lang: string) => void;
  onOpenLanguageSheet: () => void;
  languageError?: string;
  languagePreferences: string;
  onLanguagePreferencesChange: (val: string) => void;
}) {
  const [showProportions, setShowProportions] = useState(false);

  return (
    <div ref={languageSectionRef} className="relative mb-7">
      <div
        className={`relative rounded-2xl border-2 bg-white px-4 pt-5 pb-4 transition-all focus-within:border-primary-yellow ${languageError ? "border-red-400" : "border-text-teal/15"}`}
      >
        <label className="absolute -top-[11px] left-4 flex items-center gap-1.5 bg-secondary-cream px-1.5">
          <span className="text-xs font-semibold text-text-teal/65">
            Language
          </span>
          <InfoBubble text="Choose the language(s) for your song lyrics. You can mix multiple languages like Hindi + English." />
        </label>

        <div className="flex flex-wrap gap-2 items-center min-h-[28px]">
          {selectedLanguages.map((lang) => (
            <span
              key={lang}
              className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-accent-coral text-white rounded-full text-xs font-bold"
            >
              {lang}
              <button
                type="button"
                onClick={() => onRemoveLanguage(lang)}
                className="w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center transition-colors"
                aria-label={`Remove ${lang}`}
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </span>
          ))}
          {selectedLanguages.length === 0 && (
            <button
              type="button"
              onClick={onOpenLanguageSheet}
              className="text-sm text-text-teal/35 hover:text-text-teal/50 transition-colors"
            >
              Tap to choose language(s)...
            </button>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onOpenLanguageSheet}
              className="text-[11px] font-semibold text-accent-coral hover:text-accent-coral/80 transition-colors"
            >
              See all languages →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_PRESETS.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onToggleLanguagePreset(lang)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all active:scale-95 ${
                    isSelected
                      ? "bg-accent-coral text-white border-accent-coral shadow-sm"
                      : "bg-gray-50 text-text-teal border-gray-200 hover:border-accent-coral/40"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[10px] text-text-teal/35 leading-snug">
            You can select multiple languages for a multilingual song
          </p>
        </div>

        {/* Customize proportions — only visible when ≥1 language selected */}
        {selectedLanguages.length >= 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setShowProportions((prev) => !prev);
              }}
              className="flex items-center gap-1 text-[11px] text-text-teal/45 hover:text-text-teal/70 transition-colors"
            >
              {showProportions ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Customize language preferences
            </button>

            {showProportions && (
              <div className="mt-2">
                <input
                  type="text"
                  value={languagePreferences}
                  onChange={(e) => onLanguagePreferencesChange(e.target.value)}
                  placeholder='e.g. "70% Hindi, 30% English"'
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-text-teal placeholder:text-text-teal/30 focus:outline-none focus:border-accent-coral/50 transition-colors"
                />
              </div>
            )}
          </div>
        )}
      </div>
      {languageError && (
        <p className="mt-1.5 text-xs text-red-500 font-medium px-1">
          ⚠ {languageError}
        </p>
      )}
    </div>
  );
}
