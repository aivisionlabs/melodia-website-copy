/* eslint-disable @next/next/no-img-element */
"use client";

import { Check } from "lucide-react";
import {
  ALL_OCCASIONS,
  OCCASION_EMOJIS,
  OCCASION_THUMBNAILS,
} from "./create-page-constants";
import { BottomSheet } from "./bottom-sheet";

export function CreatePageOccasionSheet({
  isOpen,
  onClose,
  occasion,
  customOccasion,
  onOccasionSelect,
  onCustomOccasionChange,
  onConfirmOther,
  occasions = ALL_OCCASIONS,
}: {
  isOpen: boolean;
  onClose: () => void;
  occasion: string;
  customOccasion: string;
  onOccasionSelect: (occ: string) => void;
  onCustomOccasionChange: (value: string) => void;
  onConfirmOther: () => void;
  occasions?: string[];
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="What's the occasion?"
    >
      <div className="grid grid-cols-3 gap-3">
        {occasions.map((occ) => {
          const isSelected = occasion === occ;
          return (
            <button
              key={occ}
              type="button"
              onClick={() => onOccasionSelect(occ)}
              className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all duration-150 active:scale-[0.95] ${
                isSelected
                  ? "bg-accent-coral border-accent-coral shadow-md"
                  : "bg-white border-gray-100 hover:border-gray-300"
              }`}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Check
                    className="w-2.5 h-2.5 text-accent-coral"
                    strokeWidth={3.5}
                  />
                </span>
              )}
              <div className="w-full max-w-[84px] aspect-[1.4] mb-1.5 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
                {OCCASION_THUMBNAILS[occ] ? (
                  <img
                    src={OCCASION_THUMBNAILS[occ]}
                    alt={occ}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl leading-none">
                    {OCCASION_EMOJIS[occ] || "✨"}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold font-heading leading-tight ${
                  isSelected ? "text-white" : "text-text-teal"
                }`}
              >
                {occ}
              </span>
            </button>
          );
        })}
      </div>

      {occasion === "Other" && (
        <div className="mt-5">
          <input
            type="text"
            value={customOccasion}
            onChange={(e) => onCustomOccasionChange(e.target.value)}
            placeholder="e.g., Graduation, Just because..."
            autoFocus
            className="w-full h-13 px-4 py-3.5 bg-white border-2 border-primary-yellow rounded-2xl text-text-teal placeholder-text-teal/40 outline-none text-sm font-semibold"
          />
          <button
            type="button"
            onClick={onConfirmOther}
            className="mt-3 w-full h-12 bg-accent-coral text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            Confirm
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
