// Simple in-memory cache for library data
// In production, consider using Redis or similar external cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class LibraryCache {
  private cache = new Map<string, CacheEntry<any>>();

  // Cache TTL settings (in milliseconds)
  private readonly TTL = {
    SONGS: 5 * 60 * 1000, // 5 minutes
    CATEGORIES: 10 * 60 * 1000, // 10 minutes
    SEARCH: 2 * 60 * 1000, // 2 minutes
  };

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.TTL.SONGS,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache key generators
  getSongsKey(categorySlug?: string | null, limit?: number, offset?: number): string {
    return `songs:${categorySlug || 'all'}:${limit || 20}:${offset || 0}`;
  }

  getSearchKey(query: string, limit?: number, offset?: number): string {
    return `search:${query}:${limit || 20}:${offset || 0}`;
  }

  getCategoriesKey(): string {
    return 'categories:all';
  }

  getFuzzySearchDataKey(): string {
    return 'fuzzy-search:data';
  }

  // Invalidate related cache entries when data changes
  invalidateSongs(): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('songs:') || key.startsWith('search:') || key.startsWith('fuzzy-search:')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  invalidateCategories(): void {
    this.cache.delete(this.getCategoriesKey());
  }

  // Invalidate likes-related cache entries
  invalidateLikes(): void {
    // Invalidate all song-related caches since likes affect song data
    this.invalidateSongs();
    // Also invalidate categories since they might show like counts
    this.invalidateCategories();
  }
}

// Export singleton instance
export const libraryCache = new LibraryCache();

// Helper function to get cache TTL based on operation type
export function getCacheTTL(operation: 'songs' | 'categories' | 'search'): number {
  switch (operation) {
    case 'songs':
      return 5 * 60 * 1000; // 5 minutes
    case 'categories':
      return 10 * 60 * 1000; // 10 minutes
    case 'search':
      return 2 * 60 * 1000; // 2 minutes
    default:
      return 5 * 60 * 1000;
  }
}
