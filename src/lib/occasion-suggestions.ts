import { shuffle } from "lodash";

export type OccasionOption = {
  id: string;
  label: string;
  suggestions: string[];
};

export const OTHER_OCCASION_ID = "other";
export const OTHER_OCCASION_LABEL = "Other";

export const OCCASION_OPTIONS: OccasionOption[] = [
  {
    id: "fathers-day",
    label: "Father's Day",
    suggestions: [
      "A song of love and appreciation for a father on Father's Day. Thanking him for his endless support, sacrifices, and for being the rock of the family.",
      "A tribute to a father on Father's Day, celebrating his strength, wisdom, and for being a hero in his child's eyes.",
      "A heartfelt song for my dad on Father's Day. Mention his love for morning chai, his terrible jokes, and how he always shows up when it matters.",
      "A warm song from a new parent to their own father, expressing a newfound appreciation and understanding of all he did.",
      "A song to simply say 'I love you, Papa', for no special occasion, just to let him know how much he means to you.",
    ],
  },
  {
    id: "birthday",
    label: "Kids Birthday",
    suggestions: [
      "Create a fun, joyful song for my 5-year-old kid. He loves to play basketball and go cycling. His mummy, papa, and grandparents love him a lot.",
      "A magical birthday song for my daughter turning 3. She loves unicorns, dancing, and her teddy bear. Make it playful and full of wonder.",
      "A cool, trendy birthday song for my teenage son who is into gaming and rock music. He's a bit shy but has a heart of gold. His friends call him 'The Legend'.",
      "An upbeat birthday song for my nephew's 7th birthday. He loves superheroes and wants to be an astronaut. Include his favorite things.",
      "A sweet and silly birthday song for my little one's first birthday. Celebrate the joy they've brought to our family in their first year.",
    ],
  },
  {
    id: "adult-birthday",
    label: "Adult Birthday",
    suggestions: [
      "A heartfelt birthday song for my grandmother who is turning 80. She loves gardening and telling stories about her childhood. Let's celebrate her legacy.",
      "An upbeat and energetic birthday song for my best friend, Sarah. We've been friends since kindergarten and have shared countless adventures. Mention our trip to the mountains.",
      "A funny birthday song for my husband who is terrible at cooking but thinks he's a master chef. He loves our dog, Bruno, more than anything. Let's make him laugh.",
      "A warm and nostalgic birthday song for my father's 60th. He's always been our rock — mention his love for morning chai and storytelling.",
      "A celebratory birthday song for my sister who's turning 30. She's starting her own business and we're so proud. Make it empowering and fun.",
    ],
  },
  {
    id: "anniversary",
    label: "Anniversary",
    suggestions: [
      "A romantic and nostalgic song for our 10th wedding anniversary. We've built a beautiful life together with our two kids. Mention our first date at the coffee shop.",
      "A song to celebrate my parents' 50th anniversary. Their love has been a shining example for our entire family. Let's talk about their journey, the ups and downs, and their unwavering bond.",
      "An upbeat and fun song for our first anniversary. It's been a year of laughter, learning, and love. Mention our disastrous but hilarious attempt at baking our wedding cake.",
      "A soulful and deep song for a 25th anniversary. The couple has faced many challenges but their love has only grown stronger. It's a testament to their commitment and partnership.",
      "A tender song for a couple celebrating their anniversary after a period of being apart. It's about finding their way back to each other and their love being stronger than ever.",
    ],
  },
  {
    id: "friendship",
    label: "Friendship",
    suggestions: [
      "A song celebrating a lifelong friendship. Through thick and thin, laughter and tears. Mention a specific memory that sealed your bond.",
      "An upbeat and fun song about a group of friends who are more like family. The inside jokes, the crazy adventures, and the unconditional support.",
      "A heartfelt song for a friend who is moving away. It's not a goodbye, but a 'see you later'. A tribute to the memories you've shared and the bond that will remain.",
      "A song of appreciation for a friend who was there for you during a tough time. A thank you for their kindness, support, and for being your rock.",
      "A funny song about the quirky and lovable habits of your best friend. A lighthearted celebration of what makes them unique and so special to you.",
    ],
  },
  {
    id: "weddings",
    label: "Weddings",
    suggestions: [
      "Create a romantic song for the couple named Akash and Nayna. They met in college and have been together for the last 7 years. They have lived in a long-distance relationship but have loved each other to the moon and back.",
      "A beautiful, emotional song for my daughter's wedding. I want to express my love and pride for the amazing woman she has become. Mention how she used to dance in the rain as a little girl.",
      "A fun, celebratory song for my brother's wedding. The couple loves to travel and have visited over 20 countries together. Let's include some of their favorite destinations.",
      "A classic, elegant wedding song for a couple who are high school sweethearts. They have a timeless love story that has inspired everyone around them.",
      "A lighthearted and sweet song for a wedding, from the perspective of the couple's pet dog who is happy to see his humans get married.",
    ],
  },
  {
    id: "romantic",
    label: "Romantic",
    suggestions: [
      "A passionate and heartfelt love song for my partner. I want to tell them how they make my world a better place just by being in it. Mention their beautiful eyes and contagious laugh.",
      "A sweet and simple song about the little things I love about my girlfriend. The way she sips her tea, her love for old movies, and how she hums when she's happy.",
      "A song about a long-distance relationship, the longing, the late-night calls, and the sweet anticipation of being reunited. It's a story of love that knows no distance.",
      "A playful and flirty song for a new relationship. It's about the excitement, the butterflies, and the joy of getting to know someone special.",
      "A deep and meaningful song about a mature love. It's not just about passion, but about companionship, respect, and growing old together.",
    ],
  },
  {
    id: "kids",
    label: "Kids",
    suggestions: [
      "A fun and educational song for a toddler about different animals and the sounds they make. Make it catchy and easy to sing along to.",
      "A gentle and soothing lullaby for a newborn baby. The lyrics should be filled with love, warmth, and sweet dreams.",
      "An adventurous song for a child who loves pirates and treasure hunts. Let's go on a musical journey to a deserted island and find hidden treasures.",
      "A song about the importance of sharing and being kind to friends, for a preschooler. Use simple words and a memorable tune.",
      "A silly and imaginative song about a magical treehouse where anything is possible. Flying carpets, talking animals, and rivers of chocolate.",
    ],
  },
  {
    id: "party",
    label: "Party",
    suggestions: [
      "An energetic and upbeat party anthem for a friend's promotion. Let's celebrate their hard work and success with a song that makes everyone want to dance.",
      "A fun and catchy song for a summer beach party. Good vibes, sunshine, and great friends. Let's capture that feeling in a song.",
      "A song for a surprise party. The lyrics should build up the surprise and then explode into a chorus of celebration when the person arrives.",
      "A graduation party song that is both celebratory and a little nostalgic. It's about closing one chapter and looking forward to the next, with friends by your side.",
      "A cool and groovy song for a housewarming party. It's about creating new memories in a new home, filled with laughter, music, and friends.",
    ],
  },
  {
    id: "apology",
    label: "Apology",
    suggestions: [
      "A sincere and heartfelt apology song. I messed up, and I want to say I'm sorry. The lyrics should express regret and a desire to make things right.",
      "A song to apologize to a friend for a misunderstanding. It's about clearing the air, valuing the friendship, and hoping for forgiveness.",
      "A gentle and loving song to say sorry to a partner after an argument. It's about acknowledging the hurt and reaffirming your love.",
      "An apology song from a parent to a child for losing their temper. It's about being human, making mistakes, and the unconditional love of a parent.",
      "A song that says 'I'm sorry for being distant'. It's about recognizing you haven't been there for someone and wanting to reconnect and be a better friend/partner.",
    ],
  },
  {
    id: "corporate-events",
    label: "Corporate Events",
    suggestions: [
      "A motivational and inspiring anthem for a company's annual kick-off event. It's about teamwork, innovation, and reaching new heights together.",
      "A song to celebrate a major company milestone, like an anniversary or a big achievement. A tribute to the hard work and dedication of the employees.",
      "An upbeat and energetic song for a product launch. It should be exciting, futuristic, and create a buzz around the new product.",
      "A song of appreciation for employees at a company awards night. Recognizing their contributions and celebrating their success.",
      "A fun and lighthearted song for a company off-site or team-building event. It's about bonding, having fun, and creating a positive team spirit.",
    ],
  },
  {
    id: "farewell",
    label: "Farewell",
    suggestions: [
      "A heartfelt farewell song for a colleague who is retiring. A tribute to their years of service, their mentorship, and the legacy they leave behind.",
      "A song for a friend who is moving to a new country to start a new chapter. It's a mix of sadness to see them go and happiness for their new adventure.",
      "An upbeat and optimistic farewell song for a team member who is leaving for a new job. Wishing them all the best for their future and celebrating the time you worked together.",
      "A nostalgic and emotional song for a graduation, saying goodbye to a chapter of life and the people who made it special.",
      "A gentle and loving song to say goodbye to a beloved pet. A tribute to the joy, love, and companionship they brought into your life.",
    ],
  },
  {
    id: "lullaby",
    label: "Lullaby",
    suggestions: [
      "A gentle and soothing lullaby for a baby, with imagery of stars, the moon, and sweet dreams. The melody should be simple and calming.",
      "A lullaby from a grandparent to a grandchild, filled with love, wisdom, and blessings for a peaceful sleep and a happy life.",
      "A magical lullaby about a secret garden where dreams grow. It takes the child on a gentle journey into a world of imagination.",
      "A lullaby that incorporates the child's name, making it personal and special. A song just for them, to make them feel loved and safe.",
      "A lullaby with a simple, repetitive chorus that is easy for a parent to hum and for a baby to be soothed by.",
    ],
  },
  {
    id: "siblings",
    label: "Siblings",
    suggestions: [
      "A fun and upbeat song about the love-hate relationship between siblings. The teasing, the fighting, but at the end of the day, the unbreakable bond.",
      "A heartfelt song from an older sibling to a younger one, full of advice, love, and the promise to always be there for them.",
      "A nostalgic song about childhood memories with a sibling. The secret forts, the summer adventures, and the shared dreams.",
      "A song to celebrate a sibling's achievement, like a graduation or a new job. A song of pride, love, and support.",
      "A funny song about the inside jokes and silly memories that only siblings share. A lighthearted tribute to your unique connection.",
    ],
  },
  {
    id: "congratulations",
    label: "Congratulations",
    suggestions: [
      "An upbeat and celebratory song for a friend who just graduated. Let's cheer for their hard work and the bright future ahead.",
      "A song of congratulations for a couple who just got engaged. A celebration of their love and the exciting journey they are about to begin.",
      "A proud and heartfelt song for someone who has achieved a lifelong dream, like running a marathon or publishing a book.",
      "A song to congratulate new parents on the arrival of their baby. A celebration of new life, new love, and the joy of family.",
      "An energetic and exciting song for someone who got a new job or a promotion. A tribute to their talent and dedication.",
    ],
  },
  {
    id: "thank-you",
    label: "Thank You",
    suggestions: [
      "A heartfelt song of gratitude for a teacher who has been a mentor and an inspiration. Thanking them for their guidance and for believing in you.",
      "A song to thank parents for their unconditional love, support, and sacrifices. A tribute to everything they've done.",
      "A simple and sincere thank you song for a friend who was there for you when you needed them most. A token of appreciation for their kindness.",
      "A song of thanks for a community or a group of people who came together to support a cause or a person in need.",
      "A thank you song to a partner, for the everyday things, the big gestures, and for making life a beautiful journey together.",
    ],
  },
  {
    id: "motivational",
    label: "Motivational",
    suggestions: [
      "An inspiring and powerful anthem about overcoming challenges and never giving up on your dreams. A song to listen to when you need a boost of confidence.",
      "A song about embracing your uniqueness and shining bright. A reminder that you are amazing just the way you are.",
      "An upbeat and energetic song to start the day with a positive attitude. A musical cup of coffee to get you going.",
      "A song about the power of perseverance and hard work. It's about the journey, not just the destination.",
      "A calming and hopeful song for someone going through a tough time. A reminder that there is light at the end of the tunnel and they are not alone.",
    ],
  },
  {
    id: "devotional-spiritual",
    label: "Devotional/Spiritual",
    suggestions: [
      "A serene and soulful bhajan/hymn expressing devotion and gratitude. The lyrics should be simple, heartfelt, and connect with the divine.",
      "A song of prayer, asking for guidance, strength, and peace. A musical conversation with a higher power.",
      "An uplifting and joyful spiritual song that celebrates faith and the beauty of creation. A song to lift the spirits and fill the heart with positivity.",
      "A meditative and calming chant-like song, with repetitive phrases that help to focus the mind and find inner peace.",
      "A song that tells a story from a spiritual text or about a spiritual leader, conveying a message of love, compassion, and wisdom.",
    ],
  },
  {
    id: "festive-holiday",
    label: "Festive/Holiday",
    suggestions: [
      "A joyful and festive song for Christmas, full of cheer, family gatherings, and the magic of the season.",
      "A vibrant and energetic song for Diwali, the festival of lights. It's about the victory of good over evil, and the celebration of light and happiness.",
      "A fun and spooky song for Halloween, with a catchy tune and playful lyrics about ghosts, goblins, and trick-or-treating.",
      "A song of hope and new beginnings for New Year's Eve. It's about reflecting on the past year and looking forward to the future with optimism.",
      "A colorful and lively song for Holi, the festival of colors. It's about friendship, fun, and the joy of being together.",
    ],
  },
  {
    id: "parents",
    label: "Parents",
    suggestions: [
      "A song of gratitude and love for a mother on Mother's Day. Thanking her for her endless love, care, and for being the heart of the family.",
      "A tribute to a father on Father's Day, celebrating his strength, wisdom, and for being a hero in his child's eyes.",
      "A song for parents' anniversary, celebrating their love story and the beautiful family they have built together.",
      "A heartfelt song from a new parent to their own parents, expressing a newfound appreciation and understanding of all they did.",
      "A song to simply say 'I love you' to parents, for no special occasion, just to let them know how much they mean to you.",
    ],
  },
  {
    id: "family",
    label: "Family",
    suggestions: [
      "A song about the importance of family, the bond that holds you together, and the comfort of knowing you always have a place to call home.",
      "A fun and upbeat song for a family reunion, celebrating the joy of being together, sharing stories, and creating new memories.",
      "A nostalgic song about family traditions, the little things that make your family unique and special.",
      "A song of love and support for a family member who is going through a difficult time, letting them know they are not alone.",
      "A tribute to grandparents, the pillars of the family, and the stories and wisdom they share.",
    ],
  },
  {
    id: "mothers-day",
    label: "Mother's Day",
    suggestions: [
      "A song of love and appreciation for a mother on Mother's Day. Thanking her for her endless love, care, and for being the heart of the family.",
      "A tribute to a mother on Mother's Day, celebrating her strength, wisdom, and for being a hero in her child's eyes.",
      "A song for parents' anniversary, celebrating their love story and the beautiful family they have built together.",
      "A heartfelt song from a new parent to their own parents, expressing a newfound appreciation and understanding of all they did.",
      "A song to simply say 'I love you' to parents, for no special occasion, just to let them know how much they mean to you.",
    ],
  },
];

