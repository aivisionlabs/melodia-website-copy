import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { PACKAGES } from "@/app/(app)/create/_components/create-page-constants";
import type { PricingPlanUi } from "./pricing-plan-ui";

function formatInr(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

/** Inline bolt (replaces lucide Zap) — avoids RSC/Turbopack cases where `Zap` resolved undefined. */
function InstantBoltIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

type PackageRow = (typeof PACKAGES)[number];

export function PricingPlanCard({
  pkg,
  ui,
  href,
  disabled,
  disabledHint,
}: {
  pkg: PackageRow;
  ui: PricingPlanUi;
  href: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const accentBar =
    ui.accent === "yellow"
      ? "bg-primary-yellow"
      : ui.accent === "coral"
        ? "bg-accent-coral"
        : "bg-gradient-to-r from-primary-yellow to-accent-coral";

  const ctaMotion =
    "motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:scale-105";

  const cardMotion =
    "motion-safe:hover:shadow-xl motion-safe:hover:scale-[1.02] transition-all duration-300";

  const linkClasses =
    ui.accent === "coral"
      ? `w-full h-11 text-sm bg-accent-coral hover:bg-accent-coral/90 text-white font-heading font-bold rounded-full shadow-coral hover:shadow-lg flex items-center justify-center gap-1.5 ${ctaMotion}`
      : `w-full h-11 text-sm bg-primary-yellow hover:bg-primary-yellow/90 text-text-teal font-heading font-bold rounded-full shadow-elegant hover:shadow-glow flex items-center justify-center gap-1.5 ${ctaMotion}`;

  const ariaCta = `${ui.ctaLabel}: ${pkg.name}, ${formatInr(pkg.price)}`;

  return (
    <div
      className={`flex-shrink-0 w-[76vw] min-w-[260px] sm:w-80 lg:w-auto rounded-3xl bg-white border border-primary-yellow/25 shadow-card ${cardMotion} flex flex-col overflow-hidden group relative`}
      style={{ scrollSnapAlign: "start" }}
    >
      {pkg.popular ? (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-accent-coral to-red-400 text-white font-heading font-bold text-[10px] sm:text-xs px-4 py-1 rounded-b-xl shadow-coral whitespace-nowrap">
            ⭐ Most Preferred
          </span>
        </div>
      ) : null}

      <div className={`h-1.5 w-full ${accentBar}`} />

      <div className={`p-6 sm:p-7 flex flex-col flex-1 ${pkg.popular ? "pt-8" : ""}`}>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-heading font-bold text-text-teal">
                {formatInr(pkg.price)}
              </span>
              <span className="text-xs font-body text-text-teal/35 line-through">
                {formatInr(pkg.originalPrice)}
              </span>
            </div>
            <span className="text-xs font-bold font-body bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
              Save {formatInr(pkg.originalPrice - pkg.price)}
            </span>
          </div>
          <h3 className="text-xl font-heading font-bold text-text-teal">
            {pkg.name}
          </h3>
          <p className="text-xs font-body text-text-teal/50 mt-0.5 italic">
            {pkg.tagline}
          </p>
        </div>

        {ui.delivery === "minutes" ? (
          <div className="flex items-center gap-1.5 bg-primary-yellow/12 text-text-teal text-sm font-semibold font-body px-3 py-1.5 rounded-lg w-fit mb-5">
            <InstantBoltIcon className="w-3.5 h-3.5 text-primary-yellow shrink-0" />
            Song ready in minutes
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-primary-yellow/12 text-text-teal text-sm font-semibold font-body px-3 py-1.5 rounded-lg w-fit mb-5">
            <Clock className="w-3.5 h-3.5 text-text-teal/60" />
            Ready within 24 hours
          </div>
        )}

        <ul className="space-y-2.5 mb-6 flex-1">
          {pkg.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 text-sm font-body text-text-teal/85"
            >
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              {f}
            </li>
          ))}
        </ul>

        {disabled ? (
          <div>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full h-11 text-sm bg-primary-yellow/50 text-text-teal font-heading font-bold rounded-full cursor-not-allowed opacity-60 flex items-center justify-center gap-1.5"
            >
              Unavailable{" "}
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
            </button>
            {disabledHint ? (
              <p className="text-[10px] text-text-teal/55 mt-1.5 text-center font-body">
                {disabledHint}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <Link
              href={href}
              data-pricing-analytics="package_select"
              data-package-id={pkg.id}
              data-package-name={pkg.name}
              data-package-price={String(pkg.price)}
              aria-label={ariaCta}
              className={linkClasses}
            >
              {ui.ctaLabel}{" "}
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
            </Link>
            {ui.trustNote ? (
              <p className="text-[11px] text-text-teal/50 mt-2 text-center font-body">
                {ui.trustNote}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
