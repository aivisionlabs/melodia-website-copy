/**
 * R2 upload / download / URL utilities.
 *
 * Bucket layout for RJ shows:
 *   rj-shows/partner-user-voice/{uuid}.{ext}  — partner/admin-ingested user voice (pre-order)
 *   rj-shows/{show_id}/segments/{order}-{type}.mp3
 *   rj-shows/{show_id}/final/show.mp3
 */

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName, getR2PublicBaseUrl } from './r2-client';

/** Default Cache-Control for RJ show segment/final MP3s (overwritten on revision). */
export const RJ_SHOW_AUDIO_CACHE_CONTROL = 'public, max-age=3600, must-revalidate';

export type UploadToR2Options = {
  /** Remove any existing object at this key before upload (clears stale R2/CDN content for same path). */
  replaceExisting?: boolean;
  /** Appended as `?v=` on the returned URL so browsers/CDN treat each upload as a new resource. */
  cacheBustVersion?: string | number;
  cacheControl?: string;
};

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
  options?: UploadToR2Options,
): Promise<string> {
  if (buffer.length === 0) {
    throw new Error(`Refusing to upload empty buffer to R2 for key: ${key}`);
  }

  const client = getR2Client();
  const bucket = getR2BucketName();

  if (options?.replaceExisting) {
    try {
      await deleteFromR2(key);
    } catch {
      // Best-effort — object may not exist on first upload.
    }
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length,
      ContentType: contentType,
      ...(options?.cacheControl ? { CacheControl: options.cacheControl } : {}),
    }),
  );

  return getPublicUrl(key, options?.cacheBustVersion);
}

export function getPublicUrl(key: string, cacheBustVersion?: string | number): string {
  const base = getR2PublicBaseUrl();
  const url = `${base}/${key}`;
  if (cacheBustVersion === undefined || cacheBustVersion === null || cacheBustVersion === '') {
    return url;
  }
  return `${url}?v=${encodeURIComponent(String(cacheBustVersion))}`;
}

/** Upload RJ show segment/final MP3 with delete-then-put and a cache-busted public URL. */
export async function uploadRjShowAudioToR2(
  buffer: Buffer,
  key: string,
  cacheBustVersion: string | number,
): Promise<string> {
  return uploadToR2(buffer, key, 'audio/mpeg', {
    replaceExisting: true,
    cacheBustVersion,
    cacheControl: RJ_SHOW_AUDIO_CACHE_CONTROL,
  });
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error(`R2 object not found: ${key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ─── Key builders ─────────────────────────────────────────────────────────────

const RJ_SHOW_PREFIX =
  process.env.NODE_ENV === 'development' ? 'rj-show-dev' : 'rj-shows';

export function rjShowSegmentKey(showId: number, order: number, type: string): string {
  return `${RJ_SHOW_PREFIX}/${showId}/segments/${order}-${type}.mp3`;
}

export function rjShowFinalKey(showId: number): string {
  return `${RJ_SHOW_PREFIX}/${showId}/final/show.mp3`;
}

/** Read segment audio from R2 by key (bypasses public CDN URL — use when stitching server-side). */
export async function downloadRjShowSegmentAudio(
  showId: number,
  segmentOrder: number,
  segmentType: string,
): Promise<Buffer> {
  return downloadFromR2(rjShowSegmentKey(showId, segmentOrder, segmentType));
}

/** Partner-supplied user voice recording uploaded before an RJ show order exists (admin / ingestion). */
export function rjShowPartnerUserVoiceKey(
  uniqueId: string,
  fileExt = 'mp3',
): string {
  const safe = fileExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp3';
  return `${RJ_SHOW_PREFIX}/partner-user-voice/${uniqueId}.${safe}`;
}

/**
 * Sample audio clip for a voice profile.
 * languageSlug is a URL-safe version of the language name (e.g. 'hindi', 'english-hindi-style').
 */
export function voiceProfileSampleKey(voiceKey: string, languageSlug: string, ext = 'mp3'): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp3';
  const safeLang = languageSlug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'sample';
  return `voice-profiles/${voiceKey}/${safeLang}.${safeExt}`;
}
