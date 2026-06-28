/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronDown } from "lucide-react";
import { OCCASION_EMOJIS, OCCASION_THUMBNAILS } from "./create-page-constants";

export function CreatePageOccasionSection({
  occasion,
  customOccasion,
  occasionError,
  onOpenSheet,
}: {
  occasion: string;
  customOccasion: string;
  occasionError?: string;
  onOpenSheet: () => void;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold font-heading text-text-teal">
          What&apos;s the occasion?
        </h2>
      </div>
      <button
        type="button"
        onClick={onOpenSheet}
        className={`w-full flex items-center justify-between gap-2 h-14 px-4 bg-white border-2 rounded-2xl transition-all active:scale-[0.98] shadow-sm ${
          occasionError
            ? "border-red-400 bg-red-50"
            : occasion
              ? "border-accent-coral/40"
              : "border-gray-200 hover:border-text-teal/30"
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          {occasion && (
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
              {OCCASION_THUMBNAILS[occasion] ? (
                <img
                  src={OCCASION_THUMBNAILS[occasion]}
                  alt={occasion}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">
                  {OCCASION_EMOJIS[occasion] || "✨"}
                </span>
              )}
            </div>
          )}
          <span
            className={`text-base font-semibold font-heading truncate ${
              occasion
                ? occasionError
                  ? "text-red-500"
                  : "text-text-teal"
                : "text-text-teal/40"
            }`}
          >
            {occasion
              ? occasion === "Other" && customOccasion.trim()
                ? customOccasion.trim()
                : occasion
              : "Select Occasion"}
          </span>
        </span>
        <ChevronDown className="w-5 h-5 text-text-teal/35 flex-shrink-0" />
      </button>
      {occasionError && (
        <p className="mt-2 text-xs text-red-500 font-medium px-1">
          ⚠ {occasionError}
        </p>
      )}
    </div>
  );
}
