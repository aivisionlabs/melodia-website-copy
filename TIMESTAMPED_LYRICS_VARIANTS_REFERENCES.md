# References to `timestamped_lyrics_variants`

This document lists all places where `timestamped_lyrics_variants` is used in the codebase.

## 📋 Summary
- **Total references**: ~80 occurrences
- **Active code files**: ~25 files (excluding migrations and docs)

---

## 🗄️ Database Schema & Migrations

### Schema Definition
- **`src/lib/db/schema.ts:26`** - Field definition in `songsTable`
  ```typescript
  timestamped_lyrics_variants: jsonb('timestamped_lyrics_variants')
  ```

### Migration Files (Historical - can be ignored)
- Multiple migration snapshot files in `drizzle/migrations/meta/`
- `drizzle/migrations/0000_special_stick.sql:148`

---

## 🔧 Database Operations

### Update Operations
- **`src/lib/db/queries/update.ts:111-153`** - `updateTimestampedLyricsForVariant()` function
  - Reads current `timestamped_lyrics_variants`
  - Updates specific variant in the object
  - Writes back to database
  - **CRITICAL**: This is the main function that writes to this field

### Service Layer
- **`src/lib/db/services.ts`** - Multiple functions that read/return this field:
  - Line 22: `getSongByTaskId()`
  - Line 59: `getSongsForLibrary()` (sets to null)
  - Line 102: `getSongBySlug()`
  - Line 144: `getSongByTaskId()` (another instance)
  - Line 187: `getSongById()`

---

## 🎯 Server Actions

### Song Actions
- **`src/lib/actions/song.actions.ts`**:
  - **Line 242**: `getSongsForLibrary()` - Sets to `null` (not loaded for library view)
  - **Line 331-340**: `updateSongWithVariantsAction()` - Calls `updateTimestampedLyricsForVariant()` to store lyrics
  - **Line 566-575**: `getSongWithLyricsAction()` - **CRITICAL LOGIC**:
    ```typescript
    // If we have timestamped_lyrics_variants and a selected_variant,
    // use the selected variant's lyrics for timestamp_lyrics
    if (song.timestamped_lyrics_variants && song.selected_variant !== undefined && song.selected_variant !== null) {
      const variantLyrics = (song.timestamped_lyrics_variants as { [key: number]: any[] })[song.selected_variant];
      if (variantLyrics && Array.isArray(variantLyrics) && variantLyrics.length > 0) {
        timestampLyrics = variantLyrics;
      }
    }
    ```
    - This is the logic that causes the "Fix Lyrics" bug - it prioritizes variant lyrics over main `timestamp_lyrics`
  - **Line 585**: Returns `timestamped_lyrics_variants` in response

### Other Actions
- **`src/lib/actions/category.actions.ts:25`** - Sets to `null` (not loaded for library view)
- **`src/lib/actions/search.actions.ts`**:
  - Line 31: Sets to `null` (not loaded for library view)
  - Line 141: Sets to `null` (not loaded for library view)

---

## 🌐 API Routes

### Public APIs
- **`src/app/api/song-lyrics/[slug]/route.ts:40`** - Returns `timestamped_lyrics_variants` in response
- **`src/app/api/my-songs/[slug]/route.ts:71,108`**:
  - Line 71: Reads from `variant_timestamp_lyrics_processed`
  - Line 108: Returns `timestamped_lyrics_variants` in response

### Admin APIs
- **`src/app/api/admin/convert-to-library-song/route.ts:156,170`**:
  - Line 156: Reads from `userSong.variant_timestamp_lyrics_processed`
  - Line 170: Writes to `timestamped_lyrics_variants` when converting user song to library song

---

## 🎨 React Components

### Media Players
- **`src/components/MediaPlayer.tsx:36`** - Type definition in props
- **`src/components/FullPageMediaPlayer.tsx:46`** - Type definition in props

---

## 🪝 React Hooks

### useLyrics Hook
- **`src/hooks/useLyrics.ts`** - **CRITICAL USAGE**:
  - Line 16: Type definition
  - Line 29: Type definition in fetched lyrics
  - Line 98: Uses `song.timestamped_lyrics_variants` as fallback
  - Line 112: Stores in fetched lyrics state
  - Line 122: Dependency in useEffect
  - **Lines 155-176**: **MAIN LOGIC** - Uses `timestamped_lyrics_variants` as Priority 2 fallback:
    ```typescript
    // Priority 2: Use timestamped lyrics variants if available (fallback)
    const timestampedVariants =
      song.timestamped_lyrics_variants ||
      fetchedLyrics?.timestamped_lyrics_variants;
    if (timestampedVariants) {
      const selectedVariant = song.selected_variant !== undefined ? song.selected_variant : 0;
      let selectedVariantLyrics = timestampedVariants[selectedVariant];
      // ... fallback logic
    }
    ```

---

## 📄 Next.js Pages

### Library Pages
- **`src/app/library/page.tsx:495-496`** - Passes to component
- **`src/app/library/[songId]/page.tsx:119,141`** - Reads and passes to components

### Home Page
- **`src/app/page.tsx:375-376`** - Passes to component

---

## 📝 Type Definitions

- **`src/types/index.ts`**:
  - Line 23: `Song` interface
  - Line 56: Another type definition

- **`src/lib/user-content-client.ts:28`** - Type definition

---

## 🎛️ Constants

- **`src/lib/constants.ts`** - Multiple mock objects set to `null`:
  - Lines 20, 39, 58, 76, 94, 113

---

## 🔍 Key Issues Identified

### 1. Fix Lyrics Bug (Primary Issue)
**Location**: `src/lib/actions/song.actions.ts:566-575`

The `getSongWithLyricsAction()` function prioritizes `timestamped_lyrics_variants[selected_variant]` over the main `timestamp_lyrics` field. This means:
- When lyrics are fixed and saved to `timestamp_lyrics`, they get overwritten
- When "Fix Lyrics" is clicked again, it loads from `timestamped_lyrics_variants` instead of the fixed `timestamp_lyrics`

**Solution**: Remove the logic that prioritizes `timestamped_lyrics_variants` over `timestamp_lyrics` in `getSongWithLyricsAction()`.

### 2. useLyrics Hook Fallback
**Location**: `src/hooks/useLyrics.ts:155-176`

The hook uses `timestamped_lyrics_variants` as a fallback when `timestamp_lyrics` is not available. This might need adjustment if we remove `timestamped_lyrics_variants`.

### 3. Database Write Operations
**Location**: `src/lib/db/queries/update.ts:111-153`

The `updateTimestampedLyricsForVariant()` function is the only place that writes to `timestamped_lyrics_variants`. This function is called from `updateSongWithVariantsAction()`.

---

## 🗑️ Removal Strategy

To remove `timestamped_lyrics_variants`:

1. **Remove from schema** (`src/lib/db/schema.ts`)
2. **Remove update function** (`src/lib/db/queries/update.ts:111-153`)
3. **Fix `getSongWithLyricsAction()`** - Remove variant priority logic
4. **Update `useLyrics` hook** - Remove fallback to variants
5. **Update all type definitions** - Remove field from interfaces
6. **Update API routes** - Remove from responses
7. **Update components** - Remove from props/types
8. **Update service layer** - Remove field assignments
9. **Create migration** - Remove column from database (via Drizzle)

---

## ⚠️ Important Notes

- The field is used as a fallback mechanism when `timestamp_lyrics` is not available
- It's primarily used for storing lyrics for multiple song variants
- The main `timestamp_lyrics` field should be the single source of truth
- When removing, ensure all code paths use `timestamp_lyrics` directly






