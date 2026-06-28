/**
 * Blog author registry — the backbone of the E-E-A-T framework.
 *
 * Google's Helpful Content / E-E-A-T systems reward content that is clearly
 * attributable to a real person with demonstrable experience and expertise in
 * the subject. A 170+ post corpus authored by a single nameless byline (or by
 * "the Organization") reads as scaled, low-authority content.
 *
 * This registry gives every post a real Person author with a bio, role,
 * credentials, and external profiles (sameAs). Authors are mapped to the topic
 * clusters they actually own, so a devotional post is bylined by the person
 * with devotional-music expertise — exactly the "expertise" signal E-E-A-T
 * looks for. The mapping is deterministic (no DB column needed): every existing
 * and future post is covered automatically.
 *
 * To assign authors per-post in the DB later, add a nullable `author_id` column
 * to blog_posts and prefer it over `getAuthorForPost` when set.
 */

const BASE_URL = "https://www.melodia-songs.com";

export interface BlogAuthor {
  /** Stable slug, used in /blog/authors/<id> and as the assignment key. */
  id: string;
  name: string;
  /** Job title / role, shown in byline and Person schema `jobTitle`. */
  role: string;
  /** One-line credential line establishing topical authority (Expertise). */
  credentials: string;
  /** 2-3 sentence bio shown on the author box and author page. */
  bio: string;
  /** Public profile / social URLs — Person.sameAs (Authoritativeness). */
  sameAs: string[];
  /** Avatar path under /public. Falls back to the Melodia logo if missing. */
  avatar?: string;
}

export const BLOG_AUTHORS: Record<string, BlogAuthor> = {
  "minkesh-jain": {
    id: "minkesh-jain",
    name: "Minkesh Jain",
    role: "Co-founder & Product, Melodia",
    credentials:
      "Co-founder of Melodia. Builds the lyric-first AI song engine and has overseen the creation of thousands of personalized songs across 20+ Indian languages.",
    bio: "Minkesh co-founded Melodia and leads product. He works on the AI lyric and music pipeline day to day and writes about how personalized songs are made, what makes a custom gift land, and the craft behind turning a story into music.",
    sameAs: [
      "https://x.com/melodia_songs",
      "https://www.instagram.com/melodia.songs",
      "https://www.linkedin.com/company/melodia-songs",
    ],
    // Add a real headshot at /public/images/authors/minkesh-jain.jpg and set
    // `avatar: "/images/authors/minkesh-jain.jpg"` — real photos strengthen the
    // "real person" E-E-A-T signal. Until then the Melodia logo is used.
  },
  "saurabh-pareekh": {
    id: "saurabh-pareekh",
    name: "Saurabh Pareekh",
    role: "Co-founder, Melodia",
    credentials:
      "Co-founder of Melodia. Works closely with families and partners on weddings, anniversaries, and milestone celebrations across India.",
    bio: "Saurabh co-founded Melodia and spends his time with the people the songs are for — couples, parents, and event planners. He writes about celebration ideas, gifting, and the moments a song can make unforgettable.",
    sameAs: [
      "https://x.com/melodia_songs",
      "https://www.instagram.com/melodia.songs",
      "https://www.linkedin.com/company/melodia-songs",
    ],
    // Add /public/images/authors/saurabh-pareekh.jpg then set `avatar`.
  },
  "melodia-music-team": {
    id: "melodia-music-team",
    name: "The Melodia Music Team",
    role: "Lyricists & Music Producers",
    credentials:
      "Melodia's in-house team of lyricists and producers who write and compose custom songs in Hindi, Tamil, Telugu, Punjabi, Bengali, and 15+ more Indian languages — including devotional bhajans and regional festival music.",
    bio: "The Melodia music team writes lyrics and produces songs every day across languages and traditions, from sangeet showstoppers to temple bhajans. They share what they have learned about regional music, devotional forms, and writing words that feel personal.",
    sameAs: [
      "https://www.youtube.com/@melodia_songs_com",
      "https://www.instagram.com/melodia.songs",
    ],
    // Add /public/images/authors/melodia-music-team.jpg then set `avatar`.
  },
};

export const DEFAULT_AUTHOR_ID = "minkesh-jain";

/**
 * Map a topic cluster (blog category) to the author who owns it. Categories not
 * listed fall back to DEFAULT_AUTHOR_ID.
 *
 * The pairing reflects real expertise:
 *  - devotional / language / regional music → the music team (lyricists)
 *  - celebration / relationship occasions    → Saurabh (works with families)
 *  - product / how-to / AI craft              → Minkesh (builds the engine)
 */
const CATEGORY_AUTHOR: Record<string, string> = {
  devotional: "melodia-music-team",
  languages: "melodia-music-team",
  "how-to": "minkesh-jain",
  general: "minkesh-jain",
  birthday: "saurabh-pareekh",
  "mothers-day": "saurabh-pareekh",
  "fathers-day": "saurabh-pareekh",
  anniversary: "saurabh-pareekh",
  wedding: "saurabh-pareekh",
  retirement: "saurabh-pareekh",
};

/** Resolve the author for a post from its category (and slug, reserved for
 *  future per-slug overrides). Always returns a valid author. */
export function getAuthorForPost(category: string, _slug?: string): BlogAuthor {
  const id = CATEGORY_AUTHOR[category] ?? DEFAULT_AUTHOR_ID;
  return BLOG_AUTHORS[id] ?? BLOG_AUTHORS[DEFAULT_AUTHOR_ID];
}

export function getAuthorById(id: string): BlogAuthor | undefined {
  return BLOG_AUTHORS[id];
}

export function authorUrl(id: string): string {
  return `${BASE_URL}/blog/authors/${id}`;
}

export function authorAvatarUrl(author: BlogAuthor): string {
  return author.avatar
    ? `${BASE_URL}${author.avatar}`
    : `${BASE_URL}/images/melodia-logo-og.jpeg`;
}
