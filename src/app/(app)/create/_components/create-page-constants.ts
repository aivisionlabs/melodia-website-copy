import { ALL_OCCASION_LABELS, OCCASION_OPTIONS } from "@/lib/occasion-suggestions";

export { OCCASION_OPTIONS };

export const PACKAGES = [
  {
    id: "package_1",
    name: "NameDrop",
    price: 199,
    originalPrice: 599,
    tagline: "Pick a song & make it yours",
    emoji: "⚡",
    features: [
      "Pick from 100+ ready-made songs",
      "Your name woven into the lyrics",
      "Hear it free before you pay",
      "Ready in under 2 minutes",
    ],
    popular: false,
  },
  {
    id: "package_2",
    name: "Fully Custom",
    price: 599,
    originalPrice: 1299,
    tagline: "Personalized lyrics, music",
    emoji: "✨",
    features: [
      "AI written lyrics, crafted from your inputs",
      "Review & tweak lyrics before it's made",
      "Pick your favourite from 2 versions",
      "Song ready in minutes",
      "1 free revision if you don't like it",
    ],
    popular: true,
  },
  {
    id: "package_3",
    name: "Pro Studio",
    price: 1499,
    originalPrice: 2999,
    tagline: "Expert crafted, guaranteed to impress",
    emoji: "🎼",
    features: [
      "Expert-crafted lyrics & song",
      "2 free song revisions",
      "24-hour delivery",
      "Edit after generation",
      "WhatsApp support",
      "Best in class AI music generation",
    ],
    popular: false,
  },
] as const;

export const INTERNAL_PACKAGE_ID = "package_internal" as const;
export const INTERNAL_PACKAGE_FALLBACK_ID = "package_2" as const;

export type PackageId =
  | (typeof PACKAGES)[number]["id"]
  | typeof INTERNAL_PACKAGE_ID;

export function getDisplayPackageId(
  packageId: PackageId | undefined,
): (typeof PACKAGES)[number]["id"] | undefined {
  if (!packageId) return undefined;
  if (packageId === INTERNAL_PACKAGE_ID) return INTERNAL_PACKAGE_FALLBACK_ID;
  return packageId;
}

export function getPackageById(
  packageId: PackageId,
): (typeof PACKAGES)[number] | undefined {
  const displayId = getDisplayPackageId(packageId);
  if (!displayId) return undefined;
  return PACKAGES.find((pkg) => pkg.id === displayId);
}

export function formatPackagePrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

export const OCCASION_EMOJIS: Record<string, string> = {
  "Kids Birthday": "🎂",
  "Adult Birthday": "🎂",
  Weddings: "💒",
  Anniversary: "💍",
  Romantic: "❤️",
  Lullaby: "🌙",
  Friendship: "🤝",
  Farewell: "👋",
  "Corporate Events": "💼",
  Apology: "🙏",
  Kids: "🧒",
  Party: "🎉",
  Siblings: "👫",
  Congratulations: "🏆",
  "Thank You": "🙏",
  Motivational: "💪",
  "Devotional/Spiritual": "🕊️",
  "Festive/Holiday": "🎊",
  Parents: "👨‍👩‍👧",
  Family: "🏠",
  "Mother's Day": "👩",
  "Father's Day": "👨",
  Other: "✨",
};

export const OCCASION_THUMBNAILS: Record<string, string> = {
  "Kids Birthday": "/images/occasions/kid-birthday.png",
  "Adult Birthday": "/images/occasions/adult-birthday.png",
  Weddings: "/images/occasions/wedding.png",
  Anniversary: "/images/occasions/anniversary.png",
  Romantic: "/images/occasions/romantic.png",
  Lullaby: "/images/occasions/lullaby.png",
  Friendship: "/images/occasions/friendship.png",
  Farewell: "/images/occasions/farewell.png",
  "Corporate Events": "/images/occasions/corporate.png",
  Apology: "/images/occasions/apology.png",
  Kids: "/images/occasions/kids.png",
  Party: "/images/occasions/party.png",
  Siblings: "/images/occasions/siblings.png",
  Congratulations: "/images/occasions/congratulations.png",
  "Thank You": "/images/occasions/thank-you.png",
  Motivational: "/images/occasions/motivational.png",
  "Devotional/Spiritual": "/images/occasions/devotional.png",
  "Festive/Holiday": "/images/occasions/festive.png",
  Parents: "/images/occasions/parents.png",
  Family: "/images/occasions/family.png",
  "Mother's Day": "/images/occasions/mothers-day/mothers-day-desktop.png",
  "Father's Day": "/images/occasions/fathers-day/fathers-day-hero.png",
};

