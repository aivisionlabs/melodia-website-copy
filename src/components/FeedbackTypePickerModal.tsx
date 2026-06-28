"use client";

import { Button } from "@/components/ui/button";

interface FeedbackTypePickerModalProps {
  show: boolean;
  onClose: () => void;
  onChooseNotSoMuch: () => void;
  onChooseLovedThis: () => void;
}

export default function FeedbackTypePickerModal({
  show,
  onClose,
  onChooseNotSoMuch,
  onChooseLovedThis,
}: FeedbackTypePickerModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-text">
            Update feedback
          </h3>
          <button aria-label="Close" onClick={onClose} className="p-2">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-text/70">
          What do you feel about this version now?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-full border border-gray-200 bg-white font-semibold text-text-teal"
            onClick={onChooseNotSoMuch}
          >
            Not So Much
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full bg-[#EF476F] font-semibold text-white hover:bg-[#EF476F]/90"
            onClick={onChooseLovedThis}
          >
            Loved This
          </Button>
        </div>
      </div>
    </div>
  );
}
