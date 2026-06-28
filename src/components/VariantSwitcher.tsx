"use client";

import { Button } from "@/components/ui/button";

interface VariantSwitcherProps {
  currentVariantIndex: number;
  totalVariants: number;
  onVariantChange: (index: number) => void;
}

export default function VariantSwitcher({
  currentVariantIndex,
  totalVariants,
  onVariantChange,
}: VariantSwitcherProps) {
  if (totalVariants <= 1) return null;

  return (
    <div className="mb-4 w-full">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: Math.min(totalVariants, 2) }).map((_, index) => (
          <Button
            key={index}
            onClick={() => onVariantChange(index)}
            variant="outline"
            className={`h-10 rounded-full text-sm font-bold shadow-sm ${
              currentVariantIndex === index
                ? "border-[#EF476F] bg-[#EF476F]/10 text-[#EF476F]"
                : "border-gray-200 bg-white text-text hover:bg-gray-50"
            }`}
          >
            Song Option {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}