export const ALL_OCCASIONS = ALL_OCCASION_LABELS;

export const LANGUAGE_PRESETS = ["English", "Hindi", "Telugu", "Punjabi", "Tamil", "Kannada", "Marathi"];

export const DEFAULT_STORY_PROMPT = {
  label: "Anything you'd like to include?",
  placeholders: [
    "Share a memory...",
    "An inside joke...",
    "What makes them special...",
    "Key details for the song...",
  ],
};

export const OCCASION_RECIPIENT_LABELS: Record<string, string> = {
  "Kids Birthday": "Who is the birthday boy/girl?",
  "Adult Birthday": "Who is the birthday person?",
  Weddings: "Who are we celebrating?",
  Anniversary: "Who are we celebrating?",
  Romantic: "Who is your special someone?",
  Lullaby: "Who is the lullaby for?",
  Friendship: "Who is your friend?",
  Farewell: "Who is this song for?",
  "Corporate Events": "Who is the song for? (person or team)",
  Apology: "Who is this apology for?",
  Kids: "Who is the song for?",
  Party: "Who is the song for?",
  Siblings: "Who is your sibling?",
  Congratulations: "Who achieved it?",
  "Thank You": "Who are you thanking?",
  Motivational: "Who is this song for?",
  "Devotional/Spiritual": "Who is the song dedicated to?",
  "Festive/Holiday": "Who is the song for?",
  Parents: "Who is this song for?",
  Family: "Who in the family?",
  "Mother's Day": "Who is the song for?",
  "Father's Day": "Who is the song for?",
  Other: "Who is this song for?",
};

export const DEFAULT_RECIPIENT_LABEL = "Who is this song for?";

/**
 * Multiple recipient examples per occasion (name + relationship).
 * First entry is the default placeholder; all rotate in the input and appear as quick-fill chips.
 */
