/**
 * Prompt builder for the Audio Model Lyrics Crafter.
 *
 * This crafter prepares lyrics for audio model submission. Lyrics may arrive in two forms:
 *   - Romanized/transliterated (e.g. "Tum mere ho") — must be converted to native script
 *   - Already in native script (e.g. "तुम मेरे हो") — must be passed through unchanged
 *
 * This is Phase 2 of the two-phase lyrics architecture:
 *   Phase 1: LLM generates display lyrics → user edits/approves
 *   Phase 2 (this): Approved lyrics → native-script audio-model-ready output
 */

/**
 * Builds the system prompt for the audio model lyrics crafter.
 */
export function buildAudioModelCrafterSystemPrompt(): string {
  return `You are an expert song lyrics formatter for audio generation systems. Your task is to prepare song lyrics for submission to an audio generation model by ensuring all non-English text is in the correct native script.

Your rules:
1. **If a portion is already in native Indian script (Devanagari, Tamil, Telugu, Bengali, Gurmukhi, Gujarati, Kannada, Malayalam, Urdu), output it exactly as-is.** Do not alter, transliterate back to Roman, or change already-native text.
2. **Convert Romanized (transliterated) non-English text to native script.** If lyrics contain Romanized Hindi (e.g. "Tum mere dil ki dhadkan ho"), convert it to Devanagari ("तुम मेरे दिल की धड़कन हो"). Apply the same for Tamil, Telugu, Bengali, Punjabi, Marathi, Gujarati, Kannada, Malayalam, Urdu, etc.
3. **English portions stay in Latin script.** Do not touch English words or phrases.
4. **Section headers must stay in English Latin script.** Keep [Verse 1], [Chorus], [Bridge], [Outro], etc. exactly as they are.
5. **Preserve all line breaks, spacing, and section structure exactly.**
6. **Proper nouns:** When recipient details are provided, render that name in the native script of the primary language (e.g. "प्रिया" for Hindi). If the name already appears correctly in native script in the lyrics, do not change it.
7. **Do NOT translate, rephrase, reorder, or add/remove any lines.** Your only task is ensuring correct script. The content and structure are already approved.
8. **Output ONLY the processed lyrics text.** No explanations, no JSON, no preamble.`;
}

/**
 * Builds the user prompt for the audio model lyrics crafter.
 */
export function buildAudioModelCrafterUserPrompt(opts: {
  displayLyrics: string;
  languages: string;
  recipientDetails?: string;
  recipientNameInScript?: string;
  isEnglishOnly?: boolean;
}): string {
  const { displayLyrics, languages, recipientDetails, recipientNameInScript, isEnglishOnly } = opts;

  // A user-confirmed native-script name is authoritative: the model must spell
  // the recipient's name exactly this way wherever it appears in the lyrics.
  const confirmedNameContext = recipientNameInScript?.trim()
    ? `\nIMPORTANT — the recipient's name MUST be spelled EXACTLY as "${recipientNameInScript.trim()}" (user-confirmed native-script spelling) everywhere it appears. Do not alter, re-transliterate, or substitute it.`
    : '';

  const recipientContext = recipientDetails?.trim()
    ? `\nRecipient details (use for proper noun spelling in native script): "${recipientDetails.trim()}"${confirmedNameContext}`
    : confirmedNameContext;

  if (isEnglishOnly) {
    return `Song language(s): ${languages}${recipientContext}

These lyrics are in English only. Do NOT convert any English text to another script.
Your ONLY task: identify any Indian proper nouns (names of people, places) in the lyrics and write them in Devanagari script in-place. All other text must remain exactly as-is in English (Latin script).

Lyrics:
---BEGIN LYRICS---
${displayLyrics}
---END LYRICS---

Output ONLY the lyrics with proper nouns converted to Devanagari where applicable. If there are no Indian proper nouns, return the lyrics unchanged.`;
  }

  return `Song language(s): ${languages}${recipientContext}

Lyrics to prepare for audio generation:
---BEGIN LYRICS---
${displayLyrics}
---END LYRICS---

Ensure all non-English text is in its correct native script. If it is already in native script, output it unchanged. Output ONLY the processed lyrics.`;
}
