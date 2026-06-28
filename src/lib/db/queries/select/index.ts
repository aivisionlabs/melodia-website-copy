/**
 * Select queries index - Re-exports all query functions for backward compatibility
 *
 * This file maintains the same public API as the original select.ts file,
 * allowing all existing imports to work without modification.
 *
 * The queries have been split into modular files:
 * - songs-library.ts: Public library song queries
 * - songs-admin.ts: Admin song management queries
 * - categories.ts: Category queries
 * - song-requests.ts: Admin song request queries
 * - user-songs.ts: Admin user song queries
 * - analytics.ts: Payment analytics queries
 * - types.ts: Shared TypeScript types
 */

// =============================================================================
// Type exports
// =============================================================================
export type {
  LibrarySongRow,
  AdminSongRow,
  AdminUserSongRow,
  PaymentAnalyticsData
} from './types';

// =============================================================================
// Library song queries (public-facing)
// =============================================================================
export type { SongWithRequestContext } from './songs-library';
export {
  getAllSongsPaginated,
  getSongBySlug,
  getSongBySlugLightweight,
  getSongBySlugAll,
  getSongById,
  getSongByTaskId,
  getSongByIdQuery,
  getSongsByCategorySlugPaginated,
  getSongsByLanguagePaginated,
  searchSongsPaginated,
  getAllSongs,
  getSongsByCategorySlug,
  searchSongs,
  getAllSongsForFuzzySearch,
  getAllSongsWithCategoriesForFuzzySearch,
  getSongsWithPersonaPaginated,
  getSongsWithPersonaByCategorySlugPaginated,
  getActiveSongsCount,
} from './songs-library';

// =============================================================================
// Admin song queries
// =============================================================================
export {
  getAllSongsForAdminQuery,
  getAllSongsForAdminPaginated,
} from './songs-admin';

// =============================================================================
// Category queries
// =============================================================================
export {
  getCategoriesWithCounts,
  getCategoriesWithTemplateCounts,
  getCategoryBySlug,
  listAllCategories,
} from './categories';

// =============================================================================
// Song request queries (admin)
// =============================================================================
export {
  getAllSongRequests,
  getAllSongRequestsPaginated,
} from './song-requests';

export type { SongRequestWithRelations, RequestFilters } from './song-requests';

// Lightweight optimized query for initial dashboard load
export {
  getAllSongRequestsLightweight,
} from './song-requests-lightweight';

export type { LightweightSongRequest } from './song-requests-lightweight';

// =============================================================================
// User song queries (admin)
// =============================================================================
export {
  getAllUserSongsForAdmin,
  getAllUserSongsForAdminPaginated,
} from './user-songs';

// =============================================================================
// Analytics queries
// =============================================================================
export {
  getPaymentAnalytics,
} from './analytics';

// =============================================================================
// Templated song usage analytics
// =============================================================================
export {
  getTemplatedSongUsageStats,
} from './templated-song-usage';
export type {
  TemplatedSongUsageStat,
  TemplatedSongUsageSummary,
} from './templated-song-usage';

