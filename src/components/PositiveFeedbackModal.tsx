"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";

interface PositiveFeedbackModalProps {
  show: boolean;
  onSubmit: (aspects: string[], otherText: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const POSITIVE_ASPECT_OPTIONS = [
  "Voice Quality",
  "Lyrics",
  "Music Composition",
  "Emotion",
  "Pronunciation",
  "Other",
];

export default function PositiveFeedbackModal({
  show,
  onSubmit,
  onClose,
  isSubmitting = false,
}: PositiveFeedbackModalProps) {
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const isOtherSelected = selectedAspects.includes("Other");

  const canSubmit = useMemo(() => {
    if (selectedAspects.length === 0) return false;
    if (isOtherSelected && !otherText.trim()) return false;
    return true;
  }, [selectedAspects, isOtherSelected, otherText]);

  if (!show) return null;

  const toggleAspect = (aspect: string) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect)
        ? prev.filter((item) => item !== aspect)
        : [...prev, aspect],
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    onSubmit(selectedAspects, otherText.trim());
    setSelectedAspects([]);
    setOtherText("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold text-text">
            Loved it
          </h3>
          <button aria-label="Close" onClick={onClose} className="p-2">
            ✕
          </button>
        </div>

        <p className="mb-4 font-display text-xl text-text">
          What did you love the most?
        </p>

        <div className="space-y-2">
          {POSITIVE_ASPECT_OPTIONS.map((label) => (
            <label
              key={label}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                selectedAspects.includes(label)
                  ? "border-accent bg-accent/5"
                  : "border-text/20"
              }`}
            >
              <span className="font-body text-text">{label}</span>
              <input
                type="checkbox"
                value={label}
                checked={selectedAspects.includes(label)}
                onChange={() => toggleAspect(label)}
                className="accent-accent"
              />
            </label>
          ))}
        </div>

        {isOtherSelected && (
          <div className="mt-4">
            <Textarea
              placeholder="Tell us what stood out..."
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="h-28 w-full rounded-lg border border-text/20 bg-white px-5 font-body placeholder-text/50 focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="h-14 w-full rounded-full bg-primary font-display text-lg font-bold text-text shadow-md hover:bg-yellow-400 disabled:opacity-60"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
