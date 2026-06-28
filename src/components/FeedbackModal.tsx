"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface FeedbackModalProps {
  show: boolean;
  reasons: { code: string; label: string }[];
  onSubmit: (reason: string, otherText: string) => void;
  onClose: () => void;
}

export default function FeedbackModal({
  show,
  reasons,
  onSubmit,
  onClose,
}: FeedbackModalProps) {
  const [feedbackReason, setFeedbackReason] = useState<string>("");
  const [feedbackOther, setFeedbackOther] = useState<string>("");

  if (!show) return null;

  const handleSubmit = () => {
    onSubmit(feedbackReason, feedbackOther);
    setFeedbackReason("");
    setFeedbackOther("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl font-bold text-text">
            Feedback
          </h3>
          <button aria-label="Close" onClick={onClose} className="p-2">
            ✕
          </button>
        </div>
        <p className="font-display text-xl text-text mb-4">
          What wasn&apos;t quite right?
        </p>

        <div className="space-y-2">
          {[...reasons, { code: "OTHER", label: "Other" }].map(
            ({ code, label }) => (
              <label
                key={code}
                className={`flex items-center justify-between border rounded-xl px-4 py-3 ${
                  feedbackReason === label
                    ? "border-accent bg-accent/5"
                    : "border-text/20"
                }`}
              >
                <span className="font-body text-text">{label}</span>
                <input
                  type="radio"
                  name="feedback-reason"
                  value={code}
                  checked={feedbackReason === label}
                  onChange={() => setFeedbackReason(label)}
                  className="accent-accent"
                />
              </label>
            )
          )}
        </div>

        {feedbackReason === "Other" && (
          <div className="mt-4">
            <Textarea
              placeholder="Please tell us more…"
              value={feedbackOther}
              onChange={(e) => setFeedbackOther(e.target.value)}
              className="w-full h-28 px-5 bg-white border border-text/20 rounded-lg placeholder-text/50 focus:ring-2 focus:ring-primary focus:border-transparent font-body"
            />
          </div>
        )}

        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400"
            onClick={handleSubmit}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}

