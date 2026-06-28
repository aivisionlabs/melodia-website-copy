"use client";

import { useFathersDayWizard } from "./fathers-day-wizard-context";
import { WizardShell } from "./wizard-shell";
import { Check } from "lucide-react";

const VIBES = [
  {
    id: "Nostalgic & Acoustic",
    label: "Nostalgic & Acoustic",
    emoji: "🎸",
    description: "Warm guitar, gentle nostalgia",
    image:
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop",
  },
  {
    id: "Upbeat & Celebration",
    label: "Upbeat & Celebration",
    emoji: "🎉",
    description: "Joyful, energetic, festive",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&auto=format&fit=crop",
  },
  {
    id: "Anthemic & Grand",
    label: "Anthemic & Grand",
    emoji: "🌄",
    description: "Epic, sweeping, cinematic",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop",
  },
  {
    id: "Ghazal/Semi-Classical Blend",
    label: "Ghazal / Semi-Classical",
    emoji: "🎶",
    description: "Soulful Indian classical fusion",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop",
  },
];

export function StepSoundboard() {
  const { state, prevStep, nextStep, setMusicalVibe } = useFathersDayWizard();

  return (
    <WizardShell
      step={2}
      onBack={prevStep}
      onContinue={nextStep}
      canContinue={!!state.musicalVibe}
    >
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-heading text-text-teal leading-tight mb-2">
          What&apos;s the musical vibe?
        </h1>
        <p className="text-sm text-text-teal/60 font-body">
          Select a style that matches your {state.title || "dad"}&apos;s personality.
        </p>
      </section>

      <div className="space-y-3">
        {VIBES.map((vibe) => {
          const isSelected = state.musicalVibe === vibe.id;
          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => setMusicalVibe(vibe.id)}
              className={`relative w-full rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98] ${
                isSelected ? "ring-2 ring-accent-coral" : "ring-1 ring-gray-200"
              }`}
            >
              <div className="relative h-36 sm:h-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vibe.image}
                  alt={vibe.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-end px-5 pb-4 gap-3">
                  <span className="text-2xl">{vibe.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-base font-heading leading-tight">
                      {vibe.label}
                    </div>
                    <div className="text-white/75 text-xs mt-0.5 font-body">
                      {vibe.description}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-accent-coral flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
