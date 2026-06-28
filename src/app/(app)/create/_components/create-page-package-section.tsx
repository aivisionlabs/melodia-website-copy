"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getDisplayPackageId,
  PACKAGES,
  type PackageId,
} from "./create-page-constants";
import { PackageCard } from "./package-card";
import { trackFunnelEvent, trackPixelEvent } from "@/lib/analytics";

function formatInr(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

export function CreatePagePackageSection({
  selectedPackage,
  onSelectPackage,
  packageError,
  prefilledSummary = false,
  onExpandPackageChoice,
}: {
  selectedPackage: PackageId | undefined;
  onSelectPackage: (id: PackageId) => void;
  packageError?: string;
  /** When true (URL had `?plan=`), show a compact confirmation instead of all cards. */
  prefilledSummary?: boolean;
  onExpandPackageChoice?: () => void;
}) {
  const selectedPackageForDisplay = getDisplayPackageId(selectedPackage);
  const summaryPkg =
    selectedPackageForDisplay != null
      ? PACKAGES.find((p) => p.id === selectedPackageForDisplay)
      : undefined;

  if (
    prefilledSummary &&
    summaryPkg &&
    onExpandPackageChoice &&
    selectedPackage
  ) {
    return (
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-light text-text-teal">Your package</h2>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-accent-coral hover:text-accent-coral/80 transition-colors flex items-center gap-1"
          >
            Know more <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-primary-yellow/25 bg-white shadow-card px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading font-bold text-text-teal text-base">
              {summaryPkg.name}
            </p>
            <p className="text-sm font-body text-text-teal/65 mt-0.5">
              {formatInr(summaryPkg.price)}
              {summaryPkg.popular ? (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-accent-coral">
                  Popular
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onExpandPackageChoice}
            className="text-sm font-semibold font-body text-accent-coral hover:text-accent-coral/85 shrink-0 self-start sm:self-center underline underline-offset-2"
          >
            Change package
          </button>
        </div>
        {packageError ? (
          <p className="mt-2 text-xs text-red-500 font-medium px-1">
            ⚠ {packageError}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-light text-text-teal">
          Choose your package
        </h2>
        <Link
          href="/pricing"
          className="text-xs font-semibold text-accent-coral hover:text-accent-coral/80 transition-colors flex items-center gap-1"
        >
          Know more <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex flex-col gap-3 pb-4">
        {PACKAGES.map((pkg) => (
          <div key={pkg.id} className="w-full">
            <PackageCard
              pkg={pkg}
              selected={selectedPackageForDisplay === pkg.id}
              onSelect={() => {
                trackFunnelEvent.packageSelect(pkg.name, pkg.price, pkg.id);
                trackPixelEvent.addToCart(pkg.name, pkg.price);
                onSelectPackage(pkg.id);
              }}
              compact={true}
            />
          </div>
        ))}
      </div>
      {packageError && (
        <p className="mt-2 text-xs text-red-500 font-medium px-1">
          ⚠ {packageError}
        </p>
      )}
    </div>
  );
}
