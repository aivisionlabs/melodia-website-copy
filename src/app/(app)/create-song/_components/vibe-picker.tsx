"use client";

import { Check } from "lucide-react";
import { MOOD_CHIPS } from "@/app/(app)/create/_components/create-page-constants";
import { trackFunnelEvent } from "@/lib/analytics";

interface VibePickerProps {
  moods: string[];
  onToggleMood: (label: string) => void;
}

export function VibePicker({ moods, onToggleMood }: VibePickerProps) {
  const handleToggle = (label: string) => {
    const wasSelected = moods.includes(label);
    const nextTotal = wasSelected ? moods.length - 1 : moods.length + 1;
    trackFunnelEvent.vibeMoodToggle(label, !wasSelected, nextTotal);
    onToggleMood(label);
  };

  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-text-teal/50">
        Choose your vibe (optional)
      </p>
      <p className="mb-3 text-sm text-text-teal/60">
        Pick the moods you want — we&apos;ll match the music style for your
        song.
      </p>
      <div className="grid grid-cols-4 gap-2.5">
        {MOOD_CHIPS.map(({ label, emoji }) => {
          const isSelected = moods.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleToggle(label)}
              className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-center transition-all duration-200 ${
                isSelected
                  ? "border-accent-coral bg-accent-coral shadow-lg active:scale-[0.93]"
                  : "border-gray-200 bg-white hover:border-accent-coral/40 hover:shadow-sm active:scale-[0.93]"
              }`}
            >
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
                  <Check className="h-2 w-2 text-accent-coral" strokeWidth={3.5} />
                </span>
              )}
              <span className="text-xl leading-none">{emoji}</span>
              <span
                className={`text-[10px] font-bold leading-tight ${
                  isSelected ? "text-white" : "text-text-teal"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
