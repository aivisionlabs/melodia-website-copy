import { SongVariant } from '@/lib/types';

/** Normalized variant shape for player components (camelCase only, no backward-compat fallbacks). */
export interface NormalizedPlayerVariant {
  id: string;
  title: string;
  prompt: string;
  modelName: string;
  tags: string;
  createTime: string;
  duration: number;
  audioUrl: string | null;
  sourceAudioUrl?: string | null;
  streamAudioUrl?: string | null;
  sourceStreamAudioUrl?: string | null;
  imageUrl: string;
  sourceImageUrl: string;
  variantStatus?: string;
}

/**
 * Normalize raw variant (API/DB) to player shape. Uses camelCase only (sourceX ?? x).
 * API already normalizes; this handles legacy or mixed responses.
 */
export function normalizeVariantForPlayer(v: unknown): NormalizedPlayerVariant | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;

  const sourceImageUrl = (o.sourceImageUrl ?? o.imageUrl ?? '') as string;
  const img = sourceImageUrl || '/images/melodia-logo-og.jpeg';
  const audioUrl = (o.audioUrl ?? o.sourceAudioUrl ?? null) as string | null;
  const sourceAudioUrl = (o.sourceAudioUrl ?? o.audioUrl ?? null) as string | null;
  const streamAudioUrl = (o.streamAudioUrl ?? o.sourceStreamAudioUrl ?? null) as string | null;
  const sourceStreamAudioUrl = (o.sourceStreamAudioUrl ?? o.streamAudioUrl ?? null) as string | null;

  const dur = o.duration;
  const duration = Number.isFinite(dur) ? (dur as number) : 0;

  const id =
    (typeof o.id === 'string' && o.id.trim()) ||
    (typeof o.audioId === 'string' && o.audioId.trim()) ||
    '';

  return {
    id,
    title:
      (typeof o.title === 'string' && o.title.trim()) ||
      (typeof o.song_title === 'string' && o.song_title.trim()) ||
      'Generated Song',
    prompt: (typeof o.prompt === 'string' ? o.prompt : ''),
    modelName: (typeof o.modelName === 'string' && o.modelName) || (typeof o.model_name === 'string' && o.model_name) || 'SUNO',
    tags: typeof o.tags === 'string' ? o.tags : '',
    createTime: (typeof o.createTime === 'string' && o.createTime) || (typeof o.create_time === 'string' && o.create_time) || new Date().toISOString(),
    duration,
    audioUrl,
    sourceAudioUrl,
    streamAudioUrl,
    sourceStreamAudioUrl,
    imageUrl: img,
    sourceImageUrl: img,
    variantStatus: (typeof o.variantStatus === 'string' && o.variantStatus) || (typeof o.variant_status === 'string' && o.variant_status) || undefined,
  };
}

/** Extract variants list from song_variants (array or keyed object). */
export function getVariantsList(songVariants: unknown): unknown[] {
  if (Array.isArray(songVariants)) return songVariants.filter(Boolean);
  if (songVariants && typeof songVariants === 'object') {
    return Object.values(songVariants as object).filter(Boolean);
  }
  return [];
}

/**
 * Suno record-info sometimes returns `response.sunoData` as an array, a single clip object,
 * or a keyed object (`{ "0": {...}, "1": {...} }`). Normalize to a stable ordered array for UI + DB.
 */
export function coerceRecordInfoSunoDataToArray(sunoData: unknown): unknown[] {
  if (sunoData == null) return [];
  if (Array.isArray(sunoData)) return sunoData.filter(Boolean);
  if (typeof sunoData !== 'object') return [];
  const o = sunoData as Record<string, unknown>;
  const keys = Object.keys(o).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return keys.map((k) => o[k]).filter(Boolean);
}

/**
 * Check if any variant has stream or download ready (can play audio)
 * @param variants Array of song variants
 * @returns true if at least one variant is stream-ready or download-ready
 */
