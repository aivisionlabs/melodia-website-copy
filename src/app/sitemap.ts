import { getActiveSongsAction } from '@/lib/actions/song.actions';
import { db } from '@/lib/db';
import { userSongsTable, blogPostsTable } from '@/lib/db/schema';
import { and, eq, isNull, or } from 'drizzle-orm';
import { MetadataRoute } from 'next';
import { LANGUAGE_PAGES } from '@/lib/seo/language-pages';
import { OCCASIONS } from '@/lib/seo/occasions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.melodia-songs.com';

  // Static pages with priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/my-songs`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    { url: `${baseUrl}/occasions`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    // Individual occasion pages — derived from the canonical OCCASIONS list so
    // adding a new occasion route keeps the sitemap in sync automatically.
    ...OCCASIONS.map((occasion) => ({
      url: `${baseUrl}/occasions/${occasion.slug}`,
      lastModified: new Date(),
      changeFrequency: occasion.changeFrequency,
      priority: occasion.priority,
    })),
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/languages`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...LANGUAGE_PAGES.map((lang) => ({
      url: `${baseUrl}/languages/${lang.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    // Fetch songs, user songs, and blog posts in parallel to minimize total time
    const [songsResult, userSongs, blogPosts] = await Promise.all([
      getActiveSongsAction(10000, 0),
      db
        .select({
          slug: userSongsTable.slug,
          created_at: userSongsTable.created_at,
          status: userSongsTable.status,
          is_deleted: userSongsTable.is_deleted,
        })
        .from(userSongsTable)
        .where(
          and(
            or(
              eq(userSongsTable.is_deleted, false),
              isNull(userSongsTable.is_deleted)
            ),
            eq(userSongsTable.status, 'completed')
          )
        )
        .limit(10000),
      db
        .select({ slug: blogPostsTable.slug, updated_at: blogPostsTable.updated_at })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.published, true))
        .limit(1000),
    ]);

    const songPages: MetadataRoute.Sitemap =
      songsResult.success && songsResult.songs
        ? songsResult.songs.map((song) => ({
            url: `${baseUrl}/song/${song.slug}`,
            lastModified: new Date(song.created_at),
            changeFrequency: 'daily' as const,
            priority: 1.0,
          }))
        : [];

    const userSongPages: MetadataRoute.Sitemap = userSongs.map((userSong) => ({
      url: `${baseUrl}/my-songs/${userSong.slug}`,
      lastModified: new Date(userSong.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    console.log(
      `Sitemap generated: ${staticPages.length} static + ${songPages.length} songs + ${userSongPages.length} user songs + ${blogPages.length} blog`
    );

    return [...staticPages, ...songPages, ...userSongPages, ...blogPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return at least static pages if database query fails
    return staticPages;
  }
}

// Revalidate sitemap every 24 hours
export const revalidate = 86400;