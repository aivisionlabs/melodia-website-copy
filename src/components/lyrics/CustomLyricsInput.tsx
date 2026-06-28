/**
 * Custom Lyrics Input Component
 * Form for users to input their own lyrics.
 * Song title is derived from the "for" field and occasion (not asked here).
 */

"use client";

interface CustomLyricsInputProps {
  customLyricsInput: string;
  onLyricsChange: (value: string) => void;
}

export default function CustomLyricsInput({
  customLyricsInput,
  onLyricsChange,
}: CustomLyricsInputProps) {
  return (
    <div className="space-y-4 mb-6">
      <div>
        <label className="block text-sm font-semibold text-text-teal mb-2">
          Your Lyrics
        </label>
        <textarea
          value={customLyricsInput}
          onChange={(e) => onLyricsChange(e.target.value)}
          maxLength={2500}
          className="w-full min-h-64 p-4 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent-coral focus:border-transparent"
          rows={16}
          placeholder={`Enter your lyrics here... (minimum 50 characters)

Example:
Verse 1
Your name here, you light up my world
Every moment with you is a dream

Chorus
Forever and always, my love
You're the one who makes me smile`}
        />
        <p className={`text-xs mt-2 ${customLyricsInput.length > 2300 ? 'text-red-500' : 'text-gray-500'}`}>
          {customLyricsInput.length} / 2500 characters (minimum 50 required)
        </p>
      </div>
    </div>
  );
}
