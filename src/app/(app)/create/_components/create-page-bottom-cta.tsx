"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import type { PackageId } from "./create-page-constants";
import { PACKAGES } from "./create-page-constants";

export function CreatePageBottomCta({
  selectedPackage,
  error,
  canSubmit,
  isSubmitting,
  buttonLabel = "Review Lyrics",
  submittingLabel = "Submitting...",
  onReviewClick,
}: {
  selectedPackage: PackageId | undefined;
  error: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  buttonLabel?: string;
  submittingLabel?: string;
  onReviewClick: () => void;
}) {
  const selectedPkg = PACKAGES.find((p) => p.id === selectedPackage);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-secondary-cream/96 backdrop-blur-md border-t border-text-teal/8"
      style={{
        boxShadow: "0 -4px 24px rgba(7,59,76,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* {selectedPkg && (
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-teal">
                {selectedPkg.emoji} {selectedPkg.name}
              </span>
              <span className="text-xs text-text-teal/35 line-through">
                ₹{selectedPkg.originalPrice}
              </span>
              <span className="text-sm font-bold text-accent-coral">
                ₹{selectedPkg.price}
              </span>
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Save{" "}
              {Math.round(
                (1 - selectedPkg.price / selectedPkg.originalPrice) * 100,
              )}
              %
            </span>
          </div>
        )} */}

        {error && (
          <p className="text-[11px] text-red-500 font-medium mb-2.5 text-center px-1">
            ⚠ {error}
          </p>
        )}

        {!canSubmit && !selectedPkg && (
          <p className="text-[11px] text-text-teal/45 mb-2.5 text-center font-body">
            Choose a plan above to get started
          </p>
        )}
        {!canSubmit && selectedPkg && (
          <p className="text-[11px] text-text-teal/45 mb-2.5 text-center font-body">
            Fill in the required fields above to continue
          </p>
        )}

        <button
          type="button"
          onClick={canSubmit && !isSubmitting ? onReviewClick : undefined}
          aria-disabled={!canSubmit || isSubmitting}
          className={`w-full h-14 rounded-full font-bold text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5
              ${
                canSubmit || isSubmitting
                  ? "bg-accent-coral text-white active:scale-[0.98] cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          style={
            canSubmit || isSubmitting
              ? { boxShadow: "0 6px 24px rgba(239,71,111,0.40)" }
              : {}
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-white">{submittingLabel}</span>
            </>
          ) : (
            <>
              <span className={canSubmit ? "text-white" : "text-gray-400"}>
                {buttonLabel}
              </span>
              <ArrowRight
                className={`w-5 h-5 ${canSubmit ? "text-white" : "text-gray-400"}`}
                strokeWidth={2.5}
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
