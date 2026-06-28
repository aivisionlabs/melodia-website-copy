import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FullPageMediaPlayer } from "@/components/FullPageMediaPlayer";
import { StructuredData } from "@/components/StructuredData";
import { SongLoadingSkeleton } from "@/components/SongLoadingSkeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DownloadButton } from "@/components/DownloadButton";

import {
  getSongBySlug,
  getSongBySlugLightweight,
} from "@/lib/db/queries/select";
import { getLanguagePagesFromSongLanguage } from "@/lib/seo/language-utils";

// Song pages are generated on-demand and cached (ISR). We deliberately avoid
// build-time generateStaticParams because there are thousands of songs — that
// would make builds slow and brittle. Hourly revalidation keeps crawlers fast
// (cached HTML) while still picking up changes.
export const revalidate = 3600;

// Generate dynamic metadata for each song page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ songId: string }>;
}): Promise<Metadata> {
  const { songId } = await params;

  try {
    // Use lightweight query for metadata generation (faster)
    const song = await getSongBySlugLightweight(songId);

    if (!song) {
      console.warn(`[generateMetadata] Song not found for songId: ${songId}`);
      return {
        title: "Song Not Found | Melodia",
        description: "The song you're looking for could not be found.",
      };
    }

    // Get image URL from suno variants or use default
    const imageUrl =
      song.suno_variants &&
      Array.isArray(song.suno_variants) &&
      song.suno_variants.length > 0
        ? (song.suno_variants[0] as any)?.sourceImageUrl ||
          "/images/melodia-logo-og.jpeg"
        : "/images/melodia-logo-og.jpeg";

    // Get user name from song_requester, fallback to "Melodia" if not available
    // const userName = song.song_requester || "Melodia";

    // Create description
    const description = `Listen to ${song.title}. Listen and create your own personalized AI song on Melodia.`;

    // Build keywords array
    const keywords = [
      song.title,
      "personalized song",
      "custom music",
      "AI generated song",
      "gift song",
      "musical gift",
    ];

    // Unlisted songs (add_to_library = false) are accessible by direct URL but must
    // not be indexed by search engines, otherwise they'd resurface via Google after
    // being removed from the library.
    const isUnlisted = song.add_to_library === false;

    return {
      metadataBase: new URL("https://www.melodia-songs.com"), // Required for resolving relative URLs
      title: `${song.title} | Melodia`,
      description: description.substring(0, 160), // Keep under 160 chars for SEO
      keywords: keywords.join(", "),
      authors: [{ name: "Melodia" }],
      creator: "Melodia",
      publisher: "Melodia",
      openGraph: {
        title: song.title,
        description: description.substring(0, 200),
        url: `https://www.melodia-songs.com/song/${song.slug}`,
        siteName: "Melodia",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${song.title} - Album Artwork`,
          },
        ],
        locale: "en_US",
        type: "music.song",
        ...(song.song_url && {
          audio: [{ url: song.song_url, type: "audio/mpeg" }],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title: song.title,
        description: description.substring(0, 200),
        images: [imageUrl],
        creator: "@melodia_songs",
        site: "@melodia_songs",
      },
      alternates: {
        canonical: `/song/${song.slug}`,
      },
      other: {
        "music:duration": song?.duration ? parseInt(song.duration) : 0, // Must be an integer in seconds
        "music:musician": "Melodia Lyric-First Song Engine",
      },
      robots: isUnlisted
        ? {
            index: false,
            follow: false,
            googleBot: {
              index: false,
              follow: false,
              "max-video-preview": -1,
              "max-image-preview": "large",
              "max-snippet": -1,
            },
          }
        : {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              "max-video-preview": -1,
              "max-image-preview": "large",
              "max-snippet": -1,
            },
          },
    };
  } catch (error) {
    console.error("Error generating metadata for song:", error);
    return {
      title: "Song | Melodia",
      description: "Listen to personalized songs created by Melodia.",
    };
  }
}

// Server Component for song data loading
async function SongPageContent({ song }: { song: any }) {
  const languagePages = getLanguagePagesFromSongLanguage(song.language);
  const languageLinks = languagePages.map((lang) => ({
    slug: lang.slug,
    name: lang.name,
    nativeName: lang.nativeName,
  }));

  const breadcrumbItems = [{ name: "Home", url: "/" }];
  if (languagePages.length > 0) {
    breadcrumbItems.push(
      { name: "Languages", url: "/languages" },
      {
        name: languagePages[0].name,
        url: `/languages/${languagePages[0].slug}`,
      },
    );
  } else {
    breadcrumbItems.push({ name: "Library", url: "/library" });
  }
  breadcrumbItems.push({ name: song.title, url: `/song/${song.slug}` });

  // Map the song data to match FullPageMediaPlayer's expected interface
  const mappedSong = {
    id: song.id.toString(),
    title: song.title,
    artist: song.service_provider || "Melodia",
    song_url: song.song_url || undefined,
    duration: song.duration || 0,
    timestamp_lyrics: song.timestamp_lyrics || undefined,
    timestamped_lyrics_variants: song.timestamped_lyrics_variants || undefined,
    selected_variant: song.selected_variant || undefined,
    // Prefer customer_lyrics (English transliteration) for end-customer display
    lyrics: (song as any).customer_lyrics || song.lyrics || null,
    show_lyrics: song.show_lyrics,
    slug: song.slug,
    likes_count: song.likes_count || 0,
    suno_variants: song.suno_variants || undefined,
    download_allowed: song.download_allowed || false,
    language: song.language || undefined,
    tags: (song.tags as string[] | null) || undefined,
    song_description: (song.song_description as string | null) || undefined,
    languageLinks,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5 flex flex-col">
      <StructuredData type="breadcrumb" breadcrumbItems={breadcrumbItems} />
      <StructuredData
        type="song"
        song={{
          id: song.id,
          title: song.title,
          service_provider: song.service_provider,
          song_url: song.song_url,
          duration: song.duration,
          timestamp_lyrics: song.timestamp_lyrics,
          timestamped_lyrics_variants: song.timestamped_lyrics_variants,
          lyrics: (song as any).customer_lyrics || song.lyrics,
          music_style: song.music_style,
          slug: song.slug,
          occasion: song.occasion ?? undefined,
          mood: song.mood ?? undefined,
          request_languages: song.request_languages ?? undefined,
        }}
      />
      <Header
        showCreateSongCTA={false}
        rightActions={
          mappedSong.song_url ? (
            <>
              <div className="md:hidden">
                <DownloadButton
                  audioUrl={mappedSong.song_url}
                  songTitle={mappedSong.title}
                  songId={mappedSong.id}
                  showIconOnly
                />
              </div>
              <div className="hidden md:block">
                <DownloadButton
                  audioUrl={mappedSong.song_url}
                  songTitle={mappedSong.title}
                  songId={mappedSong.id}
                />
              </div>
            </>
          ) : null
        }
      />
      <main className="flex-1 flex flex-col relative">
        <FullPageMediaPlayer song={mappedSong} />
        {/* Footer positioned below player - with margin to account for fixed player controls */}
        <div className="mt-[200px] md:mt-[220px] relative z-40 bg-gradient-to-br from-secondary-cream via-primary-yellow/5 to-accent-coral/5">
          <Footer />
        </div>
      </main>
    </div>
  );
}

// Loading component
function SongLoading() {
  return <SongLoadingSkeleton />;
}

// Main page component
export default async function SongLibraryPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;

  // First, check if song exists with lightweight query (faster)
  let songExists = false;
  try {
    const lightweightSong = await getSongBySlugLightweight(songId);
    songExists = !!lightweightSong;
  } catch (error) {
    console.error("Error checking song existence:", error);
  }

  if (!songExists) {
    notFound();
  }

  return (
    <Suspense fallback={<SongLoading />}>
      <SongPageContentWrapper songId={songId} />
    </Suspense>
  );
}

// Wrapper component that handles the full song data loading
async function SongPageContentWrapper({ songId }: { songId: string }) {
  // Get full song data (this will be faster since we know the song exists)
  let song = null;
  try {
    song = await getSongBySlug(songId);
  } catch (error) {
    console.error("Error fetching song from database:", error);
  }

  if (!song) {
    notFound();
  }

  return <SongPageContent song={song} />;
}
