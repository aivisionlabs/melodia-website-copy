/**
 * Occasion Presets
 *
 * Structured, pre-defined context hints for each occasion. These presets feed
 * into the context analysis and music style generation pipelines so that
 * different occasions produce consistently appropriate output without relying
 * entirely on the LLM to infer everything from scratch.
 *
 * Each preset supplies:
 *  - energyLevel: default energy for the occasion (can be overridden by user mood)
 *  - tempoRange: BPM range string
 *  - defaultThemes: key themes that should appear in lyrics
 *  - instrumentationHints: suggested instruments (cultural context is layered on top)
 *  - suggestedGenres: broad genre suggestions (cultural context is layered on top)
 *  - emotionalTone: default emotional feel
 *  - musicStyleHints: extra keywords that help the music style prompt
 *  - lyricsGuidance: optional extra instructions injected into the lyrics prompt
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface OccasionPreset {
  /** Display name (matches the occasion value stored in song_requests) */
  occasionKey: string;
  energyLevel: EnergyLevel;
  tempoRange: string;
  defaultThemes: string[];
  instrumentationHints: {
    western: string[];
    indian: string[];
  };
  suggestedGenres: {
    western: string[];
    indian: string[];
  };
  emotionalTone: string;
  /** Extra descriptors fed into the music style user prompt */
  musicStyleHints: string[];
  /** Optional extra guidance injected into the lyrics generation prompt */
  lyricsGuidance?: string;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const OCCASION_PRESETS: Record<string, OccasionPreset> = {
  'Kids Birthday': {
    occasionKey: 'Kids Birthday',
    energyLevel: 'high',
    tempoRange: '115-135 BPM',
    defaultThemes: ['celebration', 'joy', 'fun', 'magic', 'wishes', 'growth'],
    instrumentationHints: {
      western: ['acoustic guitar', 'claps', 'light drums', 'synth pads', 'ukulele'],
      indian: ['dhol', 'synths', 'tabla', 'flute'],
    },
    suggestedGenres: {
      western: ['upbeat pop', 'playful pop', 'synth-pop'],
      indian: ['upbeat Bollywood pop', 'Bollywood dance'],
    },
    emotionalTone: 'playful, joyful and celebratory',
    musicStyleHints: ['celebratory', 'fun', 'cheerful', 'playful'],
    lyricsGuidance:
      "Repeat the child's name multiple times. Use upbeat, celebratory, and age-appropriate language. Keep lyrics simple and memorable.",
  },

  'Adult Birthday': {
    occasionKey: 'Adult Birthday',
    energyLevel: 'high',
    tempoRange: '110-130 BPM',
    defaultThemes: ['celebration', 'joy', 'milestones', 'memories', 'wishes'],
    instrumentationHints: {
      western: ['acoustic guitar', 'claps', 'light drums', 'synth pads'],
      indian: ['dhol', 'synths', 'tabla', 'flute'],
    },
    suggestedGenres: {
      western: ['upbeat pop', 'pop-rock', 'synth-pop'],
      indian: ['upbeat Bollywood pop', 'Bollywood dance'],
    },
    emotionalTone: 'joyful and celebratory',
    musicStyleHints: ['celebratory', 'fun', 'cheerful'],
  },

  Weddings: {
    occasionKey: 'Weddings',
    energyLevel: 'medium',
    tempoRange: '85-110 BPM',
    defaultThemes: ['love', 'commitment', 'togetherness', 'journey', 'forever'],
    instrumentationHints: {
      western: ['piano', 'strings', 'acoustic guitar', 'cello'],
      indian: ['dhol', 'strings', 'shehnai', 'sitar'],
    },
    suggestedGenres: {
      western: ['romantic orchestral pop', 'soft acoustic ballad'],
      indian: ['Bollywood wedding anthem', 'romantic Bollywood ballad'],
    },
    emotionalTone: 'romantic and grand',
    musicStyleHints: ['grand', 'romantic', 'festive', 'emotional'],
  },

  Anniversary: {
    occasionKey: 'Anniversary',
    energyLevel: 'medium',
    tempoRange: '80-100 BPM',
    defaultThemes: ['love', 'gratitude', 'memories', 'journey together', 'commitment'],
    instrumentationHints: {
      western: ['piano', 'strings', 'acoustic guitar', 'violin'],
      indian: ['piano', 'strings', 'tabla', 'flute'],
    },
    suggestedGenres: {
      western: ['romantic pop ballad', 'soulful R&B', 'indie folk'],
      indian: ['Bollywood romantic ballad', 'melodic Hindi ghazal'],
    },
    emotionalTone: 'romantic and tender',
    musicStyleHints: ['warm', 'intimate', 'nostalgic'],
  },

  Romantic: {
    occasionKey: 'Romantic',
    energyLevel: 'medium',
    tempoRange: '78-100 BPM',
    defaultThemes: ['love', 'passion', 'devotion', 'beauty', 'togetherness'],
    instrumentationHints: {
      western: ['piano', 'strings', 'acoustic guitar', 'soft drums'],
      indian: ['sitar', 'tabla', 'strings', 'flute'],
    },
    suggestedGenres: {
      western: ['romantic pop ballad', 'R&B love song', 'indie folk'],
      indian: ['Bollywood romantic ballad', 'melodic Hindi love song'],
    },
    emotionalTone: 'passionate and heartfelt',
    musicStyleHints: ['warm', 'intimate', 'passionate', 'tender'],
  },

  Kids: {
    occasionKey: 'Kids',
    energyLevel: 'medium',
    tempoRange: '90-110 BPM',
    defaultThemes: ['fun', 'imagination', 'learning', 'love', 'play'],
    instrumentationHints: {
      western: ['ukulele', 'xylophone', 'light drums', 'piano'],
      indian: ['tabla', 'flute', 'piano', 'harmonium'],
    },
    suggestedGenres: {
      western: ["playful children's pop", 'acoustic folk'],
      indian: ['playful Bollywood kids song', 'nursery rhyme'],
    },
    emotionalTone: 'cheerful and playful',
    musicStyleHints: ['playful', 'innocent', 'cheerful', 'bright'],
    lyricsGuidance:
      "Repeat the child's name frequently. Use simple, singable words. Keep lines short.",
  },

  Party: {
    occasionKey: 'Party',
    energyLevel: 'high',
    tempoRange: '115-130 BPM',
    defaultThemes: ['celebration', 'fun', 'friends', 'energy', 'dance'],
    instrumentationHints: {
      western: ['electric guitar', 'drums', 'synths', 'bass'],
      indian: ['dhol', 'synths', 'electronic beats', 'bass'],
    },
    suggestedGenres: {
      western: ['dance pop', 'pop-rock', 'EDM pop'],
      indian: ['Bollywood party anthem', 'Punjabi bhangra-pop'],
    },
    emotionalTone: 'energetic and exciting',
    musicStyleHints: ['energetic', 'danceable', 'high-energy'],
  },

  Friendship: {
    occasionKey: 'Friendship',
    energyLevel: 'medium',
    tempoRange: '100-118 BPM',
    defaultThemes: ['friendship', 'memories', 'bond', 'fun', 'support'],
    instrumentationHints: {
      western: ['acoustic guitar', 'tambourine', 'drums', 'piano'],
      indian: ['guitar', 'tabla', 'flute', 'claps'],
    },
    suggestedGenres: {
      western: ['upbeat indie pop', 'pop-rock', 'acoustic pop'],
      indian: ['Bollywood friendship anthem', 'upbeat Hindi pop'],
    },
    emotionalTone: 'warm and fun',
    musicStyleHints: ['warm', 'fun', 'carefree', 'joyful'],
  },

  Apology: {
    occasionKey: 'Apology',
    energyLevel: 'low',
    tempoRange: '65-80 BPM',
    defaultThemes: ['regret', 'sincerity', 'hope', 'forgiveness', 'love'],
    instrumentationHints: {
      western: ['acoustic guitar', 'soft piano', 'cello', 'strings'],
      indian: ['harmonium', 'flute', 'soft tabla', 'strings'],
    },
    suggestedGenres: {
      western: ['gentle acoustic ballad', 'soft indie folk'],
      indian: ['melodic Hindi ballad', 'soft Bollywood acoustic'],
    },
    emotionalTone: 'sincere and hopeful',
    musicStyleHints: ['vulnerable', 'sincere', 'gentle', 'hopeful'],
  },

  'Corporate Events': {
    occasionKey: 'Corporate Events',
    energyLevel: 'high',
    tempoRange: '110-125 BPM',
    defaultThemes: ['teamwork', 'achievement', 'innovation', 'success', 'together'],
    instrumentationHints: {
      western: ['piano', 'drums', 'synths', 'electric guitar'],
      indian: ['dhol', 'synths', 'piano', 'strings'],
    },
    suggestedGenres: {
      western: ['uplifting pop anthem', 'motivational pop-rock'],
      indian: ['upbeat Bollywood anthem', 'Bollywood motivational'],
    },
    emotionalTone: 'motivational and inspiring',
    musicStyleHints: ['inspiring', 'professional', 'uplifting', 'energetic'],
  },

  Farewell: {
    occasionKey: 'Farewell',
    energyLevel: 'low',
    tempoRange: '70-90 BPM',
    defaultThemes: ['memories', 'gratitude', 'goodbye', 'hope', 'new beginnings'],
    instrumentationHints: {
      western: ['acoustic guitar', 'piano', 'strings', 'violin'],
      indian: ['sitar', 'flute', 'piano', 'strings'],
    },
    suggestedGenres: {
      western: ['soft acoustic ballad', 'indie folk', 'pop ballad'],
      indian: ['Bollywood emotional ballad', 'melodic Hindi folk'],
    },
    emotionalTone: 'nostalgic and bittersweet',
    musicStyleHints: ['nostalgic', 'bittersweet', 'emotional', 'gentle'],
  },

  Lullaby: {
    occasionKey: 'Lullaby',
    energyLevel: 'low',
    tempoRange: '60-75 BPM',
    defaultThemes: ['sleep', 'dreams', 'comfort', 'love', 'peace'],
    instrumentationHints: {
      western: ['music box', 'soft piano', 'harp', 'strings'],
      indian: ['flute', 'soft tabla', 'harmonium', 'sitar'],
    },
    suggestedGenres: {
      western: ['gentle lullaby', 'soft acoustic'],
      indian: ['Indian lullaby', 'soft Bollywood lullaby'],
    },
    emotionalTone: 'soothing and dreamy',
    musicStyleHints: ['soothing', 'dreamy', 'calming', 'gentle'],
    lyricsGuidance:
      "Use imagery of stars, moon, and sweet dreams. Keep lines short and melodic. Repeat the child's name for personal touch.",
  },

  Siblings: {
    occasionKey: 'Siblings',
    energyLevel: 'medium',
    tempoRange: '95-115 BPM',
    defaultThemes: ['bond', 'memories', 'love-hate', 'support', 'childhood'],
    instrumentationHints: {
      western: ['acoustic guitar', 'piano', 'drums', 'tambourine'],
      indian: ['guitar', 'tabla', 'flute', 'dhol'],
    },
    suggestedGenres: {
      western: ['upbeat indie pop', 'acoustic pop', 'pop-rock'],
      indian: ['Bollywood sibling anthem', 'upbeat Hindi pop'],
    },
    emotionalTone: 'warm and playful',
    musicStyleHints: ['warm', 'fun', 'heartfelt', 'playful'],
  },

  Congratulations: {
    occasionKey: 'Congratulations',
    energyLevel: 'high',
    tempoRange: '110-125 BPM',
    defaultThemes: ['achievement', 'pride', 'celebration', 'success', 'future'],
    instrumentationHints: {
      western: ['piano', 'drums', 'synths', 'electric guitar'],
      indian: ['dhol', 'synths', 'tabla', 'strings'],
    },
    suggestedGenres: {
      western: ['uplifting pop anthem', 'motivational pop-rock'],
      indian: ['upbeat Bollywood anthem', 'festive Bollywood pop'],
    },
    emotionalTone: 'triumphant and inspiring',
    musicStyleHints: ['triumphant', 'proud', 'celebratory', 'uplifting'],
  },

  'Thank You': {
    occasionKey: 'Thank You',
    energyLevel: 'medium',
    tempoRange: '80-100 BPM',
    defaultThemes: ['gratitude', 'appreciation', 'love', 'kindness', 'support'],
    instrumentationHints: {
      western: ['piano', 'acoustic guitar', 'strings', 'soft drums'],
      indian: ['piano', 'tabla', 'flute', 'strings'],
    },
    suggestedGenres: {
      western: ['warm pop ballad', 'acoustic folk', 'soft pop'],
      indian: ['Bollywood gratitude ballad', 'melodic Hindi acoustic'],
    },
    emotionalTone: 'grateful and loving',
    musicStyleHints: ['grateful', 'warm', 'heartfelt', 'appreciative'],
  },

  Motivational: {
    occasionKey: 'Motivational',
    energyLevel: 'high',
    tempoRange: '108-125 BPM',
    defaultThemes: ['perseverance', 'strength', 'hope', 'dreams', 'courage'],
    instrumentationHints: {
      western: ['piano', 'building drums', 'electric guitar', 'synths'],
      indian: ['dhol', 'synths', 'tabla', 'electric guitar'],
    },
    suggestedGenres: {
      western: ['uplifting pop anthem', 'motivational pop-rock'],
      indian: ['Bollywood motivational anthem', 'upbeat Hindi rock'],
    },
    emotionalTone: 'powerful and inspiring',
    musicStyleHints: ['powerful', 'inspiring', 'uplifting', 'anthemic'],
  },

  'Devotional/Spiritual': {
    occasionKey: 'Devotional/Spiritual',
    energyLevel: 'low',
    tempoRange: '65-85 BPM',
    defaultThemes: ['devotion', 'faith', 'peace', 'gratitude', 'spirituality'],
    instrumentationHints: {
      western: ['piano', 'organ', 'strings', 'choir pads'],
      indian: ['harmonium', 'tabla', 'flute', 'sitar'],
    },
    suggestedGenres: {
      western: ['spiritual hymn', 'gospel ballad', 'contemplative folk'],
      indian: ['bhajan', 'devotional Bollywood', 'kirtan'],
    },
    emotionalTone: 'serene and soulful',
    musicStyleHints: ['serene', 'meditative', 'spiritual', 'soulful'],
  },

  'Festive/Holiday': {
    occasionKey: 'Festive/Holiday',
    energyLevel: 'high',
    tempoRange: '110-130 BPM',
    defaultThemes: ['celebration', 'joy', 'togetherness', 'tradition', 'festivity'],
    instrumentationHints: {
      western: ['bells', 'piano', 'drums', 'strings'],
      indian: ['dhol', 'shehnai', 'tabla', 'synths'],
    },
    suggestedGenres: {
      western: ['festive pop', 'holiday pop', 'upbeat folk'],
      indian: ['Bollywood festive anthem', 'Punjabi festive bhangra'],
    },
    emotionalTone: 'joyful and festive',
    musicStyleHints: ['festive', 'vibrant', 'celebratory', 'colorful'],
  },

  Parents: {
    occasionKey: 'Parents',
    energyLevel: 'low',
    tempoRange: '72-90 BPM',
    defaultThemes: ['gratitude', 'love', 'sacrifice', 'memories', 'family'],
    instrumentationHints: {
      western: ['piano', 'acoustic guitar', 'strings', 'violin'],
      indian: ['piano', 'flute', 'strings', 'soft tabla'],
    },
    suggestedGenres: {
      western: ['soft acoustic folk', 'warm pop ballad'],
      indian: ['Bollywood emotional ballad', 'melodic Hindi folk'],
    },
    emotionalTone: 'grateful and emotional',
    musicStyleHints: ['emotional', 'tender', 'grateful', 'loving'],
  },

  Family: {
    occasionKey: 'Family',
    energyLevel: 'medium',
    tempoRange: '85-105 BPM',
    defaultThemes: ['family', 'bond', 'love', 'togetherness', 'home'],
    instrumentationHints: {
      western: ['acoustic guitar', 'piano', 'soft drums', 'strings'],
      indian: ['tabla', 'flute', 'piano', 'harmonium'],
    },
    suggestedGenres: {
      western: ['warm acoustic pop', 'folk pop', 'pop ballad'],
      indian: ['Bollywood family anthem', 'melodic Hindi pop'],
    },
    emotionalTone: 'warm and heartfelt',
    musicStyleHints: ['warm', 'heartfelt', 'family', 'togetherness'],
  },
};