export const OCCASION_RECIPIENT_EXAMPLES: Record<string, string[]> = {
  "Kids Birthday": [
    "e.g. Arjun, my nephew",
    "e.g. My daughter Alisha",
    "e.g. Kabir, my son",
    "e.g. Little Aisha, my niece",
  ],
  "Adult Birthday": [
    "e.g. Sarah, my best friend",
    "e.g. Dad, who's turning 60",
    "e.g. My sister, who's starting a new job",
    "e.g. Grandma — her 80th",
  ],
  Weddings: [
    "e.g.Saikat",
    "e.g. Priya & Rahul, our friends",
    "e.g. The happy couple",
    "e.g. The bride & groom",
    "e.g. My sister & her fiancé",
  ],
  Anniversary: [
    "e.g. Mom & Dad",
    "e.g. Priya & Rahul, our friends",
    "e.g. A happy couple",
    "e.g. My grandparents",
    "e.g. Us",
  ],
  Romantic: [
    "e.g. Rohan, my partner",
    "e.g. My fiancée, Meera",
    "e.g. The love of my life",
    "e.g. My spouse — date-night surprise",
  ],
  Lullaby: [
    "e.g. Aarav, my son",
    "e.g. Our newborn, 3 months old",
    "e.g. Baby Kiara",
    "e.g. My toddler, bedtime routine",
  ],
  Friendship: [
    "e.g. Sarah, my best friend",
    "e.g. My college roommate",
    "e.g. The whole friend group",
    "e.g. My childhood buddy, Karan",
  ],
  Farewell: [
    "e.g. Neha, my colleague",
    "e.g. Our manager — retirement",
    "e.g. My friend moving abroad",
    "e.g. The team — last day",
  ],
  "Corporate Events": [
    "e.g. Marketing team or John, our manager",
    "e.g. The sales team — Q4 win",
    "e.g. Our CEO — annual address",
    "e.g. New joiners — welcome week",
  ],
  Apology: [
    "e.g. Riya, my sister",
    "e.g. My partner — I messed up",
    "e.g. Mom — I want to say sorry",
    "e.g. My best friend after a fight",
  ],
  Kids: [
    "e.g. Arjun, my nephew",
    "e.g. My preschooler",
    "e.g. The birthday kid — turning 4",
    "e.g. My student — class performance",
  ],
  Party: [
    "e.g. The birthday person's name",
    "e.g. Housewarming — my friends",
    "e.g. Promotion party for Adi",
    "e.g. The guest of honor",
  ],
  Siblings: [
    "e.g. Rohan, my brother",
    "e.g. My twin, Dia",
    "e.g. Little sister — graduation",
    "e.g. My elder sister, my rock",
  ],
  Congratulations: [
    "e.g. Ananya, who just graduated",
    "e.g. The new parents",
    "e.g. My cousin — new job",
    "e.g. The champion — state finals",
  ],
  "Thank You": [
    "e.g. Mom, who always supports me",
    "e.g. My mentor at work",
    "e.g. The friend who showed up",
    "e.g. My teacher — changed my life",
  ],
  Motivational: [
    "e.g. Vikram, who's starting his venture",
    "e.g. My sister — exam season",
    "e.g. A friend going through a tough time",
    "e.g. The team — big launch week",
  ],
  "Devotional/Spiritual": [
    "e.g. Lord Ganesha or Grandma's name",
    "e.g. Our family's prayer group",
    "e.g. A dedication for Diwali",
    "e.g. My guru — guru purnima",
  ],
  "Festive/Holiday": [
    "e.g. Family or Diwali wishes for Mom",
    "e.g. Everyone at our Christmas gathering",
    "e.g. New Year wishes for friends",
    "e.g. The whole household — Eid",
  ],
  Parents: [
    "e.g. Mom & Dad or Mom",
    "e.g. Mom — Mother's Day",
    "e.g. Dad — his retirement",
    "e.g. My parents — thank you",
  ],
  Family: [
    "e.g. My sister Sneha",
    "e.g. Our whole family",
    "e.g. Cousins — reunion trip",
    "e.g. Grandpa — his stories",
  ],
  "Mother's Day": [
    "e.g. Mom",
    "e.g. My mother, Kaushalya",
    "e.g. Ammi",
    "e.g. Maa",
    "e.g. Mumma",
  ],
  "Father's Day": [
    "e.g. Dad",
    "e.g. My father, Ramesh",
    "e.g. Papa",
    "e.g. Abba",
    "e.g. Daddy",
  ],
  Other: [
    "e.g. Name, relationship",
    "e.g. Someone who deserves a song",
    "e.g. A surprise for them",
    "e.g. Just because — for you",
  ],
};

export const OCCASION_RECIPIENT_PLACEHOLDERS: Record<string, string> =
  Object.fromEntries(
    Object.entries(OCCASION_RECIPIENT_EXAMPLES).map(([k, v]) => [k, v[0]]),
  ) as Record<string, string>;

export const DEFAULT_RECIPIENT_PLACEHOLDER = "e.g. Sarah, my best friend";

/** Recipient field when NameDrop (₹199) is selected — name only, no relationship */
export const OCCASION_RECIPIENT_LABELS_NAME_ONLY: Record<string, string> = {
  "Kids Birthday": "What's the birthday boy/girl's name?",
  "Adult Birthday": "What's the birthday person's name?",
  Weddings: "What are the couple's names?",
  Anniversary: "What are the couple's names?",
  Romantic: "What's their name?",
  Lullaby: "What's the little one's name?",
  Friendship: "What's your friend's name?",
  Farewell: "What's their name?",
  "Corporate Events": "Team or person's name",
  Apology: "What's their name?",
  Kids: "What's the child's name?",
  Party: "What's their name?",
  Siblings: "What's your sibling's name?",
  Congratulations: "What's their name?",
  "Thank You": "What's their name?",
  Motivational: "What's their name?",
  "Devotional/Spiritual": "Name or dedication",
  "Festive/Holiday": "What's their name?",
  Parents: "Your parent(s)' name(s)",
  Family: "Who in the family? (names only)",
  Other: "What's their name?",
};

