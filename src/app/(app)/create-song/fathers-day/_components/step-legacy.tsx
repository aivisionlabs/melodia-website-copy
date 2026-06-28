"use client";

import { MapPin, Home, Sparkles } from "lucide-react";
import { useFathersDayWizard } from "./fathers-day-wizard-context";
import { WizardShell } from "./wizard-shell";

export function StepLegacy() {
  const { state, prevStep, nextStep, setHometown, setCurrentCity } =
    useFathersDayWizard();

  const canContinue = !!(state.hometown.trim() || state.currentCity.trim());

  return (
    <WizardShell
      step={4}
      onBack={prevStep}
      onContinue={nextStep}
      canContinue={canContinue}
      onSkip={nextStep}
      skipLabel="Skip"
    >
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-heading text-text-teal leading-tight mb-2">
          Where did his story begin?
        </h1>
        <p className="text-sm text-text-teal/60 font-body max-w-xs mx-auto">
          We&apos;ll weave his journey into the verses. Every mile is a lyric
          earned.
        </p>
      </section>

      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden aspect-video mb-8 shadow-sm group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop"
          alt="Open road journey"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-text-teal/40 to-transparent" />
      </div>

      {/* City inputs */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4 mb-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-teal/50 mb-2 font-body">
            From (Hometown / City)
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={state.hometown}
              onChange={(e) => setHometown(e.target.value)}
              placeholder="e.g. Lucknow, UP"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-teal/50 mb-2 font-body">
            To (Current City / Family Hub)
          </label>
          <div className="relative">
            <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={state.currentCity}
              onChange={(e) => setCurrentCity(e.target.value)}
              placeholder="e.g. Mumbai, MH"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-text-teal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-coral/30 focus:border-accent-coral transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-4 bg-primary-yellow/10 rounded-xl border border-primary-yellow/30">
        <Sparkles className="w-4 h-4 text-text-teal/70 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-teal/70 font-body">
          Melodia AI will use these locations to craft local references and
          geographic metaphors in his custom song.
        </p>
      </div>
    </WizardShell>
  );
}
