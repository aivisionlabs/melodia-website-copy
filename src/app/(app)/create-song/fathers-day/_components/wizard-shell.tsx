"use client";

import { ArrowLeft } from "lucide-react";
import { TOTAL_STEPS } from "./fathers-day-wizard-context";
import type { ReactNode } from "react";

interface WizardShellProps {
  step: number;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  children: ReactNode;
  onSkip?: () => void;
  skipLabel?: string;
}

export function WizardShell({
  step,
  onBack,
  onContinue,
  canContinue,
  children,
  onSkip,
  skipLabel = "Skip this step",
}: WizardShellProps) {
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-secondary-cream font-body text-text-teal">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-text-teal/10 bg-secondary-cream/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="text-text-teal transition-opacity hover:opacity-80 flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 mx-4">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-coral rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <span className="text-xs font-bold text-accent-coral whitespace-nowrap flex-shrink-0">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-30 border-t border-text-teal/10 bg-secondary-cream/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full h-14 rounded-full bg-accent-coral text-base font-bold text-white shadow-[0_6px_24px_rgba(239,71,111,0.45)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue →
          </button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-3 block w-full text-center text-sm font-medium text-text-teal/55 underline underline-offset-4 decoration-text-teal/25 transition-colors hover:text-text-teal/80"
            >
              {skipLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
