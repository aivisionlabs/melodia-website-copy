export const PREDEFINED_TAGS = [
  // Vibe
  'fun',
  'bouncy',
  'playful',
  'energetic',
  'soothing',
  'calm',
  'romantic',
  'emotional',
  'uplifting',
  'inspirational',
  'nostalgic',
  'festive',
  'groovy',
  'quirky',
  'heartfelt',
  'devotional',
  'cheerful',
  'melancholic',
  'motivational',
  'sweet',

  // Audience
  'boy',
  'girl',
  'men',
  'women',
  'kids-3-5',
  'kids-6-9',
  'kids-10-12',
  'teen-boys',
  'teen-girls',
  'grandpa',
  'grandma',
  'husband',
  'wife',
  'friend',
  'colleague',
  'teacher',
  'parent',
  'baby',
  'toddler',

  // Genre / Style
  'pop',
  'indie',
  'classical',
  'folk',
  'hip-hop',
  'carnatic',
  'jazz',
  'rock',
  'acoustic',
  'r-and-b',
  'bollywood',
  'sufi',
  'rap',
  'lofi',

  // Occasion / Theme
  'birthday',
  'wedding',
  'anniversary',
  'mothers-day',
  'fathers-day',
  'graduation',
  'farewell',
  'thank-you',
  'love-song',
  'friendship',
  'retirement',
  'baby-shower',
  'get-well-soon',
  'new-year',
  'eid',
  'diwali',
  'christmas',
  'holi',
  'navratri',
  'raksha-bandhan',
  'valentines-day',
] as const;

export type SongTag = (typeof PREDEFINED_TAGS)[number];

/** Tags the AI backfill is allowed to assign. Occasion tags are excluded because
 *  the occasion is already captured via categories — AI infers vibe, audience, genre only. */
export const AI_TAGGABLE_TAGS = PREDEFINED_TAGS.filter((t) =>
  ![
    'birthday', 'wedding', 'anniversary', 'mothers-day', 'fathers-day',
    'graduation', 'farewell', 'thank-you', 'love-song', 'friendship',
    'retirement', 'baby-shower', 'get-well-soon', 'new-year',
    'eid', 'diwali', 'christmas', 'holi', 'navratri',
    'raksha-bandhan', 'valentines-day',
  ].includes(t)
);

export const TAG_GROUPS: Array<{ label: string; tags: string[] }> = [
  {
    label: 'Vibe',
    tags: [
      'fun', 'bouncy', 'playful', 'energetic', 'soothing', 'calm',
      'romantic', 'emotional', 'uplifting', 'inspirational', 'nostalgic',
      'festive', 'groovy', 'quirky', 'heartfelt', 'devotional',
      'cheerful', 'melancholic', 'motivational', 'sweet',
    ],
  },
  {
    label: 'Audience',
    tags: [
      'baby', 'toddler', 'kids-3-5', 'kids-6-9', 'kids-10-12',
      'teen-boys', 'teen-girls', 'boy', 'girl', 'men', 'women',
      'husband', 'wife', 'parent', 'grandpa', 'grandma',
      'friend', 'colleague', 'teacher',
    ],
  },
  {
    label: 'Genre',
    tags: [
      'pop', 'indie', 'classical', 'folk', 'hip-hop', 'carnatic',
      'jazz', 'rock', 'acoustic', 'r-and-b', 'bollywood', 'sufi', 'rap', 'lofi',
    ],
  },
  {
    label: 'Occasion',
    tags: [
      'birthday', 'wedding', 'anniversary', 'mothers-day', 'fathers-day',
      'graduation', 'farewell', 'thank-you', 'love-song', 'friendship',
      'retirement', 'baby-shower', 'get-well-soon', 'new-year',
      'eid', 'diwali', 'christmas', 'holi', 'navratri',
      'raksha-bandhan', 'valentines-day',
    ],
  },
];

/** Lightweight heuristic to suggest tags from song metadata — no AI call needed. */
export function getRecommendedTags(song: {
  title?: string | null;
  description?: string | null;
  music_style?: string | null;
  language?: string | null;
}): string[] {
  const recommended = new Set<string>();
  const haystack = [song.title, song.description, song.music_style, song.language]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const rules: Array<[RegExp, string[]]> = [
    [/birthday/i, ['birthday', 'festive', 'fun']],
    [/wedding|bride|groom|shaadi/i, ['wedding', 'romantic', 'festive']],
    [/mother|mom|maa|amma/i, ['mothers-day', 'emotional', 'heartfelt']],
    [/father|dad|papa|appa/i, ['fathers-day', 'emotional', 'heartfelt']],
    [/friend|yaar|dost/i, ['friendship', 'fun']],
    [/love|romantic|pyaar|ishq/i, ['romantic', 'love-song']],
    [/devotional|bhajan|prayer|mandir|bhakti/i, ['devotional', 'carnatic', 'calm']],
    [/carnatic|classical/i, ['carnatic', 'classical']],
    [/bollywood|hindi film/i, ['bollywood']],
    [/hip.?hop|rap/i, ['hip-hop', 'rap', 'energetic']],
    [/jazz/i, ['jazz']],
    [/folk/i, ['folk']],
    [/sufi/i, ['sufi', 'soothing']],
    [/lo.?fi/i, ['lofi', 'calm']],
    [/kids?|child|children|toddler|baby/i, ['kids-6-9', 'fun', 'playful']],
    [/energetic|upbeat|dance/i, ['energetic', 'bouncy', 'fun']],
    [/sooth|calm|relax/i, ['soothing', 'calm']],
    [/hindi/i, ['bollywood']],
    [/christmas|xmas/i, ['christmas', 'festive']],
    [/diwali/i, ['diwali', 'festive']],
    [/eid/i, ['eid', 'festive']],
    [/graduation/i, ['graduation', 'uplifting']],
    [/retirement/i, ['retirement', 'nostalgic']],
    [/farewell/i, ['farewell', 'emotional']],
    [/new year/i, ['new-year', 'festive']],
    [/valentines?|valentine/i, ['valentines-day', 'romantic']],
    [/raksha|rakshabandhan/i, ['raksha-bandhan', 'heartfelt']],
    [/holi/i, ['holi', 'festive', 'fun']],
    [/navratri/i, ['navratri', 'festive', 'energetic']],
    [/baby shower/i, ['baby-shower', 'sweet', 'fun']],
    [/anniversary/i, ['anniversary', 'romantic']],
    [/thank.?you|gratitude/i, ['thank-you', 'heartfelt']],
  ];

  for (const [pattern, tags] of rules) {
    if (pattern.test(haystack)) {
      for (const tag of tags) recommended.add(tag);
    }
  }

  return Array.from(recommended).filter((t) =>
    (PREDEFINED_TAGS as readonly string[]).includes(t)
  );
}
