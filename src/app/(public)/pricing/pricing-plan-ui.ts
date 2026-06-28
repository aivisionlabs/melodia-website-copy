import type { PackageId } from "@/app/(app)/create/_components/create-page-constants";

export type PricingCardAccent = "yellow" | "coral" | "gradient";

export type PricingPlanUi = {
  accent: PricingCardAccent;
  delivery: "minutes" | "hours24";
  ctaLabel: string;
  tableCtaLabel: string;
  /** Short reassurance line shown below the CTA button */
  trustNote?: string;
};

export const PRICING_PLAN_UI: Record<
  Exclude<PackageId, "package_internal">,
  PricingPlanUi
> = {
  package_1: {
    accent: "yellow",
    delivery: "minutes",
    ctaLabel: "Start instant song",
    tableCtaLabel: "Start instant",
  },
  package_2: {
    accent: "coral",
    delivery: "minutes",
    ctaLabel: "Create my song",
    tableCtaLabel: "Create song",
    trustNote: "Not happy? Customise and regenerate free.",
  },
  package_3: {
    accent: "gradient",
    delivery: "hours24",
    ctaLabel: "Song by Expert",
    tableCtaLabel: "Song by Expert",
  },
};

export function getPricingPlanUi(
  id: PackageId,
): PricingPlanUi | undefined {
  if (id === "package_internal") return undefined;
  return PRICING_PLAN_UI[id];
}
