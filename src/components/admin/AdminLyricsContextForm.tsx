"use client";

import { LanguageSelector } from "@/components/admin/LanguageSelector";
import { ALL_OCCASIONS } from "@/app/(app)/create/_components/create-page-constants";

export interface AdminLyricsContextFormProps {
  /** Recipient (Name & relationship) */
  recipientDetails: string;
  onRecipientDetailsChange: (value: string) => void;
  /** Occasion (e.g. Birthday, Wedding) */
  occasion: string;
  onOccasionChange: (value: string) => void;
  /** Song story / personalization details */
  songStory: string;
  onSongStoryChange: (value: string) => void;
  /** Mood, comma-separated in UI */
  mood: string;
  onMoodChange: (value: string) => void;
  /** Language mode: selector (multi) or single text input */
  languageMode: "selector" | "input";
  /** When languageMode is "selector" */
  selectedLanguages?: string[];
  onSelectedLanguagesChange?: (languages: string[]) => void;
  /** When languageMode is "input" */
  language?: string;
  onLanguageChange?: (value: string) => void;
  /** Whether recipient field is required (e.g. true on generate-lyrics, false if optional elsewhere) */
  recipientRequired?: boolean;
  /**
   * Occasion: free text, or the same list as the public /create page (drives template categories).
   * @default "text"
   */
  occasionMode?: "text" | "select";
  /** When true, mood input is disabled (e.g. when a persona is selected) */
  moodDisabled?: boolean;
  /** Optional class for the wrapper */
  className?: string;
}

const inputClass =
  "mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-gray-900 px-3 py-2";
const labelClass = "block text-sm font-medium text-gray-700";
const hintClass = "mt-1 text-sm text-gray-500";

export function AdminLyricsContextForm({
  recipientDetails,
  onRecipientDetailsChange,
  occasion,
  onOccasionChange,
  songStory,
  onSongStoryChange,
  mood,
  onMoodChange,
  languageMode,
  selectedLanguages = [],
  onSelectedLanguagesChange,
  language = "",
  onLanguageChange,
  recipientRequired = true,
  occasionMode = "text",
  moodDisabled = false,
  className = "",
}: AdminLyricsContextFormProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <label htmlFor="admin-lyrics-recipientDetails" className={labelClass}>
          Recipient (Name &amp; Relationship) {recipientRequired ? "*" : ""}
        </label>
        <input
          id="admin-lyrics-recipientDetails"
          type="text"
          value={recipientDetails}
          onChange={(e) => onRecipientDetailsChange(e.target.value)}
          placeholder="e.g. Alex, my brother"
          required={recipientRequired}
          className={inputClass}
        />
        <p className={hintClass}>
          Include name and relationship (e.g. &quot;Alex, my brother&quot;).
        </p>
      </div>

      <div>
        <label
          htmlFor="admin-lyrics-occasion"
          className={labelClass}
        >
          Occasion
        </label>
        {occasionMode === "select" ? (
          <select
            id="admin-lyrics-occasion"
            value={
              ALL_OCCASIONS.includes(occasion) ? occasion : "Kids Birthday"
            }
            onChange={(e) => onOccasionChange(e.target.value)}
            className={inputClass}
          >
            {ALL_OCCASIONS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="admin-lyrics-occasion"
            type="text"
            value={occasion}
            onChange={(e) => onOccasionChange(e.target.value)}
            placeholder="e.g. Birthday, Wedding anniversary"
            className={inputClass}
          />
        )}
        {occasionMode === "select" && (
          <p className={hintClass}>
            Template songs below follow this occasion (library categories on /create).
          </p>
        )}
      </div>

      {languageMode === "selector" && onSelectedLanguagesChange && (
        <div>
          <LanguageSelector
            selectedLanguages={selectedLanguages}
            onChange={onSelectedLanguagesChange}
            label="Languages"
            required
          />
        </div>
      )}

      {languageMode === "input" && onLanguageChange && (
        <div>
          <label htmlFor="admin-lyrics-language" className={labelClass}>
            Language
          </label>
          <input
            id="admin-lyrics-language"
            type="text"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            placeholder="e.g. English, Hindi"
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="admin-lyrics-songStory" className={labelClass}>
          Song Story
        </label>
        <textarea
          id="admin-lyrics-songStory"
          rows={4}
          value={songStory}
          onChange={(e) => onSongStoryChange(e.target.value)}
          placeholder="Optional: Share a short story or details to personalize the song..."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="admin-lyrics-mood" className={labelClass}>
          Mood
        </label>
        <input
          id="admin-lyrics-mood"
          type="text"
          value={mood}
          onChange={(e) => onMoodChange(e.target.value)}
          placeholder="e.g. joyful, romantic, nostalgic (comma-separated)"
          disabled={moodDisabled}
          className={inputClass}
        />
        {moodDisabled && (
          <p className={hintClass}>Disabled when a persona is selected.</p>
        )}
      </div>
    </div>
  );
}
