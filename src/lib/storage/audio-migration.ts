/**
 * Utilities for migrating Suno CDN audio/cover files to Cloudflare R2.
 *
 * R2 folder layout (under media.melodia-songs.com):
 *   library-songs/{songId}/v{idx}.mp3
 *   library-songs/{songId}/v{idx}-cover.jpg
 *   customer-songs/{userSongId}/v{idx}.mp3
 *   customer-songs/{userSongId}/v{idx}-cover.jpg
 *   templated-songs/{templateId}/v{idx}.mp3
 *   templated-songs/{templateId}/v{idx}-cover.jpg
 *   templated-instances/{instanceId}/v{idx}.mp3
 *   templated-instances/{instanceId}/v{idx}-cover.jpg
 *
 * songs.song_url and songs.song_url_variant_1 are derived from suno_variants —
 * they are NOT uploaded separately. song_url = suno_variants[selected_variant].audioUrl,
 * song_url_variant_1 = suno_variants[0].audioUrl (always the first variant).
 */

import { uploadToR2 } from './upload';

// All CDN domains that serve Suno-generated audio/images (direct + proxy)
const SUNO_HOSTS = [
  'cdn1.suno.ai',
  'cdn2.suno.ai',
  'apiboxfiles.erweima.ai', // Suno API proxy — full MP3 downloads
  'mfile.erweima.ai',       // Suno API proxy — streaming endpoint
  'audiopipe.suno.ai',      // alternate Suno CDN
];

export type AudioEntityType =
  | 'library-songs'
  | 'customer-songs'
  | 'templated-songs'
  | 'templated-instances';

export function isSunoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return SUNO_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

export function isR2Url(url: string | null | undefined): boolean {
  if (!url) return false;
  const base = process.env.R2_PUBLIC_URL ?? 'https://media.melodia-songs.com';
  return url.startsWith(base);
}

export function audioR2Key(entityType: AudioEntityType, entityId: number, variantIdx: number): string {
  return `${entityType}/${entityId}/v${variantIdx}.mp3`;
}

export function coverR2Key(entityType: AudioEntityType, entityId: number, variantIdx: number): string {
  return `${entityType}/${entityId}/v${variantIdx}-cover.jpg`;
}

/**
 * Derive song_url / song_url_variant_1 from already-migrated suno_variants.
 * Returns null if the relevant variant hasn't been migrated yet.
 */
export function deriveSongUrlsFromVariants(
  migratedVariants: unknown[],
  selectedVariant: number | null | undefined,
): { songUrl: string | null; songUrlVariant1: string | null } {
  const sel = selectedVariant ?? 0;
  const getAudio = (v: unknown): string | null => {
    if (!v || typeof v !== 'object') return null;
    const r = v as Record<string, unknown>;
    const url = (r.audioUrl ?? r.sourceAudioUrl ?? r.streamAudioUrl) as string | undefined;
    return url && isR2Url(url) ? url : null;
  };
  return {
    songUrl: getAudio(migratedVariants[sel]) ?? null,
    songUrlVariant1: getAudio(migratedVariants[0]) ?? null,
  };
}

export async function downloadAndUploadToR2(
  sourceUrl: string,
  r2Key: string,
  contentType: string,
): Promise<string> {
  const controller = new AbortController();
  // Timeout covers the full download (headers + body), not just the connection
  const timer = setTimeout(() => controller.abort(), 30_000);
  let buffer: Buffer;
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Download failed for ${sourceUrl}: ${response.status} ${response.statusText}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
  return uploadToR2(buffer, r2Key, contentType);
}

export interface MigrateVariantsResult {
  updated: unknown[];
  migratedCount: number;
}

/**
 * Migrate all Suno CDN URLs in a variants array to R2.
 * Deduplicates: audioUrl/sourceAudioUrl/streamAudioUrl → one R2 upload.
 * imageUrl/sourceImageUrl → one R2 upload.
 * Already-R2 variants are skipped.
 */
export async function migrateVariantsToR2(
  entityType: AudioEntityType,
  entityId: number,
  variants: unknown,
): Promise<MigrateVariantsResult> {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { updated: Array.isArray(variants) ? variants : [], migratedCount: 0 };
  }

  let migratedCount = 0;
  const updated: unknown[] = [];

  for (let idx = 0; idx < variants.length; idx++) {
    const variant = variants[idx];
    if (!variant || typeof variant !== 'object') {
      updated.push(variant);
      continue;
    }

    const v = variant as Record<string, unknown>;

    // Prefer direct Suno CDN over erweima.ai proxy (proxy URLs expire, cdn1 stays stable)
    const DIRECT_HOSTS = ['cdn1.suno.ai', 'cdn2.suno.ai', 'audiopipe.suno.ai'];
    const isDirect = (u: string) => DIRECT_HOSTS.some(h => new URL(u).hostname === h);
    const isUsable = (u: unknown): u is string =>
      typeof u === 'string' && isSunoUrl(u) && !new URL(u).hostname.startsWith('mfile.');

    const allAudio = [v.sourceAudioUrl, v.audioUrl, v.streamAudioUrl, v.sourceStreamAudioUrl]
      .filter(isUsable);
    // Try direct CDN first, fall back to proxy
    const audioSourceUrl = allAudio.find(isDirect) ?? allAudio[0];

    // mfile.erweima.ai is streaming-only — last resort
    const streamFallback = [v.streamAudioUrl, v.sourceStreamAudioUrl]
      .map((u) => u as string | undefined)
      .find((u) => u && isSunoUrl(u));

    const bestAudioSource = audioSourceUrl ?? streamFallback;
    const imageUrl = (v.imageUrl ?? v.sourceImageUrl) as string | undefined;

    let r2AudioUrl: string | undefined;
    let r2ImageUrl: string | undefined;

    if (bestAudioSource) {
      const r2Key = audioR2Key(entityType, entityId, idx);
      try {
        r2AudioUrl = await downloadAndUploadToR2(bestAudioSource, r2Key, 'audio/mpeg');
        migratedCount++;
      } catch (err) {
        // Skip this variant's audio (empty file, expired URL) — don't fail the whole record
        console.warn(`    [skip] variant[${idx}] audio: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imageUrl && isSunoUrl(imageUrl)) {
      const r2Key = coverR2Key(entityType, entityId, idx);
      try {
        r2ImageUrl = await downloadAndUploadToR2(imageUrl, r2Key, 'image/jpeg');
        migratedCount++;
      } catch (err) {
        console.warn(`    [skip] variant[${idx}] image: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    updated.push({
      ...v,
      ...(r2AudioUrl
        ? {
            audioUrl: r2AudioUrl,
            sourceAudioUrl: r2AudioUrl,
            streamAudioUrl: r2AudioUrl,
            sourceStreamAudioUrl: r2AudioUrl,
          }
        : {}),
      ...(r2ImageUrl
        ? {
            imageUrl: r2ImageUrl,
            sourceImageUrl: r2ImageUrl,
          }
        : {}),
    });
  }

  return { updated, migratedCount };
}

/** True when every variant in the array has no remaining Suno CDN URLs. */
export function isFullyMigrated(variants: unknown): boolean {
  if (!Array.isArray(variants) || variants.length === 0) return false;
  return variants.every((v) => {
    if (!v || typeof v !== 'object') return true;
    const fields = [
      'audioUrl', 'sourceAudioUrl', 'streamAudioUrl',
      'sourceStreamAudioUrl', 'imageUrl', 'sourceImageUrl',
    ];
    return fields.every((f) => {
      const val = (v as Record<string, unknown>)[f];
      return !val || !isSunoUrl(val as string);
    });
  });
}
