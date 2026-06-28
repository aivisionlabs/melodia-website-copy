"use client";

import { Check } from "lucide-react";
import { PACKAGES } from "./create-page-constants";

type Package = (typeof PACKAGES)[number];

export function PackageCard({
  pkg,
  selected,
  onSelect,
  compact = false,
}: {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const discount = Math.round((1 - pkg.price / pkg.originalPrice) * 100);
  const accentBorder =
    pkg.id === "package_1"
      ? "border-primary-yellow"
      : pkg.id === "package_2"
        ? "border-accent-coral"
        : "border-text-teal";
  const accentBg =
    pkg.id === "package_1"
      ? "bg-primary-yellow/10"
      : pkg.id === "package_2"
        ? "bg-accent-coral/8"
        : "bg-text-teal/5";
  const badgeCls =
    pkg.id === "package_1"
      ? "bg-primary-yellow text-text-teal"
      : pkg.id === "package_2"
        ? "bg-accent-coral text-white"
        : "bg-text-teal text-white";
  const accentBar =
    pkg.id === "package_1"
      ? "bg-primary-yellow"
      : pkg.id === "package_2"
        ? "bg-accent-coral"
        : "bg-text-teal";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full h-full text-left rounded-2xl border-2 ${compact ? "p-3" : "p-4"} transition-all duration-200 active:scale-[0.99] flex flex-col ${
        selected
          ? `${accentBorder} ${accentBg} shadow-md`
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {pkg.popular && (
        <span className={`absolute -top-1.5 left-4 bg-accent-coral text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm ${compact ? "scale-90 origin-left" : ""}`}>
          MOST POPULAR
        </span>
      )}

      <div className={`flex items-start justify-between gap-2 ${compact ? "" : "mb-2"}`}>
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-xl leading-none flex-shrink-0 mt-0.5">
            {pkg.emoji}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-bold font-heading text-text-teal leading-tight block">
              {pkg.name}
            </span>
            <span className="text-[11px] text-text-teal/50 block">
              {pkg.tagline}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-bold font-heading text-text-teal leading-tight">
            ₹{pkg.price}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className="text-xs text-text-teal/35 line-through">
              ₹{pkg.originalPrice}
            </span>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
              {discount}% off
            </span>
          </div>
        </div>
      </div>

      {!compact && selected && (
        <div className="mb-2">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}
          >
            ✓ Selected
          </span>
        </div>
      )}

      {!compact && (
        <div className="space-y-1">
          {pkg.features.map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-2 h-2 text-green-600" strokeWidth={3} />
              </div>
              <span className="text-[11px] text-text-teal/65">{f}</span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl ${accentBar}`}
        />
      )}
    </button>
  );
}
