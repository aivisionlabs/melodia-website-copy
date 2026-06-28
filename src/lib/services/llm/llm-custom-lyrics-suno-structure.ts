import { z } from 'zod';
import { traceable } from 'langsmith/traceable';
import { logger } from '@/lib/logger';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import {
  buildSunoStructureSystemPrompt,
  buildSunoStructureUserPrompt,
} from '@/lib/services/llm/prompts/custom-lyrics-suno-structure-prompt-builder';
import {
  generateWithVertexAI,
  initializeVertexAI,
  LLM_CONFIG,
  sanitizeJsonString,
} from '@/lib/services/llm/llm-shared';
import {
  buildDeterministicStructure,
  hasSongSections,
  stripUnsupportedDecorations,
} from '@/lib/services/llm/custom-lyrics-suno-structure-utils';

const SunoStructuredLyricsSchema = z.object({
  structuredLyrics: z.string().min(20),
});

interface StructureLyricsForSunoParams {
  lyrics: string;
  languages?: string | null;
  recipientDetails?: string | null;
  occasion?: string | null;
}

const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

async function _structureLyricsForSunoImpl(
  params: StructureLyricsForSunoParams
): Promise<string> {
  const startTime = Date.now();
  const baseLyrics = stripUnsupportedDecorations(params.lyrics || '');
  if (!baseLyrics) {
    throw new Error('Cannot structure empty lyrics for Suno');
  }

  if (isDemoModeEnabled()) {
    return buildDeterministicStructure(baseLyrics);
  }

  if (hasSongSections(baseLyrics)) {
    return baseLyrics;
  }

  const systemPrompt = buildSunoStructureSystemPrompt();
  const userPrompt = buildSunoStructureUserPrompt({
    lyrics: baseLyrics,
    languages: params.languages,
    recipientDetails: params.recipientDetails,
    occasion: params.occasion,
  });

  try {
    const vertexAI = initializeVertexAI();
    const responseText = await generateWithVertexAI(
      vertexAI,
      systemPrompt,
      userPrompt,
      0.2,
      Math.min(LLM_CONFIG.generation.maxOutputTokens, 2048),
      true
    );

    const sanitized = sanitizeJsonString(responseText);
    const parsed = SunoStructuredLyricsSchema.parse(JSON.parse(sanitized));
    const structured = stripUnsupportedDecorations(parsed.structuredLyrics);

    if (!structured) {
      throw new Error('Structured lyrics were empty');
    }

    if (!hasSongSections(structured)) {
      return buildDeterministicStructure(structured);
    }

    logger.info('Structured custom lyrics for Suno via LLM', {
      duration_ms: Date.now() - startTime,
      hasSections: true,
    });
    return structured;
  } catch (error) {
    logger.warn('Suno structuring LLM failed, using deterministic fallback', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });
    return buildDeterministicStructure(baseLyrics);
  }
}

export const structureCustomLyricsForSuno = maybeTraceable(_structureLyricsForSunoImpl, {
  name: 'structure-custom-lyrics-for-suno',
  run_type: 'chain',
  metadata: { module: 'custom-lyrics-suno-structure' },
  tags: ['lyrics', 'custom-processing', 'suno-structure'],
});

export const __testables = {
  stripUnsupportedDecorations,
  hasSongSections,
  buildDeterministicStructure,
};