/** Name-only (NameDrop) — short examples per occasion */
export const OCCASION_RECIPIENT_EXAMPLES_NAME_ONLY: Record<string, string[]> = {
  "Kids Birthday": ["e.g. Arjun", "e.g. Aisha", "e.g. Kabir", "e.g. Mia"],
  "Adult Birthday": ["e.g. Sarah", "e.g. Dad", "e.g. Grandma", "e.g. Vikram"],
  Weddings: [
    "e.g. Priya & Rahul",
    "e.g. The happy couple",
    "e.g. Bride & groom",
    "e.g. Anaya & Dev",
  ],
  Anniversary: ["e.g. Arjun", "e.g. Aisha", "e.g. Kabir", "e.g. Mia"],
  Romantic: ["e.g. Rohan", "e.g. Meera", "e.g. My love", "e.g. Partner"],
  Lullaby: ["e.g. Aarav", "e.g. Baby Kiara", "e.g. Little one", "e.g. Kiara"],
  Friendship: ["e.g. Sarah", "e.g. Karan", "e.g. Bestie", "e.g. Roommate"],
  Farewell: ["e.g. Neha", "e.g. Team lead", "e.g. Colleague", "e.g. Boss"],
  "Corporate Events": [
    "e.g. Marketing team",
    "e.g. John",
    "e.g. Sales crew",
    "e.g. New hires",
  ],
  Apology: ["e.g. Riya", "e.g. Mom", "e.g. Partner", "e.g. Friend"],
  Kids: ["e.g. Arjun", "e.g. Aisha", "e.g. Class 3", "e.g. Tot"],
  Party: ["e.g. Maya", "e.g. Host", "e.g. Guest of honor", "e.g. Adi"],
  Siblings: ["e.g. Rohan", "e.g. Dia", "e.g. Bro", "e.g. Didi"],
  Congratulations: [
    "e.g. Ananya",
    "e.g. Graduate",
    "e.g. New parents",
    "e.g. Champ",
  ],
  "Thank You": ["e.g. Mom", "e.g. Mentor", "e.g. Teacher", "e.g. Friend"],
  Motivational: [
    "e.g. Vikram",
    "e.g. You",
    "e.g. Sis",
    "e.g. Team",
  ],
  "Devotional/Spiritual": [
    "e.g. Grandma",
    "e.g. Ganesha",
    "e.g. Guru",
    "e.g. Family altar",
  ],
  "Festive/Holiday": [
    "e.g. Family",
    "e.g. Everyone",
    "e.g. Mom",
    "e.g. Friends",
  ],
  Parents: ["e.g. Mom & Dad", "e.g. Mom", "e.g. Papa", "e.g. Parents"],
  Family: ["e.g. Sneha", "e.g. Cousins", "e.g. Grandpa", "e.g. Folks"],
  Other: ["e.g. Sarah", "e.g. You", "e.g. Them", "e.g. Raman"],
};

export const OCCASION_RECIPIENT_PLACEHOLDERS_NAME_ONLY: Record<string, string> =
  Object.fromEntries(
    Object.entries(OCCASION_RECIPIENT_EXAMPLES_NAME_ONLY).map(([k, v]) => [
      k,
      v[0],
    ]),
  ) as Record<string, string>;

export const DEFAULT_RECIPIENT_LABEL_NAME_ONLY = "What's their name?";
export const DEFAULT_RECIPIENT_PLACEHOLDER_NAME_ONLY = "e.g. Raman";

export const RECIPIENT_INFO_BUBBLE_NAME_ONLY =
  "Enter their first name or how they like to be called";

export function getRecipientExamplesForOccasion(
  occasion: string,
  nameOnly: boolean,
): string[] {
  const map = nameOnly
    ? OCCASION_RECIPIENT_EXAMPLES_NAME_ONLY
    : OCCASION_RECIPIENT_EXAMPLES;
  const fallback = nameOnly
    ? DEFAULT_RECIPIENT_PLACEHOLDER_NAME_ONLY
    : DEFAULT_RECIPIENT_PLACEHOLDER;
  const list = map[occasion];
  return list && list.length > 0 ? list : [fallback];
}

