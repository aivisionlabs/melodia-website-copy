import Link from "next/link";
import { getOccasionBlogLinks } from "@/lib/seo/occasion-blog-links";

interface RelatedGuidesProps {
  occasionSlug: string;
  /** Heading override; defaults to a generic label. */
  heading?: string;
}

/**
 * Renders an internal-linking "Related Guides" section for an occasion page,
 * driven by the OCCASION_BLOG_LINKS mapping. Returns null when the occasion has
 * no guides yet, so it's safe to mount unconditionally. Presentational only —
 * the anchor tags server-render into the HTML for crawlers/AI engines.
 */
export function RelatedGuides({ occasionSlug, heading }: RelatedGuidesProps) {
  const guides = getOccasionBlogLinks(occasionSlug);
  if (guides.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-white/30">
      <div className="container px-4 mx-auto max-w-4xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-text-teal font-heading mb-8 text-center">
          {heading ?? "Related Guides"}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/blog/${guide.slug}`}
                className="block rounded-xl bg-white/70 px-5 py-4 text-text-teal font-medium shadow-sm transition hover:bg-white hover:shadow-md"
              >
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