// ---------------------------------------------------------------------------
// Generic Default Preset (used when no exact or fuzzy match is found)
// ---------------------------------------------------------------------------

const GENERIC_DEFAULT_PRESET: OccasionPreset = {
  occasionKey: '_generic',
  energyLevel: 'medium',
  tempoRange: '85-105 BPM',
  defaultThemes: ['emotion', 'connection', 'celebration', 'memories'],
  instrumentationHints: {
    western: ['piano', 'acoustic guitar', 'strings', 'light drums'],
    indian: ['piano', 'tabla', 'flute', 'strings'],
  },
  suggestedGenres: {
    western: ['pop ballad', 'acoustic pop', 'soft pop'],
    indian: ['Bollywood pop', 'melodic Hindi pop'],
  },
  emotionalTone: 'heartfelt and personal',
  musicStyleHints: ['heartfelt', 'personal', 'warm'],
};

// ---------------------------------------------------------------------------
// Keyword → Occasion Fuzzy Mapping
// ---------------------------------------------------------------------------

/**
 * Maps keyword patterns found in custom occasion strings to the closest
 * existing preset. Entries are checked in order — first match wins.
 */
const KEYWORD_TO_OCCASION: [RegExp, string][] = [
  // Baby-related → Kids
  [/\b(baby\s*shower|newborn|new\s*born|welcome\s*baby)\b/i, 'Kids'],
  // Retirement → Farewell
  [/\b(retire(?:ment|d|e)?)\b/i, 'Farewell'],
  // Academic / professional achievements → Congratulations
  [/\b(graduation|graduate|convocation|promot(?:ion|ed))\b/i, 'Congratulations'],
  // Engagement / ring → Weddings
  [/\b(engagement|engaged|ring\s*ceremony)\b/i, 'Weddings'],
  // Indian wedding ceremonies → Weddings
  [/\b(sangeet|mehndi|mehendi|haldi)\b/i, 'Weddings'],
  // Valentine → Romantic
  [/\b(valentine|proposal|propose)\b/i, 'Romantic'],
  // Parent-related → Parents
  [/\b(mother|mom|maa|mummy|mama|father|dad|papa|daddy|grandparent|grandmother|grandfather|nana|nani|dada|dadi|mother'?s?\s*day|father'?s?\s*day)\b/i, 'Parents'],
  // Housewarming / prom → Party
  [/\b(housewarming|house\s*warming|prom|dance\s*night)\b/i, 'Party'],
  // Festivals & holidays → Festive/Holiday
  [/\b(new\s*year|christmas|diwali|holi|eid|navratri|onam|pongal|lohri|baisakhi|easter|thanksgiving|halloween|ramadan|festival|holiday|ganesh\s*chaturthi|makar\s*sankranti)\b/i, 'Festive/Holiday'],
  // Recovery / get well → Apology (similar low-energy, gentle tone)
  [/\b(get\s*well|recovery|heal(?:ing)?|sympathy|condolence)\b/i, 'Apology'],
  // Memorial → Farewell
  [/\b(memorial|remembrance|in\s*memory|tribute)\b/i, 'Farewell'],
  // Teacher / mentor → Thank You
  [/\b(teacher|guru|mentor)\b/i, 'Thank You'],
  // Rakhi → Siblings
  [/\b(rakhi|raksha\s*bandhan|bhai\s*dooj)\b/i, 'Siblings'],
  // Success / award → Congratulations
  [/\b(award|achievement|success|accomplish(?:ed|ment)?)\b/i, 'Congratulations'],
  // Reunion → Family
  [/\b(reunion|gathering|homecoming)\b/i, 'Family'],
  // Welcome → Kids (welcome baby) or generic
  [/\b(welcome)\b/i, 'Kids'],
];

