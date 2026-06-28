"use client";

import {
  Sparkles,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Music2,
} from "lucide-react";

interface ReviewRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
  formData: {
    recipientDetails: string;
    occasion: string;
    customOccasion: string;
    languages: string;
    moods: string[];
    customMood: string;
    sourceSongPreview?: {
      id: number;
      title: string;
      imageUrl?: string | null;
    } | null;
  };
}

function buildSongBrief(formData: ReviewRequestPopupProps["formData"]): string {
  const {
    recipientDetails,
    occasion,
    customOccasion,
    languages,
    moods,
    customMood,
    sourceSongPreview,
  } = formData;

  const displayOccasion = occasion === "Other" ? customOccasion : occasion;
  const recipient = recipientDetails?.trim() || "someone special";

  // Build vibe descriptor
  let vibePhrase = "";
  if (sourceSongPreview) {
    vibePhrase = `inspired by the style of "${sourceSongPreview.title}"`;
  } else {
    const effectiveMoods =
      moods.includes("Other") && customMood
        ? [customMood]
        : moods.filter((m) => m !== "Other");

    if (effectiveMoods.length === 1) {
      vibePhrase = `with a ${effectiveMoods[0].toLowerCase()} vibe`;
    } else if (effectiveMoods.length === 2) {
      vibePhrase = `with a ${effectiveMoods[0].toLowerCase()} and ${effectiveMoods[1].toLowerCase()} vibe`;
    } else if (effectiveMoods.length > 2) {
      const last = effectiveMoods[effectiveMoods.length - 1];
      const rest = effectiveMoods.slice(0, -1).map((m) => m.toLowerCase());
      vibePhrase = `with a ${rest.join(", ")} and ${last.toLowerCase()} vibe`;
    }
  }

  const langPhrase =
    languages && languages !== "English" ? `in ${languages}` : "in English";

  const parts = [
    `We're crafting a personalised ${displayOccasion} song ${langPhrase} for ${recipient}`,
    vibePhrase ? `${vibePhrase}.` : ".",
  ];

  return parts.join(" — ").replace(" — .", ".");
}

export function ReviewRequestPopup({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  formData,
}: ReviewRequestPopupProps) {
  if (!isOpen) return null;

  const {
    occasion,
    customOccasion,
    languages,
    moods,
    customMood,
    sourceSongPreview,
  } = formData;

  const displayOccasion = occasion === "Other" ? customOccasion : occasion;
  const effectiveMoods =
    moods.includes("Other") && customMood
      ? [customMood]
      : moods.filter((m) => m !== "Other");

  const brief = buildSongBrief(formData);

  // Quick-glance chips
  const chips: { emoji: string; label: string }[] = [
    { emoji: "🎉", label: displayOccasion },
    { emoji: "🗣️", label: languages || "English" },
    ...(sourceSongPreview
      ? [{ emoji: "🎙️", label: "Template style" }]
      : effectiveMoods.map((m) => ({ emoji: "🎵", label: m }))),
  ].filter((c) => c.label);

  return (
    <div className="fixed inset-0 z-[65]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-secondary-cream rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-text-teal/55 hover:text-text-teal transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-sm font-semibold">Edit</span>
          </button>

          {/* Progress */}
          <div className="flex items-center overflow-x-auto no-scrollbar">
            {[
              { num: "1", label: "Share Details", active: true },
              { num: "2", label: "Review Lyrics", active: false },
              { num: "3", label: "Pay & Download Song", active: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${step.active ? "bg-accent-coral text-white" : "bg-gray-200 text-text-teal/50"}`}
                  >
                    {step.num}
                  </span>
                  <span
                    className={`text-[10px] font-semibold whitespace-nowrap ${step.active ? "text-text-teal" : "text-text-teal/40"}`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < 2 && (
                  <ChevronRight className="w-4 h-4 text-gray-500 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
          {/* Sparkle icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-accent-coral/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-accent-coral" />
            </div>
          </div>

          {/* Natural language brief card */}
          <div className="relative bg-white rounded-3xl border border-gray-100 px-5 pt-5 pb-5 mb-4 shadow-sm overflow-hidden">
            {/* Decorative quote mark */}
            <span className="absolute -top-2 -left-1 text-7xl text-accent-coral/8 font-serif leading-none select-none pointer-events-none">
              &ldquo;
            </span>

            <p className="relative text-[15px] font-semibold text-text-teal leading-relaxed z-10">
              {brief}
            </p>

            {/* Template song mini card inside brief */}
            {sourceSongPreview && (
              <div className="mt-3 flex items-center gap-2.5 bg-secondary-cream rounded-2xl px-3 py-2.5 border border-gray-100">
                {sourceSongPreview.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sourceSongPreview.imageUrl}
                    alt={sourceSongPreview.title}
                    className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-accent-coral/10 flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-4 h-4 text-accent-coral" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-teal/35 mb-0.5">
                    Style template
                  </p>
                  <p className="text-xs font-bold text-text-teal truncate">
                    {sourceSongPreview.title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick-glance chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {chips.map(({ emoji, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-text-teal shadow-sm"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Next hint */}
          <p className="text-center text-[11px] text-text-teal/40 mb-3">
            Next — enter your WhatsApp to receive your song ✨
          </p>

          {/* CTA */}
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full h-14 bg-accent-coral text-white rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.45)" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span className="text-base font-bold text-white">
                  Creating your song...
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-white">
                  Looks Good, Let&apos;s Go!
                </span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
