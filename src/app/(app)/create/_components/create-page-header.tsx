"use client";

import { ChevronLeft } from "lucide-react";
import { CreatePageSteps, type StepItem } from "./create-page-steps";

type CreatePageHeaderProps = {
  onBack: () => void;
  steps?: StepItem[];
};

export function CreatePageHeader({ onBack, steps }: CreatePageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 bg-secondary-cream/95 backdrop-blur-md border-b border-text-teal/8"
      style={{ boxShadow: "0 1px 12px rgba(7,59,76,0.06)" }}
    >
      <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-text-teal/8 text-text-teal/60 hover:text-text-teal transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <CreatePageSteps steps={steps} variant="nav" />
        </div>
      </div>
    </header>
  );
}