export const OCCASION_STORY_PROMPTS: Record<
  string,
  { label: string; placeholders: string[] }
> = {
  "Kids Birthday": {
    label: "Tell us more about the birthday boy/girl",
    placeholders: [
      "If it's a boy or a girl...",
      "Their favorite toys or cartoons...",
      "A funny habit they have...",
      "What you love most about them...",
    ],
  },
  "Adult Birthday": {
    label: "Tell us more about the birthday person",
    placeholders: [
      "A funny memory you share...",
      "Their favorite hobbies or drinks...",
      "Inside jokes only you two understand...",
      "What makes them so special...",
    ],
  },
  Weddings: {
    label: "Tell us about the couple",
    placeholders: [
      "How they met...",
      "Their favorite things to do together...",
      "A funny story from their relationship...",
      "Your wishes for their future...",
    ],
  },
  Anniversary: {
    label: "Tell us about the couple's journey",
    placeholders: [
      "How many years they are celebrating...",
      "A special memory from their wedding...",
      "What makes their bond unique...",
      "A funny habit they share...",
    ],
  },
  Romantic: {
    label: "Tell us about your special someone",
    placeholders: [
      "How they make you feel...",
      "Your favorite memory together...",
      "The little things you love about them...",
      "Nicknames you have for each other...",
    ],
  },
  Lullaby: {
    label: "Tell us about the little one",
    placeholders: [
      "Their name and age...",
      "Sweet dreams you wish for them...",
      "A soothing memory...",
      "What makes them so precious...",
    ],
  },
  Friendship: {
    label: "Tell us about your friend",
    placeholders: [
      "How you became friends...",
      "The craziest thing you've done together...",
      "Inside jokes...",
      "Why you appreciate them...",
    ],
  },
  Farewell: {
    label: "Tell us about the person leaving",
    placeholders: [
      "Where they are going...",
      "A memorable moment you shared...",
      "What you'll miss the most...",
      "Inside jokes from your time together...",
    ],
  },
  "Corporate Events": {
    label: "Tell us about the event or team",
    placeholders: [
      "The purpose of the event...",
      "Key achievements to celebrate...",
      "Inside jokes from the office...",
      "Company values or culture...",
    ],
  },
  Apology: {
    label: "Tell us what happened",
    placeholders: [
      "What you are apologizing for...",
      "How much they mean to you...",
      "A sweet memory to remind them of the good times...",
      "Your promise for the future...",
    ],
  },
  Kids: {
    label: "Tell us about the kid(s)",
    placeholders: [
      "Their current obsessions...",
      "A funny thing they said recently...",
      "Their personality traits...",
      "What makes them unique...",
    ],
  },
  Party: {
    label: "Tell us about the party",
    placeholders: [
      "The theme or vibe...",
      "Who is attending...",
      "The main event or celebration...",
      "Inside jokes among the group...",
    ],
  },
  Siblings: {
    label: "Tell us about your sibling",
    placeholders: [
      "Childhood memories...",
      "How you annoy each other...",
      "Why you secretly love them...",
      "Inside jokes...",
    ],
  },
  Congratulations: {
    label: "Tell us about the achievement",
    placeholders: [
      "What they achieved...",
      "How hard they worked for it...",
      "A proud moment...",
      "Your wishes for their next steps...",
    ],
  },
  "Thank You": {
    label: "Tell us why you're thankful",
    placeholders: [
      "What they did for you...",
      "How it helped you...",
      "Why you appreciate them...",
      "A special memory...",
    ],
  },
  Motivational: {
    label: "Tell us about their journey",
    placeholders: [
      "What they are striving for...",
      "Their strengths and talents...",
      "A time they overcame a challenge...",
      "Words of encouragement...",
    ],
  },
  "Devotional/Spiritual": {
    label: "Tell us about the spiritual focus",
    placeholders: [
      "The deity or spiritual figure...",
      "Key themes or values...",
      "A personal connection or prayer...",
      "The occasion or festival...",
    ],
  },
  "Festive/Holiday": {
    label: "Tell us about the celebration",
    placeholders: [
      "Which festival or holiday...",
      "Family traditions...",
      "What you love about this time of year...",
      "Wishes for the season...",
    ],
  },
  Parents: {
    label: "Tell us about your parents",
    placeholders: [
      "What you admire most about them...",
      "A favorite family memory...",
      "Sacrifices they made...",
      "Funny habits they have...",
    ],
  },
  Family: {
    label: "Tell us about your family",
    placeholders: [
      "Your family's dynamic...",
      "A memorable vacation or event...",
      "Inside jokes...",
      "What brings you all together...",
    ],
  },
  Other: {
    label: "Anything you'd like to include?",
    placeholders: [
      "Share a memory...",
      "An inside joke...",
      "What makes them special...",
      "Key details for the song...",
    ],
  },
};

