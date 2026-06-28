"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFathersDayWizard } from "./fathers-day-wizard-context";
import { WizardShell } from "./wizard-shell";

const TITLE_OPTIONS = ["Papa", "Dad", "Appa", "Baba", "Bauji", "Dada"];

export function StepCallSign() {
  const router = useRouter();
  const { state, nextStep, setTitle } = useFathersDayWizard();
  const [customInput, setCustomInput] = useState(
    TITLE_OPTIONS.includes(state.title) ? "" : state.title,
  );

  const selectedPreset = TITLE_OPTIONS.includes(state.title) ? state.title : "";

  const handlePreset = (value: string) => {
    setTitle(value);
    setCustomInput("");
  };

  const handleCustomChange = (value: string) => {
    setCustomInput(value);
    setTitle(value);
  };

  const canContinue = !!state.title.trim();

  const handleBack = () => {
    router.back();
  };

  return (
    <WizardShell
      step={1}
      onBack={handleBack}
      onContinue={nextStep}
      canContinue={canContinue}
    >
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-heading text-text-teal leading-tight mb-2">
          What&apos;s his title in your house?
        </h1>
        <p className="text-sm text-text-teal/60 font-body">
          No first names needed. Let&apos;s lock in his official designation.
        </p>
      </section>

      {/* Hero Image */}
      <div className="mb-8 rounded-2xl overflow-hidden aspect-video shadow-sm relative">
        <Image
          src="/images/occasions/fathers-day/fathers-day-step-1.png"
          alt="Father and child"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 600px"
          priority
        />
      </div>

      {/* Chip selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-wrap gap-3 mb-5">
          {TITLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handlePreset(opt)}
              className={`px-5 py-2.5 rounded-full border text-sm font-semibold transition-all active:scale-95 ${
                selectedPreset === opt
                  ? "bg-accent-coral border-accent-coral text-white shadow-md"
                  : "border-gray-300 text-text-teal hover:border-accent-coral/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="relative">
          <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={customInput}
            onChange={(e) => handleCustomChange(e.target.value)}
            onFocus={() => {
              if (selectedPreset) setTitle(customInput);
            }}
            placeholder="Custom Title"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-4 bg-accent-coral/5 rounded-xl border-l-4 border-accent-coral">
        <span className="text-accent-coral mt-0.5">ℹ</span>
        <p className="text-xs text-text-teal/70 font-body">
          This title will be used as the rhythmic anchor throughout the song
          lyrics.
        </p>
      </div>
    </WizardShell>
  );
}
