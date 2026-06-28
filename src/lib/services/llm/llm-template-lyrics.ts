/**
 * LLM helper for templated lyrics: replace a specific name with {{NAME}} placeholder.
 * Used by admin "Process Lyrics" for templated songs.
 */

import { traceable } from 'langsmith/traceable';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, LLM_CONFIG } from './llm-shared';

const PLACEHOLDER = '{{NAME}}';

const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

/**
 * Simple string replace: replace name with {{NAME}} in lyrics.
 * Used for demo mode and as fallback. Avoids ReDoS by using split/join for single word.
 */
export function replaceNameWithPlaceholderSimple(lyrics: string, nameToReplace: string): string {
  if (!nameToReplace || !nameToReplace.trim()) {
    return lyrics;
  }
  const name = nameToReplace.trim();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  return lyrics.replace(regex, PLACEHOLDER);
}

/**
 * Replace name with {{NAME}} in lyrics using LLM for context-aware replacement
 * (e.g. "Alex" in "Alexander" can be left unchanged). Falls back to simple replace in demo mode.
 */
async function _replaceNameWithPlaceholderImpl(
  lyrics: string,
  nameToReplace: string
): Promise<string> {
  if (!nameToReplace || !nameToReplace.trim()) {
    logger.warn('replaceNameWithPlaceholder called with empty nameToReplace');
    return lyrics;
  }

  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Using simple replace for template lyrics placeholder');
    return replaceNameWithPlaceholderSimple(lyrics, nameToReplace);
  }

  try {
    const vertexAI = initializeVertexAI();

    const systemPrompt = `You are a lyrics editor. Your task is to replace every occurrence of a specific person's name with the exact placeholder {{NAME}} in song lyrics.

Rules:
- Replace ONLY the exact name given (as a whole word or phrase). Do not replace the name inside other words (e.g. "Alex" in "Alexander" should not be replaced).
- Use the exact placeholder {{NAME}} (uppercase, double curly braces).
- Preserve all other text, line breaks, section headers like [Verse 1], [Chorus], and formatting exactly.
- Return ONLY the modified lyrics, no explanation or JSON.`;

    const userPrompt = `Lyrics:\n${lyrics}\n\nName to replace with {{NAME}}: ${nameToReplace.trim()}\n\nReturn the lyrics with the name replaced by {{NAME}}.`;

    const text = await generateWithVertexAI(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.templateLyrics.temperature,
      LLM_CONFIG.templateLyrics.maxOutputTokens,
      false, // text mode
    );

    if (!text || !text.trim()) {
      logger.warn('LLM returned empty text for template lyrics, using simple replace');
      return replaceNameWithPlaceholderSimple(lyrics, nameToReplace);
    }

    return text.trim();
  } catch (error) {
    logger.error('LLM replaceNameWithPlaceholder failed, using simple replace', {
      error: error instanceof Error ? error.message : String(error),
    });
    return replaceNameWithPlaceholderSimple(lyrics, nameToReplace);
  }
}

// =============================================================================
// LangSmith Traced Export
// =============================================================================

export const replaceNameWithPlaceholder = maybeTraceable(_replaceNameWithPlaceholderImpl, {
  name: 'replace-name-with-placeholder',
  run_type: 'chain',
  metadata: { module: 'template-lyrics' },
  tags: ['template', 'name-replacement'],
});
