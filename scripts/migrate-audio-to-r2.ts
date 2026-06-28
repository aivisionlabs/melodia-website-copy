/**
 * One-time migration: download all Suno CDN audio/cover files and re-host on Cloudflare R2.
 *
 * Tables processed:
 *   songs               → suno_variants (JSONB array), song_url derived from selected variant
 *   user_songs          → song_variants (JSONB array)
 *   templated_songs     → song_variants (JSONB array)
 *   templated_song_instances → song_variants (JSONB array)
 *
 * songs.song_url and songs.song_url_variant_1 are NOT uploaded separately — they are derived
 * from the migrated suno_variants:
 *   song_url          = suno_variants[selected_variant].audioUrl  (the chosen variant)
 *   song_url_variant_1 = suno_variants[0].audioUrl               (always first variant)
 *
 * Control flags (env vars):
 *   DRY_RUN=true          Log what would change, no DB writes (default: false)
 *   SKIP_EXISTING=true    Skip records already fully on R2 (default: true)
 *   TABLE=songs           Process only one table
 *   LIMIT=50              Max records per table
 *   START_FROM_ID=N       Only process records with id >= N
 *   CONCURRENCY=3         Parallel records processed at once (default: 3)
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/migrate-audio-to-r2.ts dotenv_config_path=.env.local
 *   DRY_RUN=true npx tsx -r dotenv/config scripts/migrate-audio-to-r2.ts dotenv_config_path=.env.local
 *   TABLE=songs LIMIT=5 npx tsx -r dotenv/config scripts/migrate-audio-to-r2.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import {
  songsTable,
  userSongsTable,
  templatedSongsTable,
  templatedSongInstancesTable,
} from '../src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  isSunoUrl,
  isFullyMigrated,
  migrateVariantsToR2,
  deriveSongUrlsFromVariants,
} from '../src/lib/storage/audio-migration';

// =============================================================================
// Config
// =============================================================================

const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_EXISTING = process.env.SKIP_EXISTING !== 'false'; // default true
const TABLE = process.env.TABLE ?? null;
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const START_FROM_ID = process.env.START_FROM_ID ? parseInt(process.env.START_FROM_ID, 10) : undefined;
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 3;

// =============================================================================
// Helpers
// =============================================================================

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface TableStats {
  total: number;
  skipped: number;
  migrated: number;
  failed: number;
  filesMigrated: number;
}

// =============================================================================
// Table processors
// =============================================================================

async function processSongs(stats: TableStats) {
  console.log('\n── songs ──────────────────────────────────────────────────');

  let rows = await db
    .select({
      id: songsTable.id,
      suno_variants: songsTable.suno_variants,
      song_url: songsTable.song_url,
      song_url_variant_1: songsTable.song_url_variant_1,
      selected_variant: songsTable.selected_variant,
    })
    .from(songsTable)
    .where(eq(songsTable.is_deleted, false))
    .orderBy(songsTable.id);

  if (START_FROM_ID) rows = rows.filter((r) => r.id >= START_FROM_ID!);

  if (SKIP_EXISTING) {
    rows = rows.filter((r) => {
      // Need migration if suno_variants still has any Suno URLs
      const variantsNeedMigration = Array.isArray(r.suno_variants) &&
        r.suno_variants.length > 0 &&
        !isFullyMigrated(r.suno_variants as unknown[]);
      // Also need migration if song_url still points to Suno
      const songUrlNeedsMigration = r.song_url && isSunoUrl(r.song_url);
      return variantsNeedMigration || !!songUrlNeedsMigration;
    });
  }

  if (LIMIT) rows = rows.slice(0, LIMIT);

  stats.total += rows.length;
  console.log(`  ${rows.length} songs to process`);

  const batches = chunk(rows, CONCURRENCY);
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (row) => {
        try {
          const updates: Record<string, unknown> = {};
          let filesInRecord = 0;

          // --- suno_variants JSONB ---
          if (Array.isArray(row.suno_variants) && row.suno_variants.length > 0) {
            if (!isFullyMigrated(row.suno_variants as unknown[])) {
              if (!DRY_RUN) {
                const result = await migrateVariantsToR2('library-songs', row.id, row.suno_variants);
                updates.suno_variants = result.updated;
                filesInRecord += result.migratedCount;

                // Derive song_url and song_url_variant_1 from migrated variants
                const { songUrl, songUrlVariant1 } = deriveSongUrlsFromVariants(
                  result.updated as unknown[],
                  row.selected_variant,
                );
                if (songUrl) updates.song_url = songUrl;
                if (songUrlVariant1) updates.song_url_variant_1 = songUrlVariant1;
              } else {
                const variantCount = (row.suno_variants as unknown[]).length;
                filesInRecord += variantCount * 2; // audio + cover per variant
                console.log(`  [DRY] songs #${row.id}: would migrate ${variantCount} variants, derive song_url`);
              }
            }
          }

          if (!DRY_RUN && Object.keys(updates).length > 0) {
            await db.update(songsTable).set(updates).where(eq(songsTable.id, row.id));
          }

          if (filesInRecord > 0) {
            console.log(`  ✓ songs #${row.id} — ${filesInRecord} file(s) migrated`);
            stats.migrated++;
            stats.filesMigrated += filesInRecord;
          } else {
            stats.skipped++;
          }
        } catch (err) {
          console.error(`  ✗ songs #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
          stats.failed++;
        }
      }),
    );
    await sleep(500);
  }
}

async function processUserSongs(stats: TableStats) {
  console.log('\n── user_songs ─────────────────────────────────────────────');

  let rows = await db
    .select({ id: userSongsTable.id, song_variants: userSongsTable.song_variants })
    .from(userSongsTable)
    .where(eq(userSongsTable.status, 'completed'))
    .orderBy(userSongsTable.id);

  if (START_FROM_ID) rows = rows.filter((r) => r.id >= START_FROM_ID!);

  if (SKIP_EXISTING) {
    rows = rows.filter((r) => !isFullyMigrated(r.song_variants as unknown[]));
  }

  if (LIMIT) rows = rows.slice(0, LIMIT);

  stats.total += rows.length;
  console.log(`  ${rows.length} user_songs to process`);

  const batches = chunk(rows, CONCURRENCY);
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (row) => {
        try {
          if (!Array.isArray(row.song_variants) || row.song_variants.length === 0) {
            stats.skipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`  [DRY] user_songs #${row.id}: would migrate ${row.song_variants.length} variants`);
            stats.migrated++;
            stats.filesMigrated += (row.song_variants as unknown[]).length * 2;
            return;
          }

          const result = await migrateVariantsToR2('customer-songs', row.id, row.song_variants);
          if (result.migratedCount > 0) {
            await db
              .update(userSongsTable)
              .set({ song_variants: result.updated })
              .where(eq(userSongsTable.id, row.id));
            console.log(`  ✓ user_songs #${row.id} — ${result.migratedCount} file(s) migrated`);
            stats.migrated++;
            stats.filesMigrated += result.migratedCount;
          } else {
            stats.skipped++;
          }
        } catch (err) {
          console.error(`  ✗ user_songs #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
          stats.failed++;
        }
      }),
    );
    await sleep(500);
  }
}

async function processTemplatedSongs(stats: TableStats) {
  console.log('\n── templated_songs ────────────────────────────────────────');

  let rows = await db
    .select({ id: templatedSongsTable.id, song_variants: templatedSongsTable.song_variants })
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.is_active, true))
    .orderBy(templatedSongsTable.id);

  if (START_FROM_ID) rows = rows.filter((r) => r.id >= START_FROM_ID!);

  if (SKIP_EXISTING) {
    rows = rows.filter((r) => !isFullyMigrated(r.song_variants as unknown[]));
  }

  if (LIMIT) rows = rows.slice(0, LIMIT);

  stats.total += rows.length;
  console.log(`  ${rows.length} templated_songs to process`);

  const batches = chunk(rows, CONCURRENCY);
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (row) => {
        try {
          if (!Array.isArray(row.song_variants) || row.song_variants.length === 0) {
            stats.skipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`  [DRY] templated_songs #${row.id}: would migrate ${row.song_variants.length} variants`);
            stats.migrated++;
            stats.filesMigrated += (row.song_variants as unknown[]).length * 2;
            return;
          }

          const result = await migrateVariantsToR2('templated-songs', row.id, row.song_variants);
          if (result.migratedCount > 0) {
            await db
              .update(templatedSongsTable)
              .set({ song_variants: result.updated })
              .where(eq(templatedSongsTable.id, row.id));
            console.log(`  ✓ templated_songs #${row.id} — ${result.migratedCount} file(s) migrated`);
            stats.migrated++;
            stats.filesMigrated += result.migratedCount;
          } else {
            stats.skipped++;
          }
        } catch (err) {
          console.error(`  ✗ templated_songs #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
          stats.failed++;
        }
      }),
    );
    await sleep(500);
  }
}

async function processTemplatedInstances(stats: TableStats) {
  console.log('\n── templated_song_instances ───────────────────────────────');

  let rows = await db
    .select({ id: templatedSongInstancesTable.id, song_variants: templatedSongInstancesTable.song_variants })
    .from(templatedSongInstancesTable)
    .where(eq(templatedSongInstancesTable.status, 'completed'))
    .orderBy(templatedSongInstancesTable.id);

  if (START_FROM_ID) rows = rows.filter((r) => r.id >= START_FROM_ID!);

  if (SKIP_EXISTING) {
    rows = rows.filter((r) => !isFullyMigrated(r.song_variants as unknown[]));
  }

  if (LIMIT) rows = rows.slice(0, LIMIT);

  stats.total += rows.length;
  console.log(`  ${rows.length} templated_song_instances to process`);

  const batches = chunk(rows, CONCURRENCY);
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (row) => {
        try {
          if (!Array.isArray(row.song_variants) || row.song_variants.length === 0) {
            stats.skipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`  [DRY] templated_song_instances #${row.id}: would migrate ${row.song_variants.length} variants`);
            stats.migrated++;
            stats.filesMigrated += (row.song_variants as unknown[]).length * 2;
            return;
          }

          const result = await migrateVariantsToR2('templated-instances', row.id, row.song_variants);
          if (result.migratedCount > 0) {
            await db
              .update(templatedSongInstancesTable)
              .set({ song_variants: result.updated })
              .where(eq(templatedSongInstancesTable.id, row.id));
            console.log(`  ✓ templated_song_instances #${row.id} — ${result.migratedCount} file(s) migrated`);
            stats.migrated++;
            stats.filesMigrated += result.migratedCount;
          } else {
            stats.skipped++;
          }
        } catch (err) {
          console.error(`  ✗ templated_song_instances #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
          stats.failed++;
        }
      }),
    );
    await sleep(500);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Melodia — Migrate Audio Files to R2');
  console.log('='.repeat(60));
  console.log(`Mode          : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Skip existing : ${SKIP_EXISTING}`);
  console.log(`Concurrency   : ${CONCURRENCY}`);
  if (TABLE) console.log(`Table filter  : ${TABLE}`);
  if (LIMIT) console.log(`Limit         : ${LIMIT} per table`);
  if (START_FROM_ID) console.log(`Start from ID : ${START_FROM_ID}`);
  console.log(`R2 bucket     : ${process.env.R2_BUCKET_NAME ?? 'melodia-media'}`);
  console.log(`R2 public URL : ${process.env.R2_PUBLIC_URL ?? 'https://media.melodia-songs.com'}`);

  const totals: TableStats = { total: 0, skipped: 0, migrated: 0, failed: 0, filesMigrated: 0 };

  const tableMap: Record<string, () => Promise<void>> = {
    songs: () => processSongs(totals),
    user_songs: () => processUserSongs(totals),
    templated_songs: () => processTemplatedSongs(totals),
    templated_song_instances: () => processTemplatedInstances(totals),
  };

  const tablesToRun = TABLE ? [TABLE] : Object.keys(tableMap);

  for (const t of tablesToRun) {
    if (!tableMap[t]) {
      console.error(`Unknown table: ${t}. Valid: ${Object.keys(tableMap).join(', ')}`);
      process.exit(1);
    }
    await tableMap[t]();
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Records found    : ${totals.total}`);
  console.log(`Records migrated : ${totals.migrated}`);
  console.log(`Records skipped  : ${totals.skipped}`);
  console.log(`Records failed   : ${totals.failed}`);
  console.log(`Files uploaded   : ${totals.filesMigrated}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no changes were written.');

  if (totals.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
