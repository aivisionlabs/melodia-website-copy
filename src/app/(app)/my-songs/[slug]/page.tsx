import type { Metadata } from "next";
import { db } from "@/lib/db";
import { userSongsTable, songRequestsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import MySongDetailClient from "./my-song-detail-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const songs = await db
    .select({
      song_request_id: userSongsTable.song_request_id,
      metadata: userSongsTable.metadata,
    })
    .from(userSongsTable)
    .where(eq(userSongsTable.slug, slug))
    .limit(1);

  if (!songs.length) {
    return { title: "Song Not Found | Melodia" };
  }

  const song = songs[0];
  const meta = song.metadata as Record<string, any> | null;
  const songTitle = meta?.title || "My Personalized Song";
  const occasion = meta?.occasion || "";

  // Fetch request details for richer metadata
  const requests = await db
    .select({
      recipient_details: songRequestsTable.recipient_details,
      occasion: songRequestsTable.occasion,
      languages: songRequestsTable.languages,
    })
    .from(songRequestsTable)
    .where(eq(songRequestsTable.id, song.song_request_id))
    .limit(1);

  const request = requests[0];
  const language = request?.languages || "";
  const displayOccasion = request?.occasion || occasion;

  const title = `${songTitle} | Melodia`;
  const description = displayOccasion
    ? `Listen to this personalized ${displayOccasion} song${language ? ` in ${language}` : ""} created on Melodia.`
    : `Listen to this personalized song${language ? ` in ${language}` : ""} created on Melodia.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.melodia-songs.com/my-songs/${slug}`,
      siteName: "Melodia",
      images: [
        {
          url: "/images/melodia-logo-og.jpeg",
          width: 792,
          height: 446,
          alt: songTitle,
        },
      ],
      locale: "en_IN",
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/melodia-logo-og.jpeg"],
    },
    alternates: {
      canonical: `/my-songs/${slug}`,
    },
  };
}

export default function MySongDetailBySlugPage({ params }: Props) {
  return <MySongDetailClient params={params} />;
}
