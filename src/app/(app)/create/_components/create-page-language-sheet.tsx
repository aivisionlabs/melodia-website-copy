"use client";

import { Check, Search, X } from "lucide-react";
import { ALL_LANGUAGES } from "./create-page-constants";
import { BottomSheet } from "./bottom-sheet";

export function CreatePageLanguageSheet({
  isOpen,
  onClose,
  langSearchText,
  onLangSearchChange,
  selectedLanguages,
  onToggleLanguage,
  onRemoveLanguage,
}: {
  isOpen: boolean;
  onClose: () => void;
  langSearchText: string;
  onLangSearchChange: (value: string) => void;
  selectedLanguages: string[];
  onToggleLanguage: (lang: string) => void;
  onRemoveLanguage: (lang: string) => void;
}) {
  const filtered = ALL_LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(langSearchText.toLowerCase().trim()),
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Choose languages"
    >
      <p className="text-[11px] text-text-teal/50 mb-4 -mt-1">
        Select one or more languages for your song
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-teal/35" />
        <input
          type="text"
          value={langSearchText}
          onChange={(e) => onLangSearchChange(e.target.value)}
          placeholder="Search languages..."
          autoFocus
          className="w-full h-11 pl-9 pr-4 bg-white border-2 border-gray-200 focus:border-primary-yellow rounded-xl text-sm text-text-teal placeholder-text-teal/35 outline-none transition-colors"
        />
      </div>

      {selectedLanguages.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-text-teal/50 font-medium">
            Selected ({selectedLanguages.length}):
          </span>
          {selectedLanguages.map((lang) => (
            <span
              key={lang}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-accent-coral text-white rounded-full text-[11px] font-bold"
            >
              {lang}
              <button
                type="button"
                onClick={() => onRemoveLanguage(lang)}
                className="w-3.5 h-3.5 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center transition-colors"
                aria-label={`Remove ${lang}`}
              >
                <X className="w-2 h-2 text-white" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((lang) => {
          const isSelected = selectedLanguages.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => onToggleLanguage(lang)}
              className={`flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                isSelected
                  ? "bg-accent-coral/8 border-accent-coral text-text-teal"
                  : "bg-white border-gray-150 hover:border-accent-coral/30 text-text-teal/75"
              }`}
            >
              <span className="text-xs font-semibold">{lang}</span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-accent-coral flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && langSearchText.trim() && (
        <div className="py-8 text-center">
          <p className="text-sm text-text-teal/50">
            No language found for &quot;{langSearchText.trim()}&quot;
          </p>
          <p className="text-[11px] text-text-teal/35 mt-1">
            Try a different spelling or browse the list above
          </p>
        </div>
      )}

      {selectedLanguages.length > 0 && (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-12 bg-accent-coral text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.98] shadow-md"
        >
          Done ({selectedLanguages.length} selected)
        </button>
      )}
    </BottomSheet>
  );
}
