/**
 * Maps Create Song Request occasion ids to library category slugs.
 *
 * Occasion ids are the source of truth (see `OCCASION_OPTIONS` in
 * `occasion-suggestions.ts`). Category slugs match DB `/occasions/*` pages.
 */
import {
  getOccasionById,
  OCCASION_OPTIONS,
  resolveOccasionId,
} from "@/lib/occasion-suggestions";

/** @deprecated Prefer occasion ids from OCCASION_OPTIONS — label → slug for legacy UI maps. */
export const OCCASION_TO_CATEGORY_SLUG: Record<string, string> = Object.fromEntries(
  OCCASION_OPTIONS.map((option) => [option.label, option.id]),
);

export function getCategorySlugForOccasionId(
  occasionId: string | null | undefined,
): string | null {
  const id = resolveOccasionId(occasionId);
  if (!id) return null;
  return getOccasionById(id)?.id ?? null;
}

/** Resolve a display label or occasion id to its category slug (same as id). */
export function getCategorySlugForOccasionLabel(
  labelOrId: string | null | undefined,
): string | null {
  return resolveOccasionId(labelOrId);
}

/**
 * When the current NameDrop occasion has no active templates, pick a fallback in list order
 * (usually `ALL_OCCASIONS`). If the set is empty, returns the first mappable label or "Kids Birthday".
 */
export function pickNameDropDefaultOccasion(
  supportedSlugs: Set<string>,
  orderedLabels: readonly string[],
): string {
  for (const label of orderedLabels) {
    if (label === "Other") continue;
    const slug = getCategorySlugForOccasionLabel(label);
    if (slug && supportedSlugs.has(slug)) return label;
  }
  return "Kids Birthday";
}

/**
 * Partner `GET /api/v1/partner/templates?occasion=…` — when occasion is `birthday`,
 * include both kids (`birthday`) and adult (`adult-birthday`) template categories.
 * Other slugs are unchanged.
 */
export function getCategorySlugsForPartnerTemplatesOccasion(occasion: string): string[] {
  const o = occasion.trim();
  if (o === "birthday") {
    return ["adult-birthday", "birthday"];
  }
  return [o];
}

/** True when partner templates should sort by category priority before display_order. */
export function usesMultiCategoryPartnerTemplateOrdering(
  categorySlugs: readonly string[],
): boolean {
  return categorySlugs.length > 1;
}
