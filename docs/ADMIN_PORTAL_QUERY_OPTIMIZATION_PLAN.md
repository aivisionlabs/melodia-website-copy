# Admin Portal Query Optimization Plan

## Overview
The admin portal (`/song-admin-portal`) loads 4 heavy queries in parallel, causing database connection pool exhaustion and slow page loads. This document outlines the optimization plan.

## Current Issues

### 1. **getAllSongs()** - CRITICAL
**Location:** `src/lib/db/queries/select.ts:366-372`

**Problem:**
- Uses `.select()` which selects ALL columns including heavy JSONB fields:
  - `lyrics` (text, can be very large)
  - `timestamp_lyrics` (jsonb, large)
  - `timestamped_lyrics_variants` (jsonb, large)
  - `timestamped_lyrics_api_responses` (jsonb, large)
  - `suno_variants` (jsonb, large)
  - `metadata` (jsonb, large)
- These fields are NOT needed for the admin portal list view
- Only needed when editing/viewing individual songs

**Fields Actually Used by SongList Component:**
- `id`, `title`, `slug`, `created_at`
- `music_style`, `service_provider`, `status`
- `song_requester`, `categories`, `tags`
- `lyrics` (only when editing, loaded separately via `getSongWithLyricsAction`)

**Impact:**
- High memory usage
- Slow query execution
- Network transfer overhead
- Connection pool exhaustion

---

### 2. **getAllSongRequests()** - HIGH PRIORITY
**Location:** `src/lib/db/queries/select.ts:474-600`

**Problem:**
- Makes **5 separate database queries**:
  1. Main query with multiple LEFT JOINs
  2. Separate query for change requests (`changeRequestsTable`)
  3. Separate query for latest lyrics drafts (`lyricsDraftsTable`)
  4. Separate query to check which requests have lyrics
  5. Separate query for linked songs (`songRequestSongsTable`)

**Optimization Opportunities:**
- Combine queries 2-4 into a single query with subqueries or CTEs
- Use window functions for latest lyrics draft instead of separate query
- Use array aggregation for change requests and linked songs

**Impact:**
- 5x database round trips
- Connection pool exhaustion
- Slow page load

---

### 3. **getAllUserSongsForAdmin()** - MEDIUM PRIORITY
**Location:** `src/lib/db/queries/select.ts:603-703`

**Problem:**
- Selects all columns from `userSongsTable` including JSONB fields:
  - `song_variants` (jsonb, large)
  - `variant_timestamp_lyrics_api_response` (jsonb, large)
  - `variant_timestamp_lyrics_processed` (jsonb, large)
  - `metadata` (jsonb, large)
- Only needs `variant_count` (derived from `song_variants`), not the full JSONB

**Fields Actually Used:**
- `id`, `slug`, `status`, `created_at`
- `selected_variant`
- `variant_count` (derived from `song_variants`)
- `metadata.title` (only title from metadata)
- Related data from joins (request, user, lyricsDraft, librarySong, payment)

**Impact:**
- Unnecessary data transfer
- Memory overhead

---

### 4. **getPaymentAnalytics()** - HIGH PRIORITY
**Location:** `src/lib/db/queries/select.ts:706-900`

**Problem:**
- Makes **7 separate database queries**:
  1. Paid songs count and revenue
  2. Paid requests count and revenue
  3. Payment status breakdown
  4. Total revenue query
  5. Recent payments (last 30 days)
  6. Daily revenue breakdown (last 30 days)
  7. Daily paid songs count (last 30 days)
  8. Daily paid requests count (last 30 days)

**Optimization Opportunities:**
- Use Common Table Expressions (CTEs) to combine queries
- Use a single query with multiple aggregations
- Use window functions for daily breakdowns

**Impact:**
- 7x database round trips
- Connection pool exhaustion
- Slow analytics load

---

## Optimization Plan

### Phase 1: Quick Wins (Immediate Impact)

#### 1.1 Optimize `getAllSongs()` for Admin Portal
**Priority:** CRITICAL
**Effort:** Low (1-2 hours)
**Impact:** High

**Action:**
- Create `getAllSongsForAdmin()` function that selects only needed columns
- Exclude: `lyrics`, `timestamp_lyrics`, `timestamped_lyrics_variants`, `timestamped_lyrics_api_responses`, `suno_variants`, `metadata`
- Keep: `id`, `title`, `slug`, `created_at`, `music_style`, `service_provider`, `status`, `song_requester`, `categories`, `tags`, `is_deleted`, `add_to_library`, `sequence`, `show_lyrics`, `likes_count`, `download_allowed`