export const ALL_LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Punjabi",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Urdu",
  "Odia",
  "Assamese",
  "Rajasthani",
  "Bhojpuri",
  "Haryanvi",
  "Maithili",
  "Konkani",
  "Dogri",
  "Kashmiri",
  "Sanskrit",
  "Sindhi",
  "Nepali",
  "Manipuri",
  "Bodo",
  "Santali",
  "Tulu",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Mandarin",
  "Arabic",
  "Russian",
  "Turkish",
  "Thai",
  "Vietnamese",
  "Swahili",
  "Dutch",
  "Polish",
  "Swedish",
  "Greek",
  "Hebrew",
  "Indonesian",
  "Malay",
  "Filipino",
];

export const MOOD_CHIPS = [
  { label: "Upbeat", emoji: "🎵" },
  { label: "Fun", emoji: "😄" },
  { label: "Groovy", emoji: "🕺" },
  { label: "Slow", emoji: "🌊" },
  { label: "Soothing", emoji: "✨" },
  { label: "Bollywood", emoji: "🎬" },
  { label: "Dancable", emoji: "💃" },
  { label: "High beats", emoji: "🥁" },
  { label: "Rap", emoji: "🎤" },
  { label: "Poetry", emoji: "📜" },
];

export const STORY_LIMIT = parseInt(
  process.env.NEXT_PUBLIC_STORY_CHARACTER_LIMIT || "700",
  10,
);

export const MANUAL_LYRICS_LIMIT = 2100;

/** Occasion-specific advanced music style chips shown in the advanced settings panel. */
export const OCCASION_MUSIC_CHIPS: Record<
  string,
  { label: string; emoji: string }[]
