/**
 * Convert a person's name (Latin/English or any input) to Hindi script (Devanagari).
 * Used by the templated-songs generate flow so {{NAME}} is replaced with the
 * name in Devanagari (e.g. "Priya" → "प्रिया", "John" → "जॉन").
 * All inputs are converted to Hindi script regardless of template language.
 */

import { traceable } from 'langsmith/traceable';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, LLM_CONFIG } from './llm-shared';

/**
 * Prompt rules for converting any name to Hindi (Devanagari) script.
 * Aligned with proper-noun conversion in custom-lyrics-processor-prompt-builder.
 */
const HINDI_SCRIPT_RULES = `
- You MUST convert the name into Hindi script (Devanagari: देवनागरी).
- Use standard Devanagari spelling that matches the pronunciation of the given name.
- Examples: "Priya" → "प्रिया", "John" → "जॉन", "Sarah" → "सारा", "Mumbai" → "मुंबई", "Alex" → "एलेक्स".
- If the input is already in Devanagari, return it unchanged (or normalized).
- Output ONLY the name in Devanagari—no explanation, no quotes, no extra text.`;

/**
 * Converts the given name to Hindi script (Devanagari) for all inputs.
 * Used when replacing {{NAME}} in templated song lyrics.
 *
 * @param name - User-provided name (any script, typically Latin)
 * @param _lyricsSample - Unused; kept for API compatibility with callers
 * @returns Name in Devanagari (Hindi script), or original name on failure/demo
 */
const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

async function _convertNameToScriptImpl(
  name: string,
  _lyricsSample?: string
): Promise<string> {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    logger.warn('convertNameToScript called with empty name');
    return name ?? '';
  }

  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Skipping name-to-script conversion, using name as-is');
    return trimmedName;
  }

  const systemPrompt = `You are a script conversion assistant. Your task is to convert a person's name (or any proper noun) into Hindi script (Devanagari) only.

Rules:
${HINDI_SCRIPT_RULES}`;

  const userPrompt = `Convert this name to Hindi (Devanagari) script: ${trimmedName}

Output only the name in Devanagari:`;

  try {
    const vertexAI = initializeVertexAI();

    const text = await generateWithVertexAI(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.nameToScript.temperature,
      LLM_CONFIG.nameToScript.maxOutputTokens,
      false, // text mode
      LLM_CONFIG.nameToScript.modelName,
      0, // thinkingBudget=0: Flash thinking disabled — saves ~32% tokens, no quality loss
    );

    if (!text || !text.trim()) {
      logger.warn('LLM returned empty name-to-script result, using original name', {
        nameLength: trimmedName.length,
      });
      return trimmedName;
    }

    // Single line, no extra punctuation
    const converted = text.trim().split('\n')[0].trim();
    logger.info('Name converted to script for template', {
      originalNameLength: trimmedName.length,
      convertedLength: converted.length,
    });
    return converted || trimmedName;
  } catch (error) {
    logger.error('Name-to-script conversion failed, using original name', {
      error: error instanceof Error ? error.message : String(error),
    });
    return trimmedName;
  }
}

// =============================================================================
// LangSmith Traced Export
// =============================================================================

export const convertNameToScript = maybeTraceable(_convertNameToScriptImpl, {
  name: 'convert-name-to-script',
  run_type: 'chain',
  metadata: { module: 'name-to-script' },
  tags: ['name-conversion', 'template'],
});