// ---------------------------------------------------------------------------
// Resolved Preset (includes match metadata)
// ---------------------------------------------------------------------------

export type PresetMatchType = 'exact' | 'fuzzy' | 'default';

export interface ResolvedPreset {
  preset: OccasionPreset;
  matchType: PresetMatchType;
  /** For fuzzy matches, the occasion key that was matched to */
  matchedOccasion?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the occasion preset for the given occasion key, or undefined if
 * no preset is defined for that occasion.
 *
 * @deprecated Prefer {@link resolveOccasionPreset} which always returns a
 * result (exact, fuzzy, or generic default).
 */
export function getOccasionPreset(occasion: string | undefined | null): OccasionPreset | undefined {
  if (!occasion) return undefined;

  // Exact match first
  if (OCCASION_PRESETS[occasion]) return OCCASION_PRESETS[occasion];

  // Legacy: "Birthday" (old single option) → Adult Birthday
  if (occasion.trim() === 'Birthday' && OCCASION_PRESETS['Adult Birthday']) {
    return OCCASION_PRESETS['Adult Birthday'];
  }

  // Case-insensitive lookup
  const normalised = occasion.trim().toLowerCase();
  for (const [key, preset] of Object.entries(OCCASION_PRESETS)) {
    if (key.toLowerCase() === normalised) return preset;
  }

  return undefined;
}

/**
 * Resolves the best-matching occasion preset for the given occasion string.
 *
 * Match priority:
 *  1. **Exact** — direct key match (case-insensitive).
 *  2. **Fuzzy** — keyword-based matching against the custom occasion text.
 *  3. **Default** — a balanced generic preset when nothing else matches.
 *
 * Always returns a valid preset + metadata about how the match was made.
 */
export function resolveOccasionPreset(occasion: string | undefined | null): ResolvedPreset {
  if (!occasion || !occasion.trim()) {
    return { preset: GENERIC_DEFAULT_PRESET, matchType: 'default' };
  }

  // 1. Exact / case-insensitive match
  const exactPreset = getOccasionPreset(occasion);
  if (exactPreset) {
    return { preset: exactPreset, matchType: 'exact' };
  }

  // 2. Fuzzy keyword match
  const trimmed = occasion.trim();
  for (const [pattern, occasionKey] of KEYWORD_TO_OCCASION) {
    if (pattern.test(trimmed) && OCCASION_PRESETS[occasionKey]) {
      return {
        preset: OCCASION_PRESETS[occasionKey],
        matchType: 'fuzzy',
        matchedOccasion: occasionKey,
      };
    }
  }

  // 3. Generic default
  return { preset: GENERIC_DEFAULT_PRESET, matchType: 'default' };
}

/**
 * Returns all available occasion preset keys (for admin/config purposes).
 */
export function getAvailableOccasionKeys(): string[] {
  return Object.keys(OCCASION_PRESETS);
}

/**
 * Returns the generic default preset (useful for testing / fallback logic).
 */
export function getGenericDefaultPreset(): OccasionPreset {
  return { ...GENERIC_DEFAULT_PRESET };
}

/**
 * Occasions that are inherently tied to Indian culture and should use Indian
 * instruments/genres regardless of language. All other occasions default to
 * universal/western instruments because the occasion (not the language)
 * determines the music style.
 */
const CULTURALLY_INDIAN_OCCASIONS = new Set([
  'Weddings', 'Sangeet', 'Haldi', 'Mehndi', 'Ring Ceremony',
  'Festive/Holiday', 'Devotional/Spiritual',
]);

/**
 * Returns true when the occasion is inherently tied to Indian culture and
 * should use Indian instruments/genres.
 */
export function isIndianCulturalOccasion(occasion: string | undefined | null): boolean {
  if (!occasion) return false;
  const trimmed = occasion.trim();

  // Direct match (case-insensitive)
  for (const key of CULTURALLY_INDIAN_OCCASIONS) {
    if (key.toLowerCase() === trimmed.toLowerCase()) return true;
  }

  // Fuzzy match for Indian-specific occasion keywords
  return /\b(sangeet|mehndi|mehendi|haldi|ring\s*ceremony|diwali|holi|navratri|pongal|onam|lohri|baisakhi|ganesh|makar|eid|ramadan|bhajan|devotional|kirtan)\b/i.test(trimmed);
}

/**
 * Returns instrumentation hints from the preset.
 *
 * Uses the OCCASION to decide whether to pick Indian or western instruments
 * (not the language/cultural context). Only culturally Indian occasions
 * (weddings, festivals, devotional) get Indian instruments by default.
 *
 * @deprecated culturalContext param is kept for backward compat but ignored.
 */
export function getInstrumentationForCulture(
  preset: OccasionPreset,
  _culturalContext: string,
  occasion?: string,
): string[] {
  if (isIndianCulturalOccasion(occasion)) {
    return preset.instrumentationHints.indian;
  }
  return preset.instrumentationHints.western;
}

/**
 * Returns genre suggestions from the preset.
 *
 * Uses the OCCASION to decide whether to pick Indian or western genres
 * (not the language/cultural context). Only culturally Indian occasions
 * (weddings, festivals, devotional) get Indian genres by default.
 *
 * @deprecated culturalContext param is kept for backward compat but ignored.
 */
export function getGenresForCulture(
  preset: OccasionPreset,
  _culturalContext: string,
  occasion?: string,
): string[] {
  if (isIndianCulturalOccasion(occasion)) {
    return preset.suggestedGenres.indian;
  }
  return preset.suggestedGenres.western;
}
