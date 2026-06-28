import Fuse, { IFuseOptions, FuseResult } from 'fuse.js';
import { Song } from '@/types';

export interface SearchableSong {
  id: number;
  title: string;
  song_description?: string | null;
  music_style?: string | null;
  service_provider?: string | null;
  categories?: string[] | null;
  categoryNames?: string[] | null; // NEW: Flattened category names for better search
  tags?: string[] | null;
  slug: string;
}

// Configure Fuse.js options for optimal song search
// Title is given highest priority (0.8) to ensure title matches appear first
const fuseOptions: IFuseOptions<SearchableSong> = {
  keys: [
    {
      name: 'title',
      weight: 0.8  // Increased from 0.5 to prioritize title matches
    },
    {
      name: 'song_description',
      weight: 0.1  // Reduced from 0.2 to lower priority
    },
    {
      name: 'categoryNames',
      weight: 0.05  // Reduced from 0.2 to lower priority
    },
    {
      name: 'music_style',
      weight: 0.03  // Reduced from 0.06
    },
    {
      name: 'service_provider',
      weight: 0.01  // Reduced from 0.02
    },
    {
      name: 'categories',
      weight: 0.005  // Reduced from 0.015
    },
    {
      name: 'tags',
      weight: 0.005  // Reduced from 0.015
    }
  ],
  threshold: 0.35,
  distance: 200,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: true,
  ignoreLocation: true,
  ignoreFieldNorm: true,
  useExtendedSearch: false,
};

export class FuzzySongSearch {
  private fuse: Fuse<SearchableSong>;
  private songs: SearchableSong[] = [];

  constructor(songs: SearchableSong[]) {
    this.songs = songs;
    this.fuse = new Fuse(songs, fuseOptions);
  }

  /**
   * Perform fuzzy search on songs
   * @param query - Search query string
   * @param limit - Maximum number of results to return (default: 50)
   * @returns Array of search results with scores
   */
  search(query: string, limit: number = 50): FuseResult<SearchableSong>[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Use plain fuzzy search; extended mode can mis-rank simple queries
    const results = this.fuse.search(trimmedQuery);

    // Apply additional filtering and scoring
    const filteredResults = this.applyAdditionalScoring(results, trimmedQuery);

    return filteredResults.slice(0, limit);
  }

  /**
   * Build extended search query for better matching
   */
  private buildExtendedQuery(query: string): string {
    const words = query.split(/\s+/).filter(word => word.length > 0);

    if (words.length === 1) {
      // Single word - use fuzzy matching
      return words[0];
    } else {
      // Multiple words - require all words to match (AND logic)
      return words.map(word => `'${word}`).join(' ');
    }
  }

  /**
   * Apply additional scoring based on various factors
   */
  private applyAdditionalScoring(
    results: FuseResult<SearchableSong>[],
    originalQuery: string
  ): FuseResult<SearchableSong>[] {
    const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const words = originalQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0);

