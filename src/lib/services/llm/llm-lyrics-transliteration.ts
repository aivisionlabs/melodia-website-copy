import { traceable } from 'langsmith/traceable';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, LLM_CONFIG } from './llm-shared';

export interface TransliterationRequest {
  text: string;
  languages?: string;
  /** User-provided recipient details (e.g. "Priya, my friend"). When set, proper nouns
   * in the lyrics (especially the recipient's name) must be transliterated using exactly
   * the same spelling the user used—do not phonetically reinterpret. */
  recipientDetails?: string;
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

async function _transliterateToEnglishImpl(
  req: TransliterationRequest
): Promise<string | null> {
  const { text, languages, recipientDetails } = req;

  if (!text || !text.trim()) {
    return null;
  }

  // Demo mode: avoid real LLM calls and just return original lyrics
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Skipping real transliteration, returning original lyrics');
    return text;
  }

  const systemInstructions =
    'You are an expert transliteration assistant. Your task is to transliterate song lyrics from their original script into English (Latin) letters only, without translating the meaning. ' +
    'Preserve line breaks, spacing, punctuation, and section headers like [Verse 1], [Chorus], etc. ' +
    'Do not add any explanations, prefixes, suffixes, metadata, or markdown. Only output the transliterated lyrics text.';

  const languageInfo = languages
    ? `Original languages: ${languages}. Use this only to infer pronunciation; always output in English (Latin script).`
    : 'Output must always be English (Latin letters), even if the original lyrics are in another script.';

  const properNounsRule =
    recipientDetails && recipientDetails.trim()
      ? `\n\nCRITICAL - Proper noun spellings: The user who requested this song described the recipient as: "${recipientDetails.trim()}". When transliterating proper nouns (especially the recipient's name) from Devanagari or other scripts into Latin script, you MUST use exactly the same spelling the user used for those names. Do not alter, phonetically reinterpret, or "correct" the spelling—match the user's spelling character-for-character.`
      : '';

  const userPrompt = `${languageInfo}${properNounsRule}

Original lyrics:
"""
${text}
"""

Now return ONLY the transliterated lyrics in English (Latin) letters. Do NOT translate or explain, only transliterate.`;

  const startTime = Date.now();
  const temperatures = [
    LLM_CONFIG.transliteration.temperature_attempt1,
    LLM_CONFIG.transliteration.temperature_attempt2,
    LLM_CONFIG.transliteration.temperature_attempt3,
  ];

  try {
    const vertexAI = initializeVertexAI();

    for (let i = 0; i < temperatures.length; i++) {
      const attemptName = `Attempt ${i + 1}`;
      const temperature = temperatures[i];

      try {
        logger.info(`Transliteration ${attemptName} starting`, { temperature });

        const result = await generateWithVertexAI(
          vertexAI,
          systemInstructions,
          userPrompt,
          temperature,
          LLM_CONFIG.transliteration.maxOutputTokens,
          false, // text mode, not JSON
        );

        const trimmed = result.trim();
        if (!trimmed) {
          throw new Error('Empty transliteration response');
        }

        const duration = Date.now() - startTime;
        logger.info(`Transliteration completed on ${attemptName}`, { duration_ms: duration });
        return trimmed;
      } catch (error) {
        logger.warn(`Transliteration ${attemptName} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });

        // If this is the last attempt, fall through to return null
        if (i === temperatures.length - 1) {
          const duration = Date.now() - startTime;
          logger.error('All transliteration attempts failed', {
            duration_ms: duration,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error transliterating lyrics to English', {
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// =============================================================================
// LangSmith Traced Export
// =============================================================================

export const transliterateToEnglish = maybeTraceable(_transliterateToEnglishImpl, {
  name: 'transliterate-to-english',
  run_type: 'chain',
  metadata: { module: 'transliteration' },
  tags: ['transliteration'],
});
