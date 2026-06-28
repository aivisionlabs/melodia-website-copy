/**
 * Transliterate a recipient's name into the native script of a target Indian
 * language, returning a primary candidate plus a few alternates so the user can
 * confirm the spelling/dialect that matches their pronunciation.
 *
 * Used by the create-song / create flows so the name supplied to SUNO is in the
 * correct script and dialect (e.g. "Aanya" → "आन्या" / "आन्या" / "अन्या").
 */

import { traceable } from 'langsmith/traceable';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { resolveScriptForLanguage } from '@/lib/transliteration-languages';
import {
  initializeVertexAI,
  generateWithVertexAI,
  parseLlmJsonText,
  LLM_CONFIG,
} from './llm-shared';

export {
  resolveScriptForLanguage,
  isTransliterableLanguage,
} from '@/lib/transliteration-languages';

export interface TransliterateNameRequest {
  /** Recipient name as typed by the user (usually Latin script). */
  name: string;
  /** Target language whose native script we transliterate into, e.g. "Hindi". */
  language: string;
}

export interface TransliterateNameResult {
  /** Best-guess name in the native script. */
  primary: string;
  /** A few alternate spellings/dialect variants in the native script. */
  alternates: string[];
  /** The script the candidates are written in, e.g. "Devanagari". */
  script: string;
  /** Whether transliteration was actually performed (false = passthrough). */
  transliterated: boolean;
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

function dedupeCandidates(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = (value || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function _transliterateNameImpl(
  req: TransliterateNameRequest
): Promise<TransliterateNameResult> {
  const name = (req.name || '').trim();
  const language = (req.language || '').trim();
  const script = resolveScriptForLanguage(language);

  // Passthrough: empty name, non-Indic language, or demo mode.
  if (!name || !script) {
    return { primary: name, alternates: [], script: script ?? 'Latin', transliterated: false };
  }

  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Skipping name transliteration, using name as-is');
    return { primary: name, alternates: [], script, transliterated: false };
  }

  const systemPrompt = `You are an expert transliterator of personal names into Indian scripts.

Task: Given a person's name in Latin (Roman) script, produce faithful native-script spellings in the target script.

Rules:
1. Transliterate the COMPLETE name — do not omit, shorten, or truncate any syllable, consonant, or vowel. The output must phonetically represent the ENTIRE input name.
2. Map EVERY consonant, vowel, and syllable from the Latin input to its closest phonetic equivalent in the target script in order.
3. Write candidates ONLY in the ${script} script (${language} language) — no Latin/Roman text, transliteration notes, quotes, or explanations anywhere in the output.
4. "primary" is the most natural, commonly-used spelling for how the name is pronounced.
5. "alternates" lists up to 3 distinct, valid alternative spellings that reflect plausible pronunciation/dialect differences (e.g. long vs short vowels, nukta variants, retroflex vs dental). Do not invent unrelated names.
6. If the input name is already in the target native script, return it as-is with minimal/no alternates.
7. Respond ONLY with strict JSON: {"primary": string, "alternates": string[]}.

Example — "Ananya" in Hindi (Devanagari): {"primary": "अनन्या", "alternates": ["अनान्या"]}
Example — "Ranmesh" in Hindi (Devanagari): {"primary": "रणमेश", "alternates": ["रनमेश"]}
Example — "Priya" in Tamil: {"primary": "பிரியா", "alternates": ["ப்ரியா"]}`;

  const userPrompt = `Name: ${name}
Target language: ${language}
Target script: ${script}

Return JSON with the native-script spellings now.`;

  try {
    const vertexAI = initializeVertexAI();

    const text = await generateWithVertexAI(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.transliteration.temperature_attempt1,
      128, // name JSON is tiny; thinking disabled below to avoid eating into this budget
      true, // JSON mode
      LLM_CONFIG.transliteration.modelName,
      0, // thinkingBudget: disable thinking — overkill for a single name
    );

    const parsed = parseLlmJsonText(text) as {
      primary?: unknown;
      alternates?: unknown;
    };

    const primary =
      typeof parsed.primary === 'string' ? parsed.primary.trim() : '';
    const alternatesRaw = Array.isArray(parsed.alternates)
      ? parsed.alternates.filter((v): v is string => typeof v === 'string')
      : [];

    if (!primary) {
      logger.warn('transliterateName: empty primary candidate, using original name', {
        language,
        nameLength: name.length,
      });
      return { primary: name, alternates: [], script, transliterated: false };
    }

    // Primary should not appear among alternates; cap alternates at 3.
    const alternates = dedupeCandidates(alternatesRaw)
      .filter((alt) => alt !== primary)
      .slice(0, 3);

    logger.info('Name transliterated', {
      language,
      script,
      nameLength: name.length,
      alternatesCount: alternates.length,
    });

    return { primary, alternates, script, transliterated: true };
  } catch (error) {
    logger.error('Name transliteration failed, using original name', {
      error: error instanceof Error ? error.message : String(error),
      language,
    });
    return { primary: name, alternates: [], script, transliterated: false };
  }
}

export const transliterateName = maybeTraceable(_transliterateNameImpl, {
  name: 'transliterate-name',
  run_type: 'chain',
  metadata: { module: 'transliterate-name' },
  tags: ['name-conversion', 'transliteration'],
});
