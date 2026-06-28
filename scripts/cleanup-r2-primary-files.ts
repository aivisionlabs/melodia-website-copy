/**
 * Cleanup: fix songs where song_url points to incorrectly named R2 files
 * (primary.mp3 / variant-1.mp3) instead of the canonical vN.mp3 keys.
 *
 * Two categories handled:
 *   Category A — suno_variants has proper vN.mp3 R2 audio URLs:
 *     → Update song_url = suno_variants[selected_variant].audioUrl
 *     → Update song_url_variant_1 = suno_variants[0].audioUrl
 *     → Delete primary.mp3 (and variant-1.mp3 if present) from R2
 *
 *   Category B — suno_variants has no audio URLs (old format songs):
 *     → Copy primary.mp3 to v0.mp3 in R2
 *     → Update suno_variants[0] with the new v0.mp3 URL
 *     → Update song_url = v0.mp3
 *     → Delete primary.mp3 from R2
 *
 * Control flags:
 *   DRY_RUN=true          Log without making any changes (default: false)
 *   LIMIT=3               Process at most N songs (default: all)
 *   SKIP_CATEGORY_B=true  Skip old-format songs that need rename (default: false)
 *
 * Usage:
 *   DRY_RUN=true LIMIT=3 npx tsx -r dotenv/config scripts/cleanup-r2-primary-files.ts dotenv_config_path=.env.local
 *   LIMIT=3 npx tsx -r dotenv/config scripts/cleanup-r2-primary-files.ts dotenv_config_path=.env.local
 */

import { db } from '../src/lib/db';
import { songsTable } from '../src/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName, getR2PublicBaseUrl } from '../src/lib/storage/r2-client';
import { isR2Url } from '../src/lib/storage/audio-migration';

const DRY_RUN = process.env.DRY_RUN === 'true';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const SKIP_CATEGORY_B = process.env.SKIP_CATEGORY_B === 'true';