export function hasStreamReadyVariant(variants: SongVariant[] | undefined): boolean {
  if (!variants || variants.length === 0) {
    return false;
  }

  return variants.some((v) => {
    const variantStatus = (v?.variantStatus || '').toUpperCase();
    return (
      !!v?.streamAudioUrl ||
      variantStatus === 'STREAM_READY' ||
      variantStatus === 'DOWNLOAD_READY'
    );
  });
}

/**
 * Calculate variantStatus from available URLs (for live mode processing)
 * @param variant Raw variant data from Suno API
 * @returns Calculated variantStatus: 'PENDING' | 'STREAM_READY' | 'DOWNLOAD_READY'
 */
export function calculateVariantStatus(variant: {
  streamAudioUrl?: string;
  sourceStreamAudioUrl?: string;
  audioUrl?: string;
  sourceAudioUrl?: string;
}): 'PENDING' | 'STREAM_READY' | 'DOWNLOAD_READY' {
  const hasDownload = !!(variant.audioUrl || variant.sourceAudioUrl);
  const hasStream = !!(variant.streamAudioUrl || variant.sourceStreamAudioUrl);

  if (hasDownload) {
    return 'DOWNLOAD_READY';
  }
  if (hasStream) {
    return 'STREAM_READY';
  }
  return 'PENDING';
}

/** Raw variant fields used for download vs stream-only UI (song-options, templated player). */
export type VariantDownloadFields = {
  variantStatus?: string | null;
  sourceAudioUrl?: string | null;
  audioUrl?: string | null;
  streamAudioUrl?: string | null;
  sourceStreamAudioUrl?: string | null;
};

/**
 * True when the variant has a final download file (not stream-preview only).
 * STREAM_READY explicitly excludes download even if stray URLs exist.
 */
export function isVariantDownloadReady(variant: VariantDownloadFields): boolean {
  const status = (variant.variantStatus || '').toUpperCase();
  const hasDownloadFile = !!(
    variant.sourceAudioUrl?.trim() || variant.audioUrl?.trim()
  );

  if (status === 'STREAM_READY') {
    return false;
  }
  if (status === 'DOWNLOAD_READY') {
    return hasDownloadFile;
  }
  return hasDownloadFile;
}

/** Stream is playable but download file is not ready yet (show preparing UI). */
export function isVariantPreparingDownload(
  variant: VariantDownloadFields,
): boolean {
  if (isVariantDownloadReady(variant)) {
    return false;
  }
  return !!(
    variant.streamAudioUrl?.trim() ||
    variant.sourceStreamAudioUrl?.trim()
  );
}

/** URL to pass to DownloadButton — only when {@link isVariantDownloadReady}. */
export function getVariantDownloadAudioUrl(
  variant: VariantDownloadFields,
): string | null {
  if (!isVariantDownloadReady(variant)) {
    return null;
  }
  const url =
    variant.sourceAudioUrl?.trim() || variant.audioUrl?.trim() || '';
  return url || null;
}

/** URL field names used when merging/preserving variant data */
const VARIANT_URL_FIELDS = [
  'audioUrl',
  'sourceAudioUrl',
  'streamAudioUrl',
  'sourceStreamAudioUrl',
  'imageUrl',
  'sourceImageUrl',
] as const;

