import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { StructuredData } from "@/components/StructuredData";
import { db } from "@/lib/db";
import { blogPostsTable } from "@/lib/db/schema";
import { getBlogCluster } from "@/lib/seo/occasion-blog-links";
import {
  authorAvatarUrl,
  authorUrl,
  getAuthorForPost,
} from "@/lib/blog/authors";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = "https://www.melodia-songs.com";

// Slugs written primarily in a non-English language get hreflang hints
const HREFLANG_MAP: Record<string, string> = {
  "mothers-day-song-in-hindi-for-maa": "hi-IN",
  "shaadi-ke-liye-hindi-mein-gaana": "hi-IN",
  "saalgirah-par-hindi-mein-custom-gaana": "hi-IN",
  "raksha-bandhan-ke-liye-hindi-gaana": "hi-IN",
  "retirement-vidaai-par-hindi-gaana": "hi-IN",
  "valentine-day-hindi-love-song-banaye": "hi-IN",
};

/** Extract FAQ items from blog HTML (pattern: <h2>Frequently Asked Questions</h2> … <h3>Q</h3><p>A</p>) */
function extractFaqItems(html: string): { question: string; answer: string }[] {
  const sectionMatch = html.match(
    /<h2>Frequently Asked Questions<\/h2>([\s\S]*?)(?=<h2>|$)/i,
  );
  if (!sectionMatch) return [];
  const items: { question: string; answer: string }[] = [];
  const re = /<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(sectionMatch[1])) !== null) {
    items.push({
      question: m[1].replace(/<[^>]+>/g, "").trim(),
      answer: m[2].replace(/<[^>]+>/g, "").trim(),
    });
  }
  return items;
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/melodia.songs" },
  {
    label: "Twitter/X",
    href: "https://x.com/melodia_songs",
  },
  { label: "Email", href: "mailto:info@melodia-songs.com" },
  { label: "WhatsApp", href: "https://wa.me/+917483464565" },
] as const;

type Props = { params: Promise<{ slug: string }> };

