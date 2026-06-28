/**
 * Client-safe transliteration language data.
 *
 * Shared by the server-side transliteration LLM service and the client-side
 * recipient name confirmation UI. Contains NO server-only imports so it is safe
 * to bundle into the browser.
 */

/**
 * Map a language to the native script we transliterate names into.
 * Languages absent from this map are treated as non-transliterable (Latin /
 * passthrough) — e.g. English and most non-Indic languages.
 */
export const LANGUAGE_TO_SCRIPT: Record<string, string> = {
  hindi: "Devanagari",
  marathi: "Devanagari",
  sanskrit: "Devanagari",
  nepali: "Devanagari",
  bhojpuri: "Devanagari",
  rajasthani: "Devanagari",
  haryanvi: "Devanagari",
  maithili: "Devanagari",
  konkani: "Devanagari",
  dogri: "Devanagari",
  bodo: "Devanagari",
  bengali: "Bengali",
  assamese: "Bengali (Assamese)",
  punjabi: "Gurmukhi",
  tamil: "Tamil",
  telugu: "Telugu",
  kannada: "Kannada",
  tulu: "Kannada",
  malayalam: "Malayalam",
  gujarati: "Gujarati",
  urdu: "Urdu (Perso-Arabic)",
  kashmiri: "Urdu (Perso-Arabic)",
  sindhi: "Urdu (Perso-Arabic)",
  odia: "Odia",
  manipuri: "Meitei Mayek",
  santali: "Ol Chiki",
};

/**
 * Display-ordered list of languages offered in the name confirmation selector.
 */
export const TRANSLITERABLE_LANGUAGES = [
  "Hindi",
  "Marathi",
  "Bengali",
  "Punjabi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Gujarati",
  "Urdu",
  "Odia",
  "Assamese",
  "Nepali",
  "Bhojpuri",
  "Rajasthani",
  "Konkani",
  "Maithili",
  "Sanskrit",
  "Manipuri",
  "Santali",
] as const;

/**
 * Resolve a free-form language string to the native script name, if any.
 * Handles compound strings like "Hindi + English" by picking the first
 * transliterable language found.
 */
export function resolveScriptForLanguage(language: string): string | null {
  const lowered = (language || "").toLowerCase();
  for (const [lang, script] of Object.entries(LANGUAGE_TO_SCRIPT)) {
    if (lowered.includes(lang)) {
      return script;
    }
  }
  return null;
}

/** Whether a name confirmation step makes sense for this language. */
export function isTransliterableLanguage(language: string): boolean {
  return resolveScriptForLanguage(language) !== null;
}

/**
 * Pick the first transliterable language from a free-form / compound language
 * string (e.g. "Tamil + English" → "Tamil"). Returns null if none match.
 */
export function firstTransliterableLanguage(language: string): string | null {
  const lowered = (language || "").toLowerCase();
  for (const lang of TRANSLITERABLE_LANGUAGES) {
    if (lowered.includes(lang.toLowerCase())) {
      return lang;
    }
  }
  return null;
}

/**
 * Returns true when free-text feedback suggests the user has a complaint about
 * how a name is pronounced / sung — used to conditionally show the script-picker
 * in variation panels so it doesn't appear for unrelated feedback.
 */
export function mentionsPronunciation(text: string): boolean {
  const t = (text || "").toLowerCase();
  return (
    t.includes("pronounc") ||
    t.includes("name") ||
    t.includes("sound") ||
    t.includes("spell") ||
    t.includes("sang") ||
    t.includes("say ")
  );
}