const occasionById = new Map(OCCASION_OPTIONS.map((option) => [option.id, option]));
const occasionByLabel = new Map(
  OCCASION_OPTIONS.map((option) => [option.label, option]),
);

/** Display labels for occasion pickers (includes "Other"). */
export const ALL_OCCASION_LABELS = [
  ...OCCASION_OPTIONS.map((option) => option.label),
  OTHER_OCCASION_LABEL,
];

export function getOccasionById(id: string): OccasionOption | undefined {
  return occasionById.get(id);
}

export function getOccasionByLabel(label: string): OccasionOption | undefined {
  return occasionByLabel.get(label);
}

export function getOccasionLabelById(id: string): string | null {
  return occasionById.get(id)?.label ?? null;
}

export function getOccasionIdByLabel(label: string): string | null {
  return occasionByLabel.get(label)?.id ?? null;
}

/**
 * Resolve an occasion id or legacy label to a display label.
 * Custom "Other" text is returned as-is.
 */
export function resolveOccasionLabel(input: string | null | undefined): string {
  const value = (input ?? "").trim();
  if (!value) return "";
  return getOccasionLabelById(value) ?? getOccasionByLabel(value)?.label ?? value;
}

/**
 * Resolve an occasion id, label, or legacy alias to a canonical id.
 * Returns null for unknown/custom occasions.
 */
export function resolveOccasionId(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value || value === OTHER_OCCASION_LABEL) return null;
  if (occasionById.has(value)) return value;
  if (value === "Birthday") return "adult-birthday";
  return getOccasionIdByLabel(value);
}

export const getOccasionSuggestions = (occasionId: string | null): string[] => {
  if (!occasionId || !occasionById.has(occasionId)) {
    const allSuggestions = OCCASION_OPTIONS.flatMap((option) => option.suggestions);
    return shuffle(allSuggestions).slice(0, 3);
  }

  const suggestionsForOccasion = occasionById.get(occasionId)!.suggestions;
  return shuffle(suggestionsForOccasion).slice(0, 3);
};
