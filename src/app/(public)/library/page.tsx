import {
  getActiveSongsAction,
  getPersonaSongsByCategoryAction,
} from "@/lib/actions/song.actions";
import { getCategoriesWithCountsAction } from "@/lib/actions/category.actions";
import { StructuredData } from "@/components/StructuredData";
import LibraryClient from "./LibraryClient";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SongLibraryPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const initialSearchQuery =
    typeof params?.q === "string" ? params.q.trim() : "";
  const SONGS_PER_PAGE = 20;

  const [catsRes, songsRes, personaSongsRes] = await Promise.all([
    getCategoriesWithCountsAction(),
    getActiveSongsAction(SONGS_PER_PAGE, 0),
    getPersonaSongsByCategoryAction(null, 12, 0),
  ]);

  const initialCategories = catsRes.success
    ? [
        { name: "All", slug: "all", count: catsRes.total, sequence: -1 },
        ...catsRes.categories.map((c) => ({
          name: c.name,
          slug: c.slug,
          count: c.count,
          sequence: c.sequence,
        })),
      ]
    : [
        {
          name: "All",
          slug: "all",
          count: songsRes.success ? songsRes.total : 0,
          sequence: -1,
        },
      ];

  const initialSongs = songsRes.success ? songsRes.songs || [] : [];
  const initialTotalSongs = songsRes.success ? songsRes.total : 0;
  const initialHasMore = songsRes.success ? songsRes.hasMore : false;
  const initialPersonaSongs = personaSongsRes.success
    ? personaSongsRes.songs || []
    : [];

  // Best-effort image extraction for schema
  const itemListItems = initialSongs.slice(0, 12).map((song) => {
    const variants: any = song.suno_variants as any;
    const imageUrl =
      variants && typeof variants === "object" && "sourceImageUrl" in variants
        ? variants.sourceImageUrl
        : Array.isArray(variants) && variants.length > 0
          ? variants[0]?.sourceImageUrl
          : null;

    return {
      name: song.title,
      url: `/song/${song.slug}`,
      imageUrl,
    };
  });

  return (
    <>
      {/* Helps Google understand this page is a list of songs */}
      <StructuredData type="itemList" itemListItems={itemListItems} />

      <LibraryClient
        initialSongs={initialSongs}
        initialPersonaSongs={initialPersonaSongs}
        initialCategories={initialCategories}
        initialTotalSongs={initialTotalSongs}
        initialHasMore={initialHasMore}
        initialSearchQuery={initialSearchQuery}
      />
    </>
  );
}
