/**
 * Audio Model Lyrics Crafter
 *
 * Converts approved Romanized/transliterated display lyrics (customer_lyrics) into
 * audio-model-ready lyrics where all text is in the correct native script.
 *
 * This is Phase 2 of the two-phase lyrics architecture:
 *   Phase 1: LLM generates Romanized display lyrics → user reads/edits
 *   Phase 2 (this): Approved lyrics → native-script audio-model-ready output (model_ready_lyrics)
 */

import { traceable } from 'langsmith/traceable';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, LLM_CONFIG } from './llm-shared';
import {
  buildAudioModelCrafterSystemPrompt,
  buildAudioModelCrafterUserPrompt,
} from './prompts/audio-model-lyrics-crafter-prompt-builder';
import { sanitizeInvisibleChars } from './custom-lyrics-suno-structure-utils';

export interface AudioModelLyricsCrafterRequest {
  /** Approved Romanized display lyrics (customer_lyrics) that the user has reviewed and approved */
  displayLyrics: string;
  /** Language(s) of the song, e.g. "Hindi", "Hindi, English" */
  languages: string;
  /** User-provided recipient details (e.g. "Priya, my friend") for correct name spelling */
  recipientDetails?: string;
  /** User-confirmed recipient name in native script — authoritative spelling for SUNO */
  recipientNameInScript?: string;
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

async function _craftAudioModelLyricsImpl(
  req: AudioModelLyricsCrafterRequest
): Promise<string | null> {
  const { displayLyrics, languages, recipientDetails, recipientNameInScript } = req;

  const sanitizedLyrics = sanitizeInvisibleChars(displayLyrics || '').trim();

  if (!sanitizedLyrics) {
    logger.warn('craftAudioModelLyrics called with empty displayLyrics');
    return null;
  }

  // Demo mode: return display lyrics as-is (no native-script conversion needed for testing)
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Skipping audio model lyrics crafting, returning display lyrics as-is');
    return sanitizedLyrics;
  }

  const langs = (languages || '').toLowerCase();
  const isEnglishOnly =
    langs === 'english' ||
    langs === '' ||
    (langs.includes('english') && !langs.match(/hindi|tamil|telugu|bengali|punjabi|marathi|gujarati|kannada|malayalam|urdu/));

  const systemPrompt = buildAudioModelCrafterSystemPrompt();
  const userPrompt = buildAudioModelCrafterUserPrompt({
    displayLyrics: sanitizedLyrics,
    languages,
    recipientDetails,
    recipientNameInScript,
    isEnglishOnly,
  });

  const temperatures = [0.2, 0.4, 0.6];
  const startTime = Date.now();

  try {
    const vertexAI = initializeVertexAI();

    for (let i = 0; i < temperatures.length; i++) {
      const attemptNum = i + 1;
      const temperature = temperatures[i];

      try {
        logger.info(`Audio model lyrics crafter attempt ${attemptNum}`, {
          temperature,
          languages,
          lyricsLength: sanitizedLyrics.length,
        });

        const result = await generateWithVertexAI(
          vertexAI,
          systemPrompt,
          userPrompt,
          temperature,
          LLM_CONFIG.transliteration.maxOutputTokens,
          false, // plain text output
          LLM_CONFIG.transliteration.modelName,
        );

        const trimmed = result?.trim();
        if (!trimmed) {
          throw new Error('Empty response from audio model lyrics crafter');
        }

        const duration = Date.now() - startTime;
        logger.info(`Audio model lyrics crafted successfully on attempt ${attemptNum}`, {
          duration_ms: duration,
          outputLength: trimmed.length,
        });

        return trimmed;
      } catch (error) {
        logger.warn(`Audio model lyrics crafter attempt ${attemptNum} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (i === temperatures.length - 1) {
          const duration = Date.now() - startTime;
          logger.error('All audio model lyrics crafter attempts failed', {
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
    logger.error('Error in audio model lyrics crafter', {
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const craftAudioModelLyrics = maybeTraceable(_craftAudioModelLyricsImpl, {
  name: 'craft-audio-model-lyrics',
  run_type: 'chain',
  metadata: { module: 'audio-model-lyrics-crafter' },
  tags: ['lyrics', 'audio-model'],
});