function hasUrl(v: any, field: string): boolean {
  const val = v?.[field];
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Whitelist of variant keys we persist in DB (songs.suno_variants, templated_songs.song_variants, etc.).
 * Only these fields are stored so we don't save the full raw Suno payload.
 */
const STORED_VARIANT_KEYS = [
  'id',
  'tags',
  'title',
  'prompt',
  'audioUrl',
  'duration',
  'imageUrl',
  'modelName',
  'createTime',
  'sourceAudioUrl',
  'sourceImageUrl',
  'streamAudioUrl',
  'sourceStreamAudioUrl',
  'variantStatus',
] as const;

/**
 * Normalize a single raw Suno variant (from callback or getRecordInfo) to our stored format.
 * Handles both snake_case and camelCase. Returns only the whitelist of keys we persist in DB.
 * Use this in both webhook and polling so storage is consistent and minimal.
 */
export function normalizeSunoVariantToStored(raw: any): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      title: 'Generated Song',
      modelName: 'SUNO',
      duration: 0,
      audioUrl: '',
      sourceAudioUrl: '',
      streamAudioUrl: '',
      sourceStreamAudioUrl: '',
      imageUrl: '',
      sourceImageUrl: '',
      variantStatus: 'PENDING' as const,
    };
  }
  const s = raw as Record<string, unknown>;
  const audioUrl =
    (s.sourceAudioUrl ?? s.source_audio_url ?? s.audioUrl ?? s.audio_url ?? '') as string;
  const sourceAudioUrl =
    (s.sourceAudioUrl ?? s.source_audio_url ?? s.audioUrl ?? s.audio_url ?? '') as string;
  const streamAudioUrl =
    (s.streamAudioUrl ?? s.sourceStreamAudioUrl ?? s.stream_audio_url ?? s.source_stream_audio_url ?? '') as string;
  const sourceStreamAudioUrl =
    (s.sourceStreamAudioUrl ?? s.source_stream_audio_url ?? s.streamAudioUrl ?? s.stream_audio_url ?? '') as string;
  const sourceImageUrl =
    (s.sourceImageUrl ?? s.source_image_url ?? s.imageUrl ?? s.image_url ?? '') as string;
  const imageUrl = (sourceImageUrl || (s.imageUrl ?? s.image_url ?? '')) as string;

  const variantStatus = calculateVariantStatus({
    streamAudioUrl,
    sourceStreamAudioUrl,
    audioUrl,
    sourceAudioUrl,
  });

  const full: Record<string, unknown> = {
    id: (s.id ?? s.audioId ?? '') as string,
    tags: (s.tags ?? s.tag ?? '') as string,
    title: (s.title ?? s.song_title ?? 'Generated Song') as string,
    prompt: (s.prompt ?? '') as string,
    audioUrl,
    duration: Number.isFinite(s.duration) ? (s.duration as number) : 0,
    imageUrl,
    modelName: (s.modelName ?? s.model_name ?? 'SUNO') as string,
    createTime: s.createTime ?? s.create_time ?? 0,
    sourceAudioUrl,
    sourceImageUrl,
    streamAudioUrl,
    sourceStreamAudioUrl,
    variantStatus,
  };

  const out: Record<string, unknown> = {};
  for (const k of STORED_VARIANT_KEYS) {
    if (full[k] !== undefined) out[k] = full[k];
  }
  return out;
}

/**
 * Return only the whitelist of keys we store in DB (for merging/stripping existing variants).
 */
function pickStoredVariantKeys(v: any): Record<string, unknown> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const k of STORED_VARIANT_KEYS) {
    if (v[k] !== undefined) out[k] = v[k];
  }
  return out;
}

/**
 * Merge incoming variants with existing, preserving existing URL fields when incoming has empty values.
 * Used by the webhook so late/duplicate callbacks don't overwrite good data.
 * Returns only the stored-keys shape so we don't persist extra fields.
 */
export function mergeVariantsPreservingUrls(
  existingVariants: any[],
  incomingVariants: any[]
): any[] {
  const variantMap = new Map<string, any>();
  existingVariants.forEach((v) => {
    if (v?.id) variantMap.set(String(v.id), pickStoredVariantKeys(v));
  });
  incomingVariants.forEach((v) => {
    if (!v?.id) return;
    const key = String(v.id);
    const existing = variantMap.get(key);
    const merged = existing ? { ...pickStoredVariantKeys(v) } : pickStoredVariantKeys(v);
    if (existing) {
      for (const field of VARIANT_URL_FIELDS) {
        if (!hasUrl(merged, field) && hasUrl(existing, field)) {
          (merged as any)[field] = existing[field];
        }
      }
    }
    variantMap.set(key, merged);
  });
  return Array.from(variantMap.values());
}

