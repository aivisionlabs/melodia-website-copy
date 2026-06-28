/**
 * Central demo mode utility.
 * Single source of truth for whether DEMO_MODE is enabled (env DEMO_MODE === 'true')
 * and for identifying demo task IDs (e.g. from API calls with demoMode: true).
 */

const DEMO_MODE_ENABLED = process.env.DEMO_MODE === 'true';

/**
 * Returns true if and only if DEMO_MODE env is the string 'true' (case-sensitive).
 * Use this everywhere instead of reading process.env.DEMO_MODE directly.
 */
export function isDemoModeEnabled(): boolean {
  return DEMO_MODE_ENABLED;
}

/** Prefix used for demo task IDs (e.g. from generate-song with demoMode: true). */
export const DEMO_TASK_ID_PREFIX = 'demo-task-';

/**
 * Returns true if the given taskId is a demo task ID (string starting with demo-task-).
 * Use for status polling / Suno flow to treat the task as demo regardless of env.
 */
export function isDemoTaskId(
  taskId: string | null | undefined
): taskId is string {
  return typeof taskId === 'string' && taskId.startsWith(DEMO_TASK_ID_PREFIX);
}

/**
 * Parses the timestamp from a demo task ID (demo-task-<ts>). Returns null if not a valid demo task ID.
 */
export function getDemoTaskTimestamp(taskId: string): number | null {
  if (!isDemoTaskId(taskId)) return null;
  const raw = taskId.slice(DEMO_TASK_ID_PREFIX.length);
  const ts = Number.parseInt(raw, 10);
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Canonical demo song variants — single source of truth for all demo/sandbox/simulate flows.
 * All consumers (simulate endpoint, status polling, suno-api demo mode) should import from here.
 */
export const DEMO_SONG_VARIANTS = [
  {
    id: 'ce5b09ea-ad49-4a6c-b449-e4c47597d123',
    audioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    sourceAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    streamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    sourceStreamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    imageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
    sourceImageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
    duration: 85.76,
    modelName: 'DEMO',
  },
  {
    id: 'e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608',
    audioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    sourceAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    streamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    sourceStreamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    imageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
    sourceImageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
    duration: 89.92,
    modelName: 'DEMO',
  },
] as const;
