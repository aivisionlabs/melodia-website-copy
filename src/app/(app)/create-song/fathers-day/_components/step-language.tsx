"use client";

import { Check, Music2 } from "lucide-react";
import { useFathersDayWizard } from "./fathers-day-wizard-context";
import { LANGUAGE_PRESETS } from "@/app/(app)/create/_components/create-page-constants";

const ALL_LANGUAGES = [
  ...LANGUAGE_PRESETS,
  "Bengali",
  "Gujarati",
  "Malayalam",
  "Odia",
  "Urdu",
];

interface StepLanguageProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function StepLanguage({ onSubmit, isSubmitting, submitLabel }: StepLanguageProps) {
  const { state, prevStep, toggleLanguage, setLanguagePreferences } =
    useFathersDayWizard();

  const canSubmit = state.languages.length > 0 && !isSubmitting;

  return (
    <div className="flex min-h-screen flex-col bg-secondary-cream font-body text-text-teal">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-text-teal/10 bg-secondary-cream/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={prevStep}
            className="text-text-teal transition-opacity hover:opacity-80"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent-coral rounded-full transition-all duration-500" style={{ width: "100%" }} />
            </div>
          </div>
          <span className="text-xs font-bold text-accent-coral whitespace-nowrap">
            Step 5 of 5
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <section className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-coral/10 mb-4">
            <Music2 className="w-6 h-6 text-accent-coral" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-text-teal leading-tight mb-2">
            Pick the language(s) for his song
          </h1>
          <p className="text-sm text-text-teal/60">
            You can mix multiple languages for a multilingual song.
          </p>
        </section>

        {/* Language chips */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          {ALL_LANGUAGES.map((lang) => {
            const isSelected = state.languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all active:scale-95 ${
                  isSelected
                    ? "border-accent-coral bg-accent-coral text-white shadow-md"
                    : "border-gray-200 bg-white text-text-teal hover:border-gray-300"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                {lang}
              </button>
            );
          })}
        </div>

        {/* Language preferences */}
        {state.languages.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-widest text-text-teal/50 mb-2">
              Customise language mix (optional)
            </label>
            <input
              type="text"
              value={state.languagePreferences}
              onChange={(e) => setLanguagePreferences(e.target.value)}
              placeholder="e.g. 80% Hindi, 20% English"
              className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
            />
          </div>
        )}

        {/* Selected summary */}
        {state.languages.length > 0 && (
          <p className="text-xs text-text-teal/50 text-center mb-2">
            Selected: <strong className="text-text-teal">{state.languages.join(" + ")}</strong>
          </p>
        )}
      </main>

      {/* Submit footer */}
      <div className="border-t border-text-teal/10 bg-secondary-cream px-4 py-4">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex h-14 w-full items-center justify-center rounded-full bg-accent-coral text-base font-bold text-white shadow-[0_6px_24px_rgba(239,71,111,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
