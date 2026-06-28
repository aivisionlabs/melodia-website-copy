"use client";

import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onChange: (languages: string[]) => void;
  label?: string;
  required?: boolean;
}

// Top 10 Indian languages + English as quick chips
const QUICK_LANGUAGES = [
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Gujarati",
  "Marathi",
  "Punjabi",
  "Odia",
  "English",
];

// All other languages for search
const ALL_OTHER_LANGUAGES = [
  "Assamese",
  "Urdu",
  "Sanskrit",
  "Konkani",
  "Manipuri",
  "Nepali",
  "Bodo",
  "Santhali",
  "Maithili",
  "Kashmiri",
  "French",
  "Spanish",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Chinese",
  "Korean",
  "Arabic",
  "Turkish",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Polish",
  "Czech",
  "Greek",
  "Hebrew",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
];

export function LanguageSelector({
  selectedLanguages,
  onChange,
  label = "Languages",
  required = false,
}: LanguageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filter other languages based on search query
  const filteredOtherLanguages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return ALL_OTHER_LANGUAGES.filter(
      (lang) =>
        lang.toLowerCase().includes(query) &&
        !selectedLanguages.includes(lang) &&
        !QUICK_LANGUAGES.includes(lang)
    );
  }, [searchQuery, selectedLanguages]);

  const handleLanguageToggle = (language: string) => {
    if (selectedLanguages.includes(language)) {
      onChange(selectedLanguages.filter((lang) => lang !== language));
    } else {
      onChange([...selectedLanguages, language]);
    }
    // Clear search after selection
    if (showSearch) {
      setSearchQuery("");
    }
  };

  const handleRemove = (language: string) => {
    onChange(selectedLanguages.filter((lang) => lang !== language));
  };

  const handleSearchAdd = (language: string) => {
    handleLanguageToggle(language);
    setSearchQuery("");
  };

  const handleCustomAdd = () => {
    const trimmed = searchQuery.trim();
    if (trimmed && !selectedLanguages.includes(trimmed)) {
      onChange([...selectedLanguages, trimmed]);
      setSearchQuery("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected Languages Display */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
            >
              {lang}
              <button
                type="button"
                onClick={() => handleRemove(lang)}
                className="ml-1 hover:text-yellow-900 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Quick Languages as Chips */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">
          Quick Select
        </h4>
        <div className="flex flex-wrap gap-2">
          {QUICK_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageToggle(lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-yellow-600 text-white border-2 border-yellow-700"
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search for Other Languages */}
      <div className="mt-3">
        {showSearch ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    e.preventDefault();
                    // If there's a filtered result, add the first one
                    if (filteredOtherLanguages.length > 0) {
                      handleSearchAdd(filteredOtherLanguages[0]);
                    } else {
                      // Otherwise, add as custom language
                      handleCustomAdd();
                    }
                  } else if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="Search or type a language name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-gray-900"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                {filteredOtherLanguages.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {filteredOtherLanguages.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleSearchAdd(lang)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() && !selectedLanguages.includes(searchQuery.trim()) ? (
                  <div className="p-3">
                    <button
                      type="button"
                      onClick={handleCustomAdd}
                      className="w-full text-left px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 rounded-md border border-yellow-200 transition-colors"
                    >
                      + Add &quot;{searchQuery.trim()}&quot; as custom language
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel search
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="inline-flex items-center gap-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
          >
            <Search className="h-4 w-4" />
            Search for other languages
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Select languages for this song. Click chips to select/deselect, or search for other languages.
      </p>
    </div>
  );
}

