"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useFathersDayWizard } from "./fathers-day-wizard-context";
import { WizardShell } from "./wizard-shell";

const SUPERPOWERS = [
  {
    id: "The Newspaper & Chai King",
    icon: "📰",
    label: "The Newspaper & Chai King",
    description: "Found in his natural habitat every morning.",
  },
  {
    id: "The Human GPS",
    icon: "🗺️",
    label: "The Human GPS",
    description: '"I know a shortcut" (it takes 20 mins longer).',
  },
  {
    id: "The Secret Banker",
    icon: "💰",
    label: "The Secret Banker",
    description: '"Don\'t tell your mom I gave you this."',
  },
  {
    id: "The Master Fixer",
    icon: "🔧",
    label: "The Master Fixer",
    description: "Can repair anything with just a screwdriver.",
  },
];

const SUPERPOWER_IDS = new Set(SUPERPOWERS.map((sp) => sp.id));

export function StepRoutine() {
  const { state, prevStep, nextStep, setSuperpower, setCatchphrase } =
    useFathersDayWizard();

  const isCardSelected = SUPERPOWER_IDS.has(state.superpower);
  const [customText, setCustomText] = useState(
    isCardSelected ? "" : state.superpower,
  );

  const canContinue = !!state.superpower || !!state.catchphrase.trim();

  return (
    <WizardShell
      step={3}
      onBack={prevStep}
      onContinue={nextStep}
      canContinue={canContinue}
    >
      {/* Hero image with overlaid title */}
      <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/occasions/fathers-day/fathers-day-favroutite-thing-step-hero.png"
          alt="Father at home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="text-2xl font-bold font-heading text-white leading-snug mb-1">
            What is his ultimate superpower?
          </h1>
          <p className="text-white/80 text-xs font-body">
            Every {state.title || "dad"} has that one thing he does better than anyone else.
          </p>
        </div>
      </div>

      {/* Superpower cards */}
      <div className="space-y-3 mb-7">
        {SUPERPOWERS.map((sp) => {
          const isSelected = state.superpower === sp.id;
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => { setCustomText(""); setSuperpower(sp.id); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? "border-accent-coral bg-accent-coral/5 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <span className="text-2xl flex-shrink-0">{sp.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-text-teal font-heading">
                  {sp.label}
                </div>
                <div className="text-xs text-text-teal/55 mt-0.5 font-body">
                  {sp.description}
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected
                    ? "border-accent-coral bg-accent-coral"
                    : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom superpower input */}
      <div className="space-y-2 mb-7">
        <label className="block text-xs font-bold uppercase tracking-widest text-text-teal/50 font-body">
          Or describe it yourself
        </label>
        <input
          type="text"
          value={customText}
          onChange={(e) => {
            const val = e.target.value;
            setCustomText(val);
            setSuperpower(val);
          }}
          placeholder="e.g., 'The Best Cook in the World'"
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
        />
      </div>

      {/* Catchphrase input */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-text-teal/50 font-body">
          A phrase he always says
        </label>
        <input
          type="text"
          value={state.catchphrase}
          onChange={(e) => setCatchphrase(e.target.value)}
          placeholder="e.g., 'Paisa ped pe ugta hai?'"
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
        />
        <p className="text-xs text-text-teal/45 italic font-body">
          Iconic quotes make the lyrics feel much more personal.
        </p>
      </div>
    </WizardShell>
  );
}