// Pre-render all published posts at build time; revalidate hourly so edits and
// newly published posts appear without a redeploy. Slugs not pre-rendered are
// still generated on-demand (dynamicParams defaults to true).
export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await db
    .select({ slug: blogPostsTable.slug })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true));
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db
    .select({
      title: blogPostsTable.title,
      meta_description: blogPostsTable.meta_description,
    })
    .from(blogPostsTable)
    .where(
      and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.published, true)),
    )
    .limit(1);
  if (!post) return { title: "Post Not Found | Melodia" };
  const hreflang = HREFLANG_MAP[slug];
  return {
    title: `${post.title} | Melodia Blog`,
    description: post.meta_description ?? undefined,
    openGraph: {
      title: post.title,
      description: post.meta_description ?? undefined,
      url: `${BASE_URL}/blog/${slug}`,
      siteName: "Melodia",
      locale: hreflang ? hreflang.replace("-", "_") : "en_IN",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Melodia Blog`,
      description: post.meta_description ?? undefined,
      images: ["/images/melodia-logo-og.jpeg"],
    },
    alternates: {
      canonical: `/blog/${slug}`,
      ...(hreflang ? { languages: { [hreflang]: `/blog/${slug}` } } : {}),
    },
  };
}

// ─── Category styles (mirrors blog listing page) ─────────────────────────────
const CAT_META: Record<string, { label: string; emoji: string }> = {
  "birthday":     { label: "Birthday",     emoji: "🎂" },
  "mothers-day":  { label: "Mother's Day", emoji: "🌸" },
  "fathers-day":  { label: "Father's Day", emoji: "👨" },
  "devotional":   { label: "Devotional",   emoji: "🪔" },
  "how-to":       { label: "How-To",       emoji: "🎓" },
  "general":      { label: "General",      emoji: "✨" },
  "anniversary":  { label: "Anniversary",  emoji: "💍" },
  "wedding":      { label: "Wedding",      emoji: "💒" },
  "retirement":   { label: "Retirement",   emoji: "🎉" },
};

const CAT_CARD_STYLE: Record<string, { badge: string; bar: string }> = {
  "birthday":    { badge: "bg-amber-100 text-amber-800 border-amber-200",    bar: "from-amber-400 to-yellow-300" },
  "mothers-day": { badge: "bg-pink-100  text-pink-800  border-pink-200",     bar: "from-pink-400  to-rose-300" },
  "fathers-day": { badge: "bg-blue-100  text-blue-800  border-blue-200",     bar: "from-blue-400  to-cyan-300" },
  "devotional":  { badge: "bg-orange-100 text-orange-800 border-orange-200", bar: "from-orange-400 to-amber-300" },
  "how-to":      { badge: "bg-teal-100  text-teal-800  border-teal-200",     bar: "from-teal-500  to-emerald-400" },
  "general":     { badge: "bg-violet-100 text-violet-800 border-violet-200", bar: "from-violet-400 to-purple-300" },
  "anniversary": { badge: "bg-rose-100  text-rose-800  border-rose-200",     bar: "from-rose-400  to-pink-300" },
  "wedding":     { badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200", bar: "from-fuchsia-400 to-pink-300" },
  "retirement":  { badge: "bg-green-100 text-green-800 border-green-200",    bar: "from-green-400 to-emerald-300" },
};
const fallbackStyle = { badge: "bg-gray-100 text-gray-700 border-gray-200", bar: "from-gray-400 to-gray-300" };

function getCatStyle(category: string) {
  return CAT_CARD_STYLE[category] ?? fallbackStyle;
}
function getCatMeta(category: string) {
  return CAT_META[category] ?? { label: category, emoji: "✨" };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(
      and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.published, true)),
    )
    .limit(1);

  if (!post) notFound();

  const relatedCols = {
    id: blogPostsTable.id,
    title: blogPostsTable.title,
    slug: blogPostsTable.slug,
    meta_description: blogPostsTable.meta_description,
    category: blogPostsTable.category,
    created_at: blogPostsTable.created_at,
  };

  // Bidirectional topical cluster: which occasion this post belongs to and its
  // curated sibling guides. Drives the occasion back-link + "Related reads".
  const cluster = getBlogCluster(slug);

  type RelatedPost = {
    id: number;
    title: string;
    slug: string;
    meta_description: string | null;
    category: string;
    created_at: Date;
  };

  // Prefer the curated cluster siblings (the hand-picked topical mesh) over a
  // loose same-category match. Preserve the cluster's ordering.
  let relatedPosts: RelatedPost[] = [];
  if (cluster && cluster.siblings.length > 0) {
    const siblingSlugs = cluster.siblings.map((s) => s.slug);
    const siblingPosts = await db
      .select(relatedCols)
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.published, true),
          ne(blogPostsTable.id, post.id),
          inArray(blogPostsTable.slug, siblingSlugs),
        ),
      );
    const bySlug = new Map(siblingPosts.map((p) => [p.slug, p]));
    relatedPosts = siblingSlugs
      .map((s) => bySlug.get(s))
      .filter((p): p is (typeof siblingPosts)[number] => Boolean(p));
  }
  const usingCluster = relatedPosts.length > 0;

  // Fill any remaining slots (up to 3) with same-category, then recent posts.
  if (relatedPosts.length < 3) {
    const excludeIds = new Set<number>([post.id, ...relatedPosts.map((p) => p.id)]);
    const fillCount = 3 - relatedPosts.length;
    const candidates = await db
      .select(relatedCols)
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.published, true), ne(blogPostsTable.id, post.id)))
      .orderBy(desc(blogPostsTable.created_at))
      .limit(50);
    const fresh = candidates.filter((p) => !excludeIds.has(p.id));
    const sameCat = fresh.filter((p) => p.category === post.category);
    const otherCat = fresh.filter((p) => p.category !== post.category);
    relatedPosts = [...relatedPosts, ...sameCat, ...otherCat].slice(0, 3);
  }

  const publishedDate = new Date(post.created_at);
  const formattedDate = publishedDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const faqItems = extractFaqItems(post.content);
  const catStyle = getCatStyle(post.category);
  const catMeta = getCatMeta(post.category);
  const author = getAuthorForPost(post.category, slug);

  return (
    <div className="min-h-screen" style={{ background: "#fcf9f2" }}>
      {/* Structured data */}
      <StructuredData
        type="article"
        article={{
          headline: post.title,
          description: post.meta_description ?? post.title,
          url: `${BASE_URL}/blog/${slug}`,
          datePublished: publishedDate.toISOString(),
          dateModified: new Date(post.updated_at).toISOString(),
          author: {
            name: author.name,
            url: authorUrl(author.id),
            jobTitle: author.role,
            sameAs: author.sameAs,
            imageUrl: authorAvatarUrl(author),
          },
          imageUrl: `${BASE_URL}/images/melodia-logo-og.jpeg`,
        }}
      />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Blog", url: `${BASE_URL}/blog` },
          { name: post.title, url: `${BASE_URL}/blog/${slug}` },
        ]}
      />
      {faqItems.length > 0 && (
        <StructuredData type="faq" faqItems={faqItems} />
      )}
      <div className="hidden md:block"><Header /></div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-[#073B4C]/50 font-body" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="text-[#EF476F] hover:underline transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/blog" className="text-[#EF476F] hover:underline transition-colors">
                Blog
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-[#073B4C]/70 font-medium truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Article card */}
        <article className="bg-white rounded-3xl border border-[#073B4C]/10 overflow-hidden shadow-sm">
          {/* Category colour bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${catStyle.bar}`} />

          <div className="p-6 sm:p-8 md:p-10">
            {/* Category badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border font-body mb-5 ${catStyle.badge}`}>
              {catMeta.emoji} {catMeta.label}
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#073B4C] font-heading leading-snug mb-4">
              {post.title}
            </h1>

            {/* Author + date */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#073B4C]/50 font-body mb-8 pb-6 border-b border-[#073B4C]/8">
              <Image
                src={author.avatar ?? "/images/melodia-logo-og.jpeg"}
                alt={author.name}
                width={36}
                height={36}
                className="rounded-full object-cover border border-[#073B4C]/10"
              />
              <span>
                By{" "}
                <Link
                  href={`/blog/authors/${author.id}`}
                  className="text-[#073B4C]/80 font-semibold hover:text-[#EF476F] hover:underline"
                >
                  {author.name}
                </Link>
                <span className="block text-xs text-[#073B4C]/45">{author.role}</span>
              </span>
              <span aria-hidden className="text-[#073B4C]/25">·</span>
              <time dateTime={publishedDate.toISOString()}>
                Published {formattedDate}
              </time>
            </div>

            {/* Body */}
            <div
              className="blog-content font-body
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#073B4C] [&_h2]:font-heading [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[#073B4C] [&_h3]:font-heading [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:text-[#073B4C]/80 [&_p]:leading-relaxed [&_p]:my-4
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4
                [&_li]:text-[#073B4C]/80 [&_li]:my-1.5 [&_li]:leading-relaxed
                [&_strong]:text-[#073B4C] [&_strong]:font-semibold
                [&_em]:italic
                [&_a]:text-[#EF476F] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-[#d63d63]
                [&_blockquote]:border-l-4 [&_blockquote]:border-[#FFD166] [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-[#073B4C]/70 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Author bio box — E-E-A-T: a real, attributable expert per post */}
            <aside className="mt-10 pt-8 border-t border-[#073B4C]/8 flex gap-4 items-start">
              <Image
                src={author.avatar ?? "/images/melodia-logo-og.jpeg"}
                alt={author.name}
                width={56}
                height={56}
                className="rounded-full object-cover border border-[#073B4C]/10 shrink-0"
              />
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-[#073B4C]/40 font-body mb-1">
                  About the author
                </p>
                <Link
                  href={`/blog/authors/${author.id}`}
                  className="text-base font-bold text-[#073B4C] hover:text-[#EF476F] font-heading"
                >
                  {author.name}
                </Link>
                <p className="text-xs text-[#073B4C]/50 font-body mb-2">{author.role}</p>
                <p className="text-sm text-[#073B4C]/70 font-body leading-relaxed">{author.bio}</p>
              </div>
            </aside>

            {/* Social links */}
            <div className="mt-10 pt-8 border-t border-[#073B4C]/8">
              <p className="text-xs font-bold tracking-widest uppercase text-[#073B4C]/40 font-body mb-3">
                Connect with Melodia
              </p>
              <ul className="flex flex-wrap gap-3">
                {SOCIAL_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-1.5 rounded-full border border-[#073B4C]/20 text-sm font-medium text-[#073B4C]/70 hover:border-[#EF476F]/40 hover:text-[#EF476F] transition-all font-body"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        {/* Blog → occasion back-link: closes the bidirectional cluster mesh */}
        {cluster && (
          <Link
            href={`/occasions/${cluster.occasionSlug}`}
            className="group mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[#073B4C]/10 bg-white px-6 py-5 shadow-sm transition-all hover:border-[#EF476F]/30 hover:shadow-md"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#073B4C]/40 font-body mb-1">
                Explore the collection
              </p>
              <p className="text-base font-bold text-[#073B4C] group-hover:text-[#EF476F] transition-colors font-heading">
                All {cluster.occasionTitle}
              </p>
            </div>
            <span className="shrink-0 text-lg font-semibold text-[#EF476F] group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12" aria-label="Related blog posts">
            <h2 className="text-sm font-bold text-[#073B4C]/50 uppercase tracking-widest mb-5 font-heading">
              {usingCluster ? "Related reads" : `More ${catMeta.label} Articles`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((related) => {
                const rs = getCatStyle(related.category);
                const rm = getCatMeta(related.category);
                return (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="group flex flex-col bg-white rounded-2xl border border-[#073B4C]/10 hover:border-[#EF476F]/30 hover:shadow-xl transition-all duration-200 overflow-hidden"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${rs.bar}`} />
                    <div className="flex flex-col gap-3 p-5 flex-1">
                      <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border font-body ${rs.badge}`}>
                        {rm.emoji} {rm.label}
                      </span>
                      <h3 className="text-[15px] font-bold leading-snug text-[#073B4C] group-hover:text-[#EF476F] transition-colors font-heading line-clamp-3">
                        {related.title}
                      </h3>
                      {related.meta_description && (
                        <p className="text-sm text-[#073B4C]/55 line-clamp-2 font-body leading-relaxed flex-1">
                          {related.meta_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#073B4C]/8">
                        <time dateTime={new Date(related.created_at).toISOString()} className="text-xs text-[#073B4C]/40 font-body">
                          {new Date(related.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </time>
                        <span className="text-xs font-semibold text-[#EF476F] group-hover:underline font-body">Read →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#073B4C]/60 hover:text-[#EF476F] transition-colors font-body"
          >
            ← Back to all articles
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