**Implementation:**
```typescript
export async function getAllSongsForAdmin(): Promise<SelectSong[]> {
  return db
    .select({
      id: songsTable.id,
      created_at: songsTable.created_at,
      title: songsTable.title,
      music_style: songsTable.music_style,
      service_provider: songsTable.service_provider,
      song_requester: songsTable.song_requester,
      slug: songsTable.slug,
      status: songsTable.status,
      categories: songsTable.categories,
      tags: songsTable.tags,
      is_deleted: songsTable.is_deleted,
      add_to_library: songsTable.add_to_library,
      sequence: songsTable.sequence,
      show_lyrics: songsTable.show_lyrics,
      likes_count: songsTable.likes_count,
      download_allowed: songsTable.download_allowed,
      // Exclude heavy fields: lyrics, timestamp_lyrics, timestamped_lyrics_variants,
      // timestamped_lyrics_api_responses, suno_variants, metadata
    })
    .from(songsTable)
    .where(eq(songsTable.is_deleted, false))
    .orderBy(sql`${songsTable.created_at} DESC`);
}
```

**Update:** `src/lib/db/services.ts` to use new function for admin portal

---

#### 1.2 Optimize `getAllUserSongsForAdmin()`
**Priority:** MEDIUM
**Effort:** Low (1 hour)
**Impact:** Medium

**Action:**
- Select only needed columns from `userSongsTable`
- Use `jsonb_array_length()` or `jsonb_object_keys()` to get variant count without loading full JSONB
- Extract only `title` from metadata using JSONB operators

**Implementation:**
```typescript
export async function getAllUserSongsForAdmin() {
  const userSongsWithData = await db
    .select({
      song: {
        id: userSongsTable.id,
        slug: userSongsTable.slug,
        status: userSongsTable.status,
        created_at: userSongsTable.created_at,
        selected_variant: userSongsTable.selected_variant,
        // Get variant count without loading full JSONB
        variant_count: sql<number>`COALESCE(jsonb_array_length(${userSongsTable.song_variants}), 0)`,
        // Extract title from metadata
        metadata_title: sql<string | null>`${userSongsTable.metadata}->>'title'`,
      },
      // ... rest of joins
    })
    // ... rest of query
}
```

---

### Phase 2: Query Consolidation (High Impact)

#### 2.1 Optimize `getAllSongRequests()`
**Priority:** HIGH
**Effort:** Medium (3-4 hours)
**Impact:** High

**Action:**
- Combine multiple queries into fewer queries using:
  - Window functions for latest lyrics draft
  - Array aggregation for change requests
  - Array aggregation for linked songs
  - Subqueries or CTEs

**Implementation Strategy:**
```sql
-- Use window functions for latest lyrics draft
WITH latest_lyrics AS (
  SELECT DISTINCT ON (song_request_id)
    song_request_id,
    music_style,
    version
  FROM lyrics_drafts
  ORDER BY song_request_id, version DESC
),
change_requests_agg AS (
  SELECT
    song_request_id,
    array_agg(jsonb_build_object(...)) as change_requests
  FROM change_requests
  GROUP BY song_request_id
),
linked_songs_agg AS (
  SELECT
    song_request_id,
    array_agg(songs.*) as linked_songs
  FROM song_request_songs
  JOIN songs ON songs.id = song_request_songs.song_id
  GROUP BY song_request_id
)
SELECT
  sr.*,
  ll.music_style,
  cr.change_requests,
  ls.linked_songs,
  EXISTS(SELECT 1 FROM lyrics_drafts WHERE song_request_id = sr.id) as has_lyrics
FROM song_requests sr
LEFT JOIN latest_lyrics ll ON ll.song_request_id = sr.id
LEFT JOIN change_requests_agg cr ON cr.song_request_id = sr.id
LEFT JOIN linked_songs_agg ls ON ls.song_request_id = sr.id
-- ... other joins
```

---

#### 2.2 Optimize `getPaymentAnalytics()`
**Priority:** HIGH
**Effort:** Medium (3-4 hours)
**Impact:** High

**Action:**
- Combine all 7 queries into 1-2 queries using CTEs
- Use conditional aggregation for different metrics

