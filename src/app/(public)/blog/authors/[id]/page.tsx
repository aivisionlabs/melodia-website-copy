import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { StructuredData } from "@/components/StructuredData";
import {
  BLOG_AUTHORS,
  authorAvatarUrl,
  getAuthorById,
  getAuthorForPost,
} from "@/lib/blog/authors";
import { db } from "@/lib/db";
import { blogPostsTable } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = "https://www.melodia-songs.com";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 3600;

export function generateStaticParams(): { id: string }[] {
  return Object.keys(BLOG_AUTHORS).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = getAuthorById(id);
  if (!author) return { title: "Author Not Found | Melodia" };
  return {
    title: `${author.name} — ${author.role} | Melodia Blog`,
    description: author.credentials,
    openGraph: {
      title: `${author.name} | Melodia Blog`,
      description: author.credentials,
      url: `${BASE_URL}/blog/authors/${id}`,
      siteName: "Melodia",
      locale: "en_IN",
      type: "profile",
    },
    alternates: { canonical: `/blog/authors/${id}` },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { id } = await params;
  const author = getAuthorById(id);
  if (!author) notFound();

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

  const authoredPosts = allPosts.filter(
    (p) => getAuthorForPost(p.category, p.slug).id === author.id,
  );

  return (
    <div className="min-h-screen" style={{ background: "#fcf9f2" }}>
      <StructuredData
        type="profilePage"
        profilePage={{
          name: author.name,
          url: `/blog/authors/${author.id}`,
          jobTitle: author.role,
          description: author.credentials,
          imageUrl: authorAvatarUrl(author),
          sameAs: author.sameAs,
        }}
      />
      <StructuredData
        type="breadcrumb"
        breadcrumbItems={[
          { name: "Home", url: BASE_URL },
          { name: "Blog", url: `${BASE_URL}/blog` },
          { name: author.name, url: `${BASE_URL}/blog/authors/${author.id}` },
        ]}
      />
      <div className="hidden md:block">
        <Header />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <nav className="mb-8 text-sm text-[#073B4C]/50 font-body" aria-label="Breadcrumb">
          <Link href="/blog" className="text-[#EF476F] hover:underline">
            ← Back to blog
          </Link>
        </nav>

        {/* Profile header */}
        <header className="flex flex-col sm:flex-row gap-6 items-start bg-white rounded-3xl border border-[#073B4C]/10 p-6 sm:p-8 shadow-sm">
          <Image
            src={author.avatar ?? "/images/melodia-logo-og.jpeg"}
            alt={author.name}
            width={96}
            height={96}
            className="rounded-full object-cover border border-[#073B4C]/10 shrink-0"
          />
          <div>
            <h1 className="text-3xl font-extrabold text-[#073B4C] font-heading">{author.name}</h1>
            <p className="text-sm font-semibold text-[#EF476F] font-body mt-1">{author.role}</p>
            <p className="text-sm text-[#073B4C]/70 font-body leading-relaxed mt-3">{author.bio}</p>
            <p className="text-sm text-[#073B4C]/60 font-body leading-relaxed mt-3">
              {author.credentials}
            </p>
            {author.sameAs.length > 0 && (
              <ul className="flex flex-wrap gap-3 mt-4">
                {author.sameAs.map((href) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="inline-block px-4 py-1.5 rounded-full border border-[#073B4C]/20 text-xs font-medium text-[#073B4C]/70 hover:border-[#EF476F]/40 hover:text-[#EF476F] transition-all font-body"
                    >
                      {new URL(href).hostname.replace("www.", "")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {/* Authored posts */}
        {authoredPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-bold text-[#073B4C]/50 uppercase tracking-widest mb-5 font-heading">
              Articles by {author.name} ({authoredPosts.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {authoredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col bg-white rounded-2xl border border-[#073B4C]/10 hover:border-[#EF476F]/30 hover:shadow-xl transition-all duration-200 p-5"
                >
                  <h3 className="text-[15px] font-bold leading-snug text-[#073B4C] group-hover:text-[#EF476F] transition-colors font-heading line-clamp-3">
                    {post.title}
                  </h3>
                  {post.meta_description && (
                    <p className="text-sm text-[#073B4C]/55 line-clamp-2 font-body leading-relaxed mt-2">
                      {post.meta_description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
