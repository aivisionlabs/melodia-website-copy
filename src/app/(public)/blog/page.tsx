import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { db } from "@/lib/db";
import { blogPostsTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

// Revalidate hourly (ISR) so the index is served from cache to crawlers
// instead of being re-rendered on every request.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog — Song Stories, Tips & Guides | Melodia",
  description:
    "Learn how to create AI songs, write lyrics, and make personalized music. Tips, step-by-step guides, and use cases for AI music.",
  openGraph: {
    title: "Blog — Song Stories, Tips & Guides | Melodia",
    description: "Guides and tips for creating AI songs and personalized music.",
    url: "https://www.melodia-songs.com/blog",
    siteName: "Melodia",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Song Stories, Tips & Guides | Melodia",
    description: "Guides and tips for creating AI songs and personalized music.",
    images: ["/images/melodia-logo-og.jpeg"],
  },
  alternates: { canonical: "/blog" },
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",          label: "All",           emoji: "🎵", description: "Everything we've written" },
  { key: "birthday",     label: "Birthday",      emoji: "🎂", description: "Birthday song ideas & gifts" },
  { key: "mothers-day",  label: "Mother's Day",  emoji: "🌸", description: "Gifts & songs for moms" },
  { key: "fathers-day",  label: "Father's Day",  emoji: "👨", description: "Gifts & songs for dads" },
  { key: "devotional",   label: "Devotional",    emoji: "🪔", description: "Bhajans & spiritual music" },
  { key: "how-to",       label: "How-To",        emoji: "🎓", description: "Guides for AI music creation" },
  { key: "general",      label: "General",       emoji: "✨", description: "Tips, ideas & inspiration" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const CAT_CARD_STYLE: Record<string, { badge: string; bar: string }> = {
  "birthday":    { badge: "bg-amber-100 text-amber-800 border-amber-200",    bar: "from-amber-400 to-yellow-300" },
  "mothers-day": { badge: "bg-pink-100  text-pink-800  border-pink-200",     bar: "from-pink-400  to-rose-300" },
  "fathers-day": { badge: "bg-blue-100  text-blue-800  border-blue-200",     bar: "from-blue-400  to-cyan-300" },
  "devotional":  { badge: "bg-orange-100 text-orange-800 border-orange-200", bar: "from-orange-400 to-amber-300" },
  "how-to":      { badge: "bg-teal-100  text-teal-800  border-teal-200",     bar: "from-teal-500  to-emerald-400" },
  "general":     { badge: "bg-violet-100 text-violet-800 border-violet-200", bar: "from-violet-400 to-purple-300" },
};
const fallbackStyle = { badge: "bg-gray-100 text-gray-700 border-gray-200", bar: "from-gray-400 to-gray-300" };

function getCatMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? { key, label: key, emoji: "✨", description: "" };
}

// ─── Post card ────────────────────────────────────────────────────────────────
function PostCard({
  post,
}: {
  post: { id: number; title: string; slug: string; meta_description: string | null; category: string; created_at: Date };
}) {
  const cat = getCatMeta(post.category);
  const style = CAT_CARD_STYLE[post.category] ?? fallbackStyle;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-[#073B4C]/10 hover:border-[#EF476F]/30 hover:shadow-xl transition-all duration-200 overflow-hidden"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${style.bar}`} />
      <div className="flex flex-col gap-3 p-5 flex-1">
        <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full border font-body ${style.badge}`}>
          {cat.emoji} {cat.label}
        </span>
        <h2 className="text-[15px] font-bold leading-snug text-[#073B4C] group-hover:text-[#EF476F] transition-colors font-heading line-clamp-3">
          {post.title}
        </h2>
        {post.meta_description && (
          <p className="text-sm text-[#073B4C]/55 line-clamp-2 font-body leading-relaxed flex-1">
            {post.meta_description}
          </p>
        )}
        <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#073B4C]/8">
          <time dateTime={new Date(post.created_at).toISOString()} className="text-xs text-[#073B4C]/40 font-body">
            {new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
          </time>
          <span className="text-xs font-semibold text-[#EF476F] group-hover:underline font-body">Read →</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Featured hero card ────────────────────────────────────────────────────────
function FeaturedCard({
  post,
}: {
  post: { id: number; title: string; slug: string; meta_description: string | null; category: string; created_at: Date };
}) {
  const cat = getCatMeta(post.category);
  const style = CAT_CARD_STYLE[post.category] ?? fallbackStyle;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white rounded-3xl border border-[#073B4C]/10 hover:border-[#EF476F]/40 hover:shadow-2xl transition-all duration-200 overflow-hidden"
    >
      <div className={`h-2 w-full bg-gradient-to-r ${style.bar}`} />
      <div className="p-8 md:p-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FFD166]/30 text-[#073B4C] border border-[#FFD166]/60 font-body uppercase tracking-wide">
            ⭐ Featured
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border font-body ${style.badge}`}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#073B4C] group-hover:text-[#EF476F] transition-colors leading-snug font-heading mb-4">
          {post.title}
        </h2>
        {post.meta_description && (
          <p className="text-base text-[#073B4C]/65 font-body leading-relaxed max-w-2xl">
            {post.meta_description}
          </p>
        )}
        <div className="mt-6 flex items-center gap-4">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EF476F] text-white text-sm font-semibold font-body group-hover:bg-[#d63d63] transition-colors">
            Read article →
          </span>
          <time dateTime={new Date(post.created_at).toISOString()} className="text-sm text-[#073B4C]/40 font-body">
            {new Date(post.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </time>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: activeCategory = "all" } = await searchParams;

  const allPosts = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      slug: blogPostsTable.slug,
      meta_description: blogPostsTable.meta_description,
      category: blogPostsTable.category,
      created_at: blogPostsTable.created_at,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(desc(blogPostsTable.created_at));

  const filtered =
    activeCategory === "all"
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory);

  const counts = allPosts.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
  counts["all"] = allPosts.length;

  const featuredPost = activeCategory === "all" ? filtered[0] : null;
  const gridPosts = activeCategory === "all" ? filtered.slice(1) : filtered;

  const activeCatMeta = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: "#fcf9f2" }}>
      <div className="hidden md:block">
        <Header />
      </div>

      {/* ── Hero ── */}
      <section className="pt-14 pb-12 px-4 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-[#EF476F] mb-4 font-heading">
          <span>♪</span> Melodia Blog
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#073B4C] font-heading leading-tight mb-4">
          Songs, Stories &amp; Ideas
        </h1>
        <p className="text-lg md:text-xl text-[#073B4C]/60 max-w-lg mx-auto font-body">
          Gift ideas, music guides, and inspiration — all in one place.
        </p>
      </section>

      {/* ── Category pills ── */}
      <div className="sticky top-0 z-10 bg-[#fcf9f2]/90 backdrop-blur-sm border-b border-[#073B4C]/8 py-3">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {CATEGORIES.filter((c) => c.key === "all" || (counts[c.key] ?? 0) > 0).map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Link
                  key={cat.key}
                  href={cat.key === "all" ? "/blog" : `/blog?category=${cat.key}`}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-all font-body flex-shrink-0 ${
                    isActive
                      ? "bg-[#FFD166] text-[#073B4C] border-[#FFD166] shadow"
                      : "bg-white text-[#073B4C] border-[#073B4C]/20 hover:border-[#073B4C]/50 hover:bg-[#073B4C]/5"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-body ${isActive ? "bg-[#073B4C]/20 text-[#073B4C]" : "bg-[#073B4C]/10 text-[#073B4C]/50"}`}>
                    {counts[cat.key] ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 py-10 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🎵</p>
            <p className="text-[#073B4C]/50 font-body text-lg">No posts in this category yet.</p>
            <Link href="/blog" className="mt-4 inline-block text-sm text-[#EF476F] underline font-body">View all posts</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Category header (filtered view) */}
            {activeCatMeta && activeCatMeta.key !== "all" && (
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeCatMeta.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold text-[#073B4C] font-heading">{activeCatMeta.label}</h2>
                  <p className="text-sm text-[#073B4C]/55 font-body">{activeCatMeta.description}</p>
                </div>
              </div>
            )}

            {/* Featured post */}
            {featuredPost && <FeaturedCard post={featuredPost} />}

            {/* Grid */}
            {gridPosts.length > 0 && (
              <div>
                {activeCategory === "all" && (
                  <h2 className="text-sm font-bold text-[#073B4C]/50 uppercase tracking-widest mb-5 font-heading">
                    Recent Articles
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gridPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
