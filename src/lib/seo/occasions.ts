/**
 * Canonical list of occasion landing-page slugs.
 *
 * This is the single source of truth for which `/occasions/[slug]` pages exist.
 * The sitemap (and any other code that needs to enumerate occasions) imports
 * from here so that adding a new occasion route automatically keeps the sitemap
 * in sync — no hand-maintained duplicate list to drift out of date.
 *
 * Each slug MUST correspond to a real folder under
 * `src/app/(public)/occasions/<slug>/page.tsx`.
 */

export type OccasionChangeFrequency = 'daily' | 'weekly';

export interface OccasionSeoEntry {
  slug: string;
  /** Sitemap priority (0–1). Seasonal/high-intent occasions are boosted. */
  priority: number;
  changeFrequency: OccasionChangeFrequency;
}

export const OCCASIONS: readonly OccasionSeoEntry[] = [
  // Seasonal / high-intent occasions — refreshed daily, top priority
  { slug: 'mothers-day', priority: 1.0, changeFrequency: 'daily' },
  { slug: 'fathers-day', priority: 1.0, changeFrequency: 'daily' },

  // Evergreen occasions
  { slug: 'birthday', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'adult-birthday', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'anniversary', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'weddings', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'sangeet', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'haldi', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'mehndi', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'ring-ceremony', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'romantic', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'party', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'kids', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'lullaby', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'friendship', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'siblings', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'parents', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'apology', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'congratulations', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'thank-you', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'farewell', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'corporate-events', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'motivational', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'devotional-spiritual', priority: 0.9, changeFrequency: 'weekly' },
  { slug: 'festive-holiday', priority: 0.9, changeFrequency: 'weekly' },
] as const;

/** All occasion slugs, e.g. for `generateStaticParams`. */
export const OCCASION_SLUGS: readonly string[] = OCCASIONS.map((o) => o.slug);
