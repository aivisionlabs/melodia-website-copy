/**
 * Records LLM pipeline step outputs to the database for analysis and debugging.
 * Used by generate-lyrics, process-custom-lyrics, refine-lyrics, regenerate-music-style, update-music-style.
 */

import { db } from '@/lib/db';
import { llmPipelineStepOutputsTable } from '@/lib/db/schema';
import type { InsertLlmPipelineStepOutput } from '@/lib/db/schema';

/** Step names aligned with docs/architecture-llm-pipeline.md */
export type PipelineStepName =
  | 'context_analysis'
  | 'lyrics_generation'
  | 'music_style'
  | 'lyrics_review'
  | 'transliteration'
  | 'custom_lyrics_processing'
  | 'custom_lyrics_saved'
  | 'refine_lyrics'
  | 'regenerate_music_style'
  | 'update_music_style';

export interface RecordPipelineStepInput {
  songRequestId: number;
  lyricsDraftId?: number | null;
  pipelineRunId?: string | null;
  stepName: PipelineStepName;
  stepOrder?: number | null;
  inputSummary?: Record<string, unknown> | null;
  outputSnapshot: Record<string, unknown>;
  modelName?: string | null;
  durationMs?: number | null;
  success?: boolean;
  errorMessage?: string | null;
}

/**
 * Inserts one row into llm_pipeline_step_outputs. Does not throw; logs and returns void.
 * Call after each LLM step so outputs can be analyzed later per song request.
 */
export async function recordPipelineStepOutput(input: RecordPipelineStepInput): Promise<void> {
  try {
    const row: InsertLlmPipelineStepOutput = {
      song_request_id: input.songRequestId,
      lyrics_draft_id: input.lyricsDraftId ?? null,
      pipeline_run_id: input.pipelineRunId ?? null,
      step_name: input.stepName,
      step_order: input.stepOrder ?? null,
      input_summary: input.inputSummary ?? null,
      output_snapshot: input.outputSnapshot,
      model_name: input.modelName ?? null,
      duration_ms: input.durationMs ?? null,
      success: input.success ?? true,
      error_message: input.errorMessage ?? null,
    };
    await db.insert(llmPipelineStepOutputsTable).values(row);
  } catch (err) {
    // Do not fail the main flow; log and continue
    const { logger } = await import('@/lib/logger');
    logger.warn('Failed to record pipeline step output', {
      songRequestId: input.songRequestId,
      stepName: input.stepName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Generates a UUID v4 for grouping steps in the same pipeline run. */
export function createPipelineRunId(): string {
  return crypto.randomUUID();
}
