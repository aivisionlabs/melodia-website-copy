"use client";

import { ChevronRight } from "lucide-react";

export type StepItem = {
  num: string;
  label: string;
  /** Current step in the flow */
  active?: boolean;
  /** Finished step (shown in success styling; ignored if `active` is true) */
  completed?: boolean;
};

export type CreatePageStepsProps = {
  steps?: StepItem[];
  /** `nav`: compact row for top bar beside back button; `page`: default spacing below package picker */
  variant?: "page" | "nav";
};

export function CreatePageSteps({ steps, variant = "page" }: CreatePageStepsProps) {
  const displaySteps: StepItem[] = steps ?? [
    { num: "1", label: "Share Details", active: true },
    { num: "2", label: "Pay", active: false },
    { num: "3", label: "Review & Download", active: false },
  ];

  return (
    <div
      className={`flex items-center min-w-0 overflow-x-auto no-scrollbar -mx-1 px-1 ${
        variant === "nav" ? "mb-0" : "mb-7"
      }`}
    >
      {displaySteps.map((step, i) => {
        const isActive = !!step.active;
        const isCompleted = !!step.completed && !isActive;
        const badgeClass = isActive
          ? "bg-accent-coral text-white"
          : isCompleted
            ? "bg-success text-success-foreground"
            : "bg-gray-200 text-text-teal/50";
        const labelClass = isActive
          ? "text-text-teal"
          : isCompleted
            ? "text-success font-bold"
            : "text-text-teal/40";
        return (
          <div key={i} className="flex items-center flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${badgeClass}`}
              >
                {step.num}
              </span>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${labelClass}`}
              >
                {step.label}
              </span>
            </div>
            {i < displaySteps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-500 mx-1 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