> = {
  "Kids Birthday": [
    { label: "Pop", emoji: "🎈" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "EDM", emoji: "🎛️" },
    { label: "Bhangra", emoji: "🥁" },
    { label: "Funk", emoji: "🎺" },
  ],
  "Adult Birthday": [
    { label: "Pop", emoji: "🎉" },
    { label: "R&B", emoji: "🎷" },
    { label: "Hip Hop", emoji: "🎤" },
    { label: "Jazz", emoji: "🎹" },
    { label: "Retro", emoji: "📻" },
  ],
  Weddings: [
    { label: "Classical", emoji: "🎻" },
    { label: "Cinematic", emoji: "🎬" },
    { label: "Sufi", emoji: "🌹" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Romantic Ballad", emoji: "💕" },
  ],
  Anniversary: [
    { label: "Romantic Ballad", emoji: "💕" },
    { label: "Jazz", emoji: "🎷" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Classical", emoji: "🎻" },
    { label: "Soft Pop", emoji: "🎵" },
  ],
  Romantic: [
    { label: "R&B", emoji: "🎷" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Jazz", emoji: "🎹" },
    { label: "Soul", emoji: "💫" },
    { label: "Soft Pop", emoji: "🎵" },
  ],
  Kids: [
    { label: "Pop", emoji: "🎈" },
    { label: "Nursery Rhyme", emoji: "🧸" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Fun", emoji: "😄" },
    { label: "Playful", emoji: "🌈" },
  ],
  Party: [
    { label: "EDM", emoji: "🎛️" },
    { label: "Hip Hop", emoji: "🎤" },
    { label: "Bhangra", emoji: "🥁" },
    { label: "Funk", emoji: "🎺" },
    { label: "Dance Pop", emoji: "💃" },
  ],
  Friendship: [
    { label: "Indie Pop", emoji: "🎸" },
    { label: "Acoustic", emoji: "🎵" },
    { label: "Folk", emoji: "🌿" },
    { label: "Pop", emoji: "🎉" },
    { label: "Hip Hop", emoji: "🎤" },
  ],
  Apology: [
    { label: "Acoustic", emoji: "🎸" },
    { label: "Soft Pop", emoji: "🎵" },
    { label: "Soul", emoji: "💫" },
    { label: "Classical", emoji: "🎻" },
    { label: "R&B", emoji: "🎷" },
  ],
  "Corporate Events": [
    { label: "Cinematic", emoji: "🎬" },
    { label: "Jazz", emoji: "🎷" },
    { label: "Pop", emoji: "🎵" },
    { label: "Motivational Rock", emoji: "🎸" },
    { label: "Ambient", emoji: "🌊" },
  ],
  Farewell: [
    { label: "Acoustic", emoji: "🎸" },
    { label: "Folk", emoji: "🌿" },
    { label: "Soft Pop", emoji: "🎵" },
    { label: "Soul", emoji: "💫" },
    { label: "Indie", emoji: "🎶" },
  ],
  Lullaby: [
    { label: "Soft Piano", emoji: "🎹" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Classical", emoji: "🎻" },
    { label: "Ambient", emoji: "🌊" },
    { label: "Folk", emoji: "🌿" },
  ],
  Siblings: [
    { label: "Indie Pop", emoji: "🎸" },
    { label: "Pop", emoji: "🎵" },
    { label: "Hip Hop", emoji: "🎤" },
    { label: "Acoustic", emoji: "🎶" },
    { label: "Folk", emoji: "🌿" },
  ],
  Congratulations: [
    { label: "Pop", emoji: "🎉" },
    { label: "Hip Hop", emoji: "🎤" },
    { label: "Cinematic", emoji: "🎬" },
    { label: "Upbeat Rock", emoji: "🎸" },
    { label: "Dance Pop", emoji: "💃" },
  ],
  "Thank You": [
    { label: "Acoustic", emoji: "🎸" },
    { label: "Soul", emoji: "💫" },
    { label: "Soft Pop", emoji: "🎵" },
    { label: "Jazz", emoji: "🎷" },
    { label: "Folk", emoji: "🌿" },
  ],
  Motivational: [
    { label: "Motivational Rock", emoji: "🎸" },
    { label: "Hip Hop", emoji: "🎤" },
    { label: "Cinematic", emoji: "🎬" },
    { label: "EDM", emoji: "🎛️" },
    { label: "Pop", emoji: "🎵" },
  ],
  "Devotional/Spiritual": [
    { label: "Bhajan", emoji: "🕉️" },
    { label: "Classical Indian", emoji: "🎻" },
    { label: "Carnatic", emoji: "🎵" },
    { label: "Qawwali", emoji: "🌙" },
    { label: "Folk", emoji: "🌿" },
  ],
  "Festive/Holiday": [
    { label: "Folk", emoji: "🌿" },
    { label: "Bhangra", emoji: "🥁" },
    { label: "Pop", emoji: "🎉" },
    { label: "Classical Indian", emoji: "🎻" },
    { label: "EDM", emoji: "🎛️" },
  ],
  Parents: [
    { label: "Classical", emoji: "🎻" },
    { label: "Soft Pop", emoji: "🎵" },
    { label: "Soul", emoji: "💫" },
    { label: "Acoustic", emoji: "🎸" },
    { label: "Folk", emoji: "🌿" },
  ],
  Family: [
    { label: "Acoustic", emoji: "🎸" },
    { label: "Folk", emoji: "🌿" },
    { label: "Pop", emoji: "🎵" },
    { label: "Soul", emoji: "💫" },
    { label: "Classical", emoji: "🎻" },
  ],
  Other: [
    { label: "Acoustic", emoji: "🎸" },
    { label: "Jazz", emoji: "🎷" },
    { label: "Classical", emoji: "🎻" },
    { label: "Folk", emoji: "🌿" },
    { label: "R&B", emoji: "🎷" },
  ],
};

/** Page size for persona template carousel + /api/persona-templates */
export const TEMPLATE_PAGE_SIZE = 12;
