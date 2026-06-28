/** Slug fallbacks when `packages.allowed_variations` is unset (0) in DB. */
const PACKAGE_ALLOWED_VARIATIONS_BY_SLUG: Record<string, number> = {
  package_1: 0,
  package_2: 1,
  package_3: 0,
};

export type PackageVariationLimits = {
  allowed_variations?: number | null;
  slug?: string | null;
};

/**
 * Resolves how many post-rejection song variations a package allows.
 * Uses the DB value when > 0; otherwise falls back by package slug.
 */
export function resolveAllowedVariations(
  pkg: PackageVariationLimits | null | undefined,
): number {
  const fromDb = pkg?.allowed_variations ?? 0;
  if (fromDb > 0) return fromDb;

  const slug = pkg?.slug?.trim();
  if (slug && slug in PACKAGE_ALLOWED_VARIATIONS_BY_SLUG) {
    return PACKAGE_ALLOWED_VARIATIONS_BY_SLUG[slug];
  }

  return 0;
}

export function computeVariationsRemaining(
  pkg: PackageVariationLimits | null | undefined,
  variationsUsed: number | null | undefined,
): number {
  const allowed = resolveAllowedVariations(pkg);
  const used = variationsUsed ?? 0;
  return Math.max(0, allowed - used);
}