**Implementation Strategy:**
```sql
WITH payment_metrics AS (
  SELECT
    -- Paid songs metrics
    COUNT(DISTINCT CASE WHEN us.id IS NOT NULL THEN us.id END) as paid_songs_count,
    COALESCE(SUM(CASE WHEN us.id IS NOT NULL THEN p.amount END), 0) as paid_songs_revenue,

    -- Paid requests metrics
    COUNT(DISTINCT CASE WHEN sr.id IS NOT NULL THEN sr.id END) as paid_requests_count,
    COALESCE(SUM(CASE WHEN sr.id IS NOT NULL THEN p.amount END), 0) as paid_requests_revenue,

    -- Total revenue
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_revenue,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as total_completed_payments,

    -- Recent payments (last 30 days)
    COUNT(CASE WHEN p.status = 'completed' AND p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_payments_count,
    COALESCE(SUM(CASE WHEN p.status = 'completed' AND p.created_at >= NOW() - INTERVAL '30 days' THEN p.amount END), 0) as recent_payments_revenue
  FROM payments p
  LEFT JOIN user_songs us ON us.payment_id = p.id
  LEFT JOIN song_requests sr ON sr.id = p.song_request_id
  WHERE p.status = 'completed'
),
daily_breakdown AS (
  SELECT
    DATE(p.created_at) as date,
    COALESCE(SUM(p.amount), 0) as revenue,
    COUNT(*) as payment_count,
    COUNT(DISTINCT us.id) as paid_songs,
    COUNT(DISTINCT sr.id) as paid_requests
  FROM payments p
  LEFT JOIN user_songs us ON us.payment_id = p.id
  LEFT JOIN song_requests sr ON sr.id = p.song_request_id
  WHERE p.status = 'completed'
    AND p.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(p.created_at)
),
payment_status_breakdown AS (
  SELECT
    status,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount
  FROM payments
  GROUP BY status
)
SELECT * FROM payment_metrics, payment_status_breakdown, daily_breakdown;
```

---

### Phase 3: Additional Optimizations

#### 3.1 Add Database Indexes
**Priority:** MEDIUM
**Effort:** Low (30 minutes)
**Impact:** Medium

**Action:**
- Add indexes on frequently queried columns:
  - `songs.is_deleted` (already filtered)
  - `songs.created_at` (used for ordering)
  - `song_requests.created_at` (used for ordering)
  - `user_songs.is_deleted` (used in WHERE clause)
  - `user_songs.created_at` (used for ordering)
  - `payments.status` (used in WHERE clause)
  - `payments.created_at` (used in WHERE clause and date filtering)
  - `lyrics_drafts.song_request_id` (used in joins)
  - `lyrics_drafts.version` (used for latest draft)

**Check existing indexes first:**
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('songs', 'song_requests', 'user_songs', 'payments', 'lyrics_drafts');
```

---

#### 3.2 Implement Pagination
**Priority:** LOW (Future)
**Effort:** High (1-2 days)
**Impact:** High (for large datasets)

**Action:**
- Add pagination to admin portal queries
- Load data on-demand instead of all at once
- Use cursor-based or offset-based pagination

---

#### 3.3 Add Query Result Caching
**Priority:** LOW (Future)
**Effort:** Medium (1 day)
**Impact:** Medium

**Action:**
- Cache query results for analytics (changes infrequently)
- Use Redis or in-memory cache
- Invalidate cache on data updates

---

## Implementation Order

1. ✅ **Phase 1.1: Optimize getAllSongs()** - CRITICAL, Quick Win
2. ✅ **Phase 1.2: Optimize getAllUserSongsForAdmin()** - MEDIUM, Quick Win
3. ✅ **Phase 2.1: Optimize getAllSongRequests()** - HIGH, High Impact
4. ✅ **Phase 2.2: Optimize getPaymentAnalytics()** - HIGH, High Impact
5. ⏳ **Phase 3.1: Add Database Indexes** - MEDIUM, Low Effort
6. ⏳ **Phase 3.2: Implement Pagination** - LOW, Future
7. ⏳ **Phase 3.3: Add Query Result Caching** - LOW, Future

---

## Expected Results

### Before Optimization:
- **Database Queries:** 4 functions × multiple queries = ~15+ queries
- **Data Transfer:** ~50-100MB+ (with JSONB fields)
- **Page Load Time:** 3-5 seconds
- **Connection Pool:** Exhausted (max connections reached)

### After Phase 1 (Quick Wins):
- **Database Queries:** ~10 queries (reduced by excluding heavy fields)
- **Data Transfer:** ~5-10MB (80-90% reduction)
- **Page Load Time:** 1-2 seconds (50-60% improvement)
- **Connection Pool:** Stable (within limits)

### After Phase 2 (Query Consolidation):
- **Database Queries:** 4-5 queries (70-80% reduction)
- **Data Transfer:** ~5-10MB (maintained)
- **Page Load Time:** 0.5-1 second (80-90% improvement)
- **Connection Pool:** Healthy (well within limits)

---

## Testing Checklist

- [ ] Verify admin portal loads without errors
- [ ] Verify all tabs display correctly (requests, songs, user-songs, analytics)
- [ ] Verify search/filter functionality works
- [ ] Verify song editing still works (lyrics loaded separately)
- [ ] Verify analytics data is accurate
- [ ] Monitor database connection pool usage
- [ ] Check query execution times in database logs
- [ ] Test with large datasets (1000+ songs, 500+ requests)

---

## Notes

- Keep backward compatibility: Don't break existing `getAllSongs()` function
- Create new optimized functions with `ForAdmin` suffix
- Update `src/lib/db/services.ts` to use optimized functions for admin portal
- Document any schema changes or new indexes needed
- Consider adding query performance monitoring