function r2KeyFromUrl(url: string): string | null {
  const base = getR2PublicBaseUrl();
  if (!url.startsWith(base)) return null;
  // Strip base and leading slash, also strip ?v=... query param
  return url.slice(base.length).replace(/^\//, '').split('?')[0];
}

async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function copyR2Object(sourceKey: string, destKey: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  // Download source
  const resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }));
  if (!resp.Body) throw new Error(`R2 object not found: ${sourceKey}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Upload to dest
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: destKey,
    Body: buffer,
    ContentLength: buffer.length,
    ContentType: 'audio/mpeg',
  }));
}

function getAudioUrlFromVariant(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  for (const field of ['audioUrl', 'sourceAudioUrl', 'streamAudioUrl']) {
    const val = r[field] as string | undefined;
    if (val && isR2Url(val) && val.match(/\/v\d+\.mp3/)) return val;
  }
  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Melodia — Cleanup R2 primary.mp3 / variant-1.mp3 files');
  console.log('='.repeat(60));
  console.log(`Mode          : ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (LIMIT) console.log(`Limit         : ${LIMIT} songs`);
  console.log(`Skip Cat. B   : ${SKIP_CATEGORY_B}`);
  console.log(`R2 public URL : ${getR2PublicBaseUrl()}`);

  let rows = await db.select({
    id: songsTable.id,
    song_url: songsTable.song_url,
    song_url_variant_1: songsTable.song_url_variant_1,
    selected_variant: songsTable.selected_variant,
    suno_variants: songsTable.suno_variants,
  }).from(songsTable).where(
    sql`song_url LIKE '%/primary.mp3' OR song_url LIKE '%/variant-1.mp3'
        OR song_url_variant_1 LIKE '%/primary.mp3' OR song_url_variant_1 LIKE '%/variant-1.mp3'`
  ).orderBy(songsTable.id);

  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`\nFound ${rows.length} song(s) to fix.\n`);

  let fixedA = 0, fixedB = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const variants = Array.isArray(row.suno_variants) ? row.suno_variants : [];
    const selectedIdx = row.selected_variant ?? 0;

    // Determine category
    const hasProperVariantAudio = variants.some((v: unknown) => getAudioUrlFromVariant(v) !== null);

    if (!hasProperVariantAudio) {
      // Category B: old-format song, suno_variants has no audio URLs
      if (SKIP_CATEGORY_B) {
        console.log(`  [SKIP-B] songs #${row.id} — old format, no variant audio (use SKIP_CATEGORY_B=false to process)`);
        skipped++;
        continue;
      }

      console.log(`  [CAT-B] songs #${row.id} — old format, will rename primary.mp3 → v0.mp3`);
      try {
        const primaryKey = r2KeyFromUrl(row.song_url ?? '');
        if (!primaryKey) {
          console.error(`    ✗ Cannot parse R2 key from: ${row.song_url}`);
          failed++;
          continue;
        }
        const v0Key = primaryKey.replace(/\/primary\.mp3$/, '/v0.mp3');
        const publicBase = getR2PublicBaseUrl();
        const v0Url = `${publicBase}/${v0Key}`;

        console.log(`    primaryKey : ${primaryKey}`);
        console.log(`    v0Key      : ${v0Key}`);
        console.log(`    song_url   : ${row.song_url} → ${v0Url}`);

        if (!DRY_RUN) {
          await copyR2Object(primaryKey, v0Key);
          await deleteR2Object(primaryKey);

          // Update suno_variants[0] with the v0 audio URL
          const updatedVariants = variants.length > 0
            ? variants.map((v: unknown, idx: number) => {
                if (idx !== 0) return v;
                const rec = (typeof v === 'object' && v ? v : {}) as Record<string, unknown>;
                return {
                  ...rec,
                  audioUrl: v0Url,
                  sourceAudioUrl: v0Url,
                  streamAudioUrl: v0Url,
                  sourceStreamAudioUrl: v0Url,
                };
              })
            : [{ audioUrl: v0Url, sourceAudioUrl: v0Url, streamAudioUrl: v0Url, sourceStreamAudioUrl: v0Url }];

          await db.update(songsTable).set({
            song_url: v0Url,
            suno_variants: updatedVariants,
          }).where(eq(songsTable.id, row.id));
        }
        console.log(`    ✓ songs #${row.id} — renamed to v0.mp3, DB updated`);
        fixedB++;
      } catch (err) {
        console.error(`    ✗ songs #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
      continue;
    }

    // Category A: suno_variants already has proper vN.mp3 R2 URLs
    console.log(`  [CAT-A] songs #${row.id} — selected_variant=${selectedIdx}`);
    try {
      const newSongUrl = getAudioUrlFromVariant(variants[selectedIdx]) ?? getAudioUrlFromVariant(variants[0]);
      const newSongUrlVariant1 = getAudioUrlFromVariant(variants[0]);

      if (!newSongUrl) {
        console.error(`    ✗ Could not derive new song_url from variants`);
        failed++;
        continue;
      }

      console.log(`    song_url         : ${row.song_url}`);
      console.log(`    → new song_url   : ${newSongUrl}`);
      console.log(`    → song_url_var_1 : ${newSongUrlVariant1}`);

      // Delete old R2 objects
      const toDelete: string[] = [];
      for (const oldUrl of [row.song_url, row.song_url_variant_1]) {
        if (!oldUrl) continue;
        const key = r2KeyFromUrl(oldUrl);
        if (key && (key.endsWith('/primary.mp3') || key.endsWith('/variant-1.mp3'))) {
          toDelete.push(key);
        }
      }
      if (toDelete.length > 0) {
        console.log(`    delete R2 keys : ${toDelete.join(', ')}`);
      }

      if (!DRY_RUN) {
        for (const key of toDelete) {
          try { await deleteR2Object(key); } catch { /* object may not exist */ }
        }
        await db.update(songsTable).set({
          song_url: newSongUrl,
          ...(newSongUrlVariant1 ? { song_url_variant_1: newSongUrlVariant1 } : {}),
        }).where(eq(songsTable.id, row.id));
      }
      console.log(`    ✓ songs #${row.id} — DB fixed, primary.mp3 deleted`);
      fixedA++;
    } catch (err) {
      console.error(`    ✗ songs #${row.id} — ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Category A fixed (vN.mp3 redirect) : ${fixedA}`);
  console.log(`Category B fixed (renamed primary)  : ${fixedB}`);
  console.log(`Skipped                             : ${skipped}`);
  console.log(`Failed                              : ${failed}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no changes were written.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
