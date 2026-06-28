"use client";

import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface RatingModalProps {
  show: boolean;
  selectedRating: number;
  onRatingChange: (rating: number) => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export default function RatingModal({
  show,
  selectedRating,
  onRatingChange,
  onSubmit,
  onSkip,
}: RatingModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl font-bold text-text">
            Rate This Song (Optional)
          </h3>
          <button aria-label="Close" onClick={onSkip} className="p-2">
            ✕
          </button>
        </div>
        <p className="font-display text-xl text-text mb-6">
          How much did you like this song?
        </p>

        {/* Star Rating */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => onRatingChange(rating)}
              className="transition-transform hover:scale-110 active:scale-95"
              aria-label={`Rate ${rating} star${rating !== 1 ? "s" : ""}`}
            >
              <Star
                size={48}
                className={`${
                  selectedRating >= rating
                    ? "fill-[#FFD166] text-[#FFD166]"
                    : "fill-none text-gray-300"
                } transition-colors duration-200`}
              />
            </button>
          ))}
        </div>

        {selectedRating > 0 && (
          <p className="text-center text-sm text-text/60 mb-6">
            {selectedRating === 5 && "Perfect! 🌟"}
            {selectedRating === 4 && "Great! ⭐"}
            {selectedRating === 3 && "Good! 👍"}
            {selectedRating === 2 && "Okay 👍"}
            {selectedRating === 1 && "Fair 👍"}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 h-14 border-text/20 font-display font-bold text-lg rounded-full"
            onClick={onSkip}
          >
            Skip
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300"
            onClick={onSubmit}
            disabled={selectedRating === 0}
          >
            {selectedRating === 0 ? "Select Rating" : "Submit Rating"}
          </Button>
        </div>
      </div>
    </div>
  );
}

