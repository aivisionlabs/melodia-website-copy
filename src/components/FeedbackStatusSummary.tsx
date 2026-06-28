"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface FeedbackStatusSummaryProps {
  feedbackStatus: "loved" | "not_liked";
  positiveAspects?: string[];
  reasonLabels?: string[];
  otherText?: string | null;
  onUpdateFeedback: () => void;
  updateDisabled?: boolean;
}

export default function FeedbackStatusSummary({
  feedbackStatus,
  positiveAspects = [],
  reasonLabels = [],
  otherText = null,
  onUpdateFeedback,
  updateDisabled = false,
}: FeedbackStatusSummaryProps) {
  return (
    <div className="w-full mt-6 mb-4 pb-4 border-t border-gray-200 pt-4">
      <div className="flex flex-col items-center justify-center gap-2 text-sm">
        {feedbackStatus === "loved" ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#EF476F]" />
              <span className="text-[#5C4B52] font-medium">Loved the song</span>
            </div>
            {positiveAspects.length > 0 && (
              <div className="mt-2 px-4 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Liked for:</p>
                <p className="text-xs text-gray-700">{positiveAspects.join(", ")}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 font-medium">Did not like it much</span>
            </div>
            {reasonLabels.length > 0 && (
              <div className="mt-2 px-4 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Reason:</p>
                <p className="text-xs text-gray-700">{reasonLabels.join(", ")}</p>
                {otherText && (
                  <p className="text-xs text-gray-700 mt-1 italic">{otherText}</p>
                )}
              </div>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onUpdateFeedback}
          disabled={updateDisabled}
          className="mt-3 text-xs font-medium text-text-teal/65 underline underline-offset-2 hover:text-text-teal disabled:opacity-60"
        >
          Update feedback
        </button>
      </div>
    </div>
  );
}