    return results.map(result => {
      let additionalScore = 0;
      const item = result.item;
      const query = originalQuery.toLowerCase();

      const titleLc = item.title.toLowerCase();
      const descLc = item.song_description?.toLowerCase() || '';

      // Track if title has any match (for priority sorting)
      let hasTitleMatch = false;

      // Strong boosts for title relevance - highest priority
      if (titleLc === query) {
        additionalScore += 0.8; // exact title match - very strong boost
        hasTitleMatch = true;
      } else if (titleLc.startsWith(query)) {
        additionalScore += 0.5; // prefix in title - strong boost
        hasTitleMatch = true;
      } else {
        const wb = new RegExp(`\\b${escapeRegex(query)}\\b`, 'i');
        if (wb.test(item.title)) {
          additionalScore += 0.35; // whole word in title - increased boost
          hasTitleMatch = true;
        } else if (titleLc.includes(query)) {
          additionalScore += 0.25; // substring in title - increased boost
          hasTitleMatch = true;
        }
      }

      // Per-word coverage boosts (favor titles covering more query words)
      if (words.length > 1) {
        const titleWords = new Set(titleLc.split(/\s+/));
        const covered = words.filter(w => titleWords.has(w)).length;
        if (covered > 0) {
          additionalScore += Math.min(0.2, covered * 0.06); // Increased boost
          hasTitleMatch = true;
        }
      }

      // Description relevance
      if (descLc) {
        if (descLc.includes(query)) {
          const wbDesc = new RegExp(`\\b${escapeRegex(query)}\\b`, 'i');
          additionalScore += wbDesc.test(descLc) ? 0.06 : 0.04;
        }
      }

      // Style match
      if (item.music_style?.toLowerCase().includes(query)) {
        additionalScore += 0.03;
      }

      // Category array match
      if (item.categories?.some((cat: string) => cat.toLowerCase().includes(query))) {
        additionalScore += 0.02;
      }

      // Category names with stronger weighting for exact/prefix
      if (item.categoryNames && item.categoryNames.length > 0) {
        const catsLc = item.categoryNames.map(n => n.toLowerCase());
        if (catsLc.some(n => n === query)) {
          additionalScore += 0.15;
        } else if (catsLc.some(n => n.startsWith(query))) {
          additionalScore += 0.1;
        } else if (catsLc.some(n => n.includes(query))) {
          additionalScore += 0.06;
        }
      }

      // Tags
      if (item.tags?.some((tag: string) => tag.toLowerCase().includes(query))) {
        additionalScore += 0.02;
      }

      // Subtle bonus for richer metadata
      let completenessScore = 0;
      if (item.song_description) completenessScore += 0.005;
      if (item.music_style) completenessScore += 0.005;
      if (item.categories && item.categories.length > 0) completenessScore += 0.005;
      if (item.tags && item.tags.length > 0) completenessScore += 0.005;

      const adjustedScore = Math.max(0, (result.score || 1) - additionalScore - completenessScore);

      return {
        ...result,
        score: adjustedScore,
        hasTitleMatch: hasTitleMatch
      };
    }).sort((a, b) => {
      // First, prioritize results with title matches
      const aHasTitleMatch = (a as any).hasTitleMatch || false;
      const bHasTitleMatch = (b as any).hasTitleMatch || false;

      if (aHasTitleMatch && !bHasTitleMatch) {
        return -1; // a comes first (title match)
      }
      if (!aHasTitleMatch && bHasTitleMatch) {
        return 1; // b comes first (title match)
      }

      // If both have title matches or both don't, sort by score (lower is better)
      return (a.score || 1) - (b.score || 1);
    });
  }

  /**
   * Get search suggestions based on partial input
   * @param query - Partial search query
   * @param limit - Maximum number of suggestions
   * @returns Array of suggestion strings
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const trimmedQuery = query.trim().toLowerCase();
    const suggestions = new Set<string>();

    // Extract suggestions from titles
    this.songs.forEach(song => {
      const title = song.title.toLowerCase();
      if (title.includes(trimmedQuery)) {
        // Find the word that contains the query
        const words = song.title.split(/\s+/);
        words.forEach(word => {
          if (word.toLowerCase().includes(trimmedQuery) && word.length > trimmedQuery.length) {
            suggestions.add(word);
          }
        });
      }
    });

    // Extract suggestions from descriptions
    this.songs.forEach(song => {
      if (song.song_description) {
        const description = song.song_description.toLowerCase();
        if (description.includes(trimmedQuery)) {
          const words = song.song_description.split(/\s+/);
          words.forEach(word => {
            if (word.toLowerCase().includes(trimmedQuery) && word.length > trimmedQuery.length) {
              suggestions.add(word);
            }
          });
        }
      }
    });

    // Extract suggestions from music styles
    this.songs.forEach(song => {
      if (song.music_style) {
        const style = song.music_style.toLowerCase();
        if (style.includes(trimmedQuery)) {
          suggestions.add(song.music_style);
        }
      }
    });

    // Extract suggestions from category names
    this.songs.forEach(song => {
      if (song.categoryNames) {
        song.categoryNames.forEach(categoryName => {
          const category = categoryName.toLowerCase();
          if (category.includes(trimmedQuery)) {
            suggestions.add(categoryName);
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Update the songs data
   */
  updateSongs(songs: SearchableSong[]): void {
    this.songs = songs;
    this.fuse = new Fuse(songs, fuseOptions);
  }

  /**
   * Get all songs (for fallback)
   */
  getAllSongs(): SearchableSong[] {
    return this.songs;
  }
}

/**
 * Convert Song type to SearchableSong type
 */
export function songToSearchable(song: Song): SearchableSong {
  return {
    id: song.id,
    title: song.title,
    song_description: song.song_description,
    music_style: song.music_style,
    service_provider: song.service_provider,
    categories: song.categories,
    tags: song.tags,
    slug: song.slug,
  };
}

/**
 * Convert SearchableSong back to Song type
 */
export function searchableToSong(searchableSong: SearchableSong, originalSong: Song): Song {
  return {
    ...originalSong,
    id: searchableSong.id,
    title: searchableSong.title,
    song_description: searchableSong.song_description ?? null,
    music_style: searchableSong.music_style ?? null,
    service_provider: searchableSong.service_provider ?? null,
    categories: searchableSong.categories ?? undefined,
    tags: searchableSong.tags ?? undefined,
    slug: searchableSong.slug,
  };
}
