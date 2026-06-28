/**
 * Occasion → related blog guides mapping.
 *
 * Single source of truth for the "Related Guides" section rendered on occasion
 * landing pages (see `RelatedGuides` + `OccasionPageTemplate`). Each entry links
 * an occasion slug to the blog posts that support it, forming an internal
 * topical cluster — the signal AI search engines and crawlers use to treat the
 * occasion page + its articles as authoritative on the topic.
 *
 * Keys MUST be occasion slugs from `@/lib/seo/occasions`. Values reference blog
 * posts that exist (published) at `/blog/<slug>`. Add entries here AFTER the
 * corresponding blogs are seeded, so we never render links to missing posts.
 */

export interface OccasionBlogLink {
  /** Blog post slug — must resolve to a published `/blog/<slug>` page. */
  slug: string;
  /** Display title for the link. Keep concise. */
  title: string;
}

export const OCCASION_BLOG_LINKS: Record<string, OccasionBlogLink[]> = {
  // Batch 1 — Wedding ceremonies
  weddings: [
    { slug: 'personalized-first-dance-wedding-song', title: 'A Personalized First Dance Song' },
    { slug: 'group-wedding-song-gift-from-friends', title: 'A Wedding Song Gift From Friends' },
    { slug: 'parents-wedding-song-gift-for-child', title: 'A Wedding Song From Parents to Their Child' },
  ],
  sangeet: [
    { slug: 'sangeet-performance-song-ideas-for-family', title: 'Family Sangeet Performance Song Ideas' },
    { slug: 'sibling-squad-sangeet-performance-song-guide', title: 'The Sibling Squad Sangeet Performance' },
    { slug: 'roast-sangeet-song-about-the-couple', title: 'How to Write a Roast Sangeet Song' },
  ],
  haldi: [
    { slug: 'haldi-ceremony-song-ideas-mood', title: 'Haldi Ceremony Song Ideas' },
    { slug: 'personalized-haldi-song-for-the-bride', title: 'A Haldi Song for the Bride' },
    { slug: 'personalized-haldi-song-for-the-groom', title: 'A Haldi Song for the Groom' },
  ],
  mehndi: [
    { slug: 'mehndi-ceremony-song-ideas-vibe', title: 'Mehndi Ceremony Song Ideas' },
    { slug: 'mehndi-song-from-brides-bridesmaids-friends', title: "A Mehndi Song From the Bride's Girls" },
    { slug: 'perfect-mehndi-playlist-custom-bride-song', title: 'The Perfect Mehndi Playlist' },
  ],
  'ring-ceremony': [
    { slug: 'ring-ceremony-personalized-song-ideas', title: 'Ring Ceremony Song Ideas' },
    { slug: 'surprise-proposal-song-pop-the-question', title: 'A Surprise Proposal Song' },
    { slug: 'ring-ceremony-song-gift-from-family', title: 'A Ring Ceremony Song From Family' },
  ],

  // Batch 2 — Love & milestones
  anniversary: [
    { slug: 'first-wedding-anniversary-personalized-song', title: 'A First Wedding Anniversary Song' },
    { slug: '25th-silver-anniversary-personalized-song-gift', title: 'A 25th Silver Anniversary Song' },
    { slug: 'surprise-anniversary-song-for-spouse', title: 'How to Surprise Your Spouse With a Song' },
  ],
  romantic: [
    { slug: 'just-because-romantic-love-song-surprise', title: 'A Just Because Love Song' },
    { slug: 'long-distance-romantic-love-song-keepsake', title: 'A Long Distance Love Song' },
    { slug: 'romantic-love-song-date-night-surprise', title: 'A Love Song for Date Night at Home' },
  ],

  // Batch 3 — Family
  parents: [
    { slug: 'personalized-song-gift-for-parents-wedding-anniversary', title: "A Song for Your Parents' Anniversary" },
    { slug: 'thank-you-song-from-children-to-aging-parents', title: 'A Thank You Song for Aging Parents' },
    { slug: 'surprise-retirement-song-for-parents-family-gathering', title: 'A Surprise Retirement Song for a Parent' },
  ],
  siblings: [
    { slug: 'raksha-bandhan-personalized-song-for-sibling', title: 'A Raksha Bandhan Song for Your Sibling' },
    { slug: 'funny-roast-birthday-song-for-brother-or-sister', title: 'A Funny Roast Birthday Song for a Sibling' },
    { slug: 'emotional-song-for-sibling-getting-married-or-moving-away', title: 'A Song for a Sibling Moving Away' },
  ],
  lullaby: [
    { slug: 'personalized-lullaby-with-babys-name-for-newborn', title: "A Personalized Lullaby With Your Baby's Name" },
    { slug: 'custom-lullaby-baby-shower-naming-ceremony-gift', title: 'A Custom Lullaby Baby Shower Gift' },
    { slug: 'soothing-bedtime-song-help-toddler-sleep', title: 'A Soothing Bedtime Song for Toddlers' },
  ],

  // Batch 4 — Social & celebration
  party: [
    { slug: 'personalised-song-surprise-highlight-house-party', title: 'A Surprise Song for Your House Party' },
    { slug: 'custom-hype-anthem-milestone-celebration-party', title: 'A Custom Hype Anthem for a Milestone' },
    { slug: 'group-song-gift-party-friends-colleagues', title: 'A Group Song Gift From Friends' },
  ],
  friendship: [
    { slug: 'friendship-day-personalized-song-best-friend', title: 'A Friendship Day Song for Your Best Friend' },
    { slug: 'long-distance-friendship-song-friend-moving-away', title: 'A Song for a Friend Moving Away' },
    { slug: 'funny-inside-jokes-squad-anthem-friend-group-song', title: 'A Funny Squad Anthem for Your Group' },
  ],
  congratulations: [
    { slug: 'congratulations-song-new-job-promotion', title: 'A Song for a New Job or Promotion' },
    { slug: 'congratulations-song-graduation-exam-success', title: 'A Song for Graduation or Exam Success' },
    { slug: 'congratulations-song-new-baby-new-home', title: 'A Song for a New Baby or New Home' },
  ],
  'thank-you': [
    { slug: 'thank-you-song-for-teacher-mentor', title: 'A Thank You Song for a Teacher or Mentor' },
    { slug: 'thank-you-song-for-caregiver-difficult-time', title: 'A Thank You Song for a Caregiver' },
    { slug: 'thank-you-song-for-doctor-nurse-family', title: 'A Thank You Song for a Doctor or Nurse' },
  ],

  // Batch 5 — Emotional moments
  apology: [
    { slug: 'sorry-song-apology-to-partner-after-fight', title: 'An Apology Song for Your Partner' },
    { slug: 'apology-song-to-best-friend-after-falling-out', title: 'An Apology Song for a Best Friend' },
    { slug: 'heartfelt-apology-song-to-parents-saying-sorry', title: 'An Apology Song for Your Parents' },
  ],
  farewell: [
    { slug: 'farewell-song-for-colleague-leaving-office', title: 'A Farewell Song for a Colleague' },
    { slug: 'retirement-farewell-song-send-off-tribute', title: 'A Retirement Farewell Song' },
    { slug: 'farewell-song-for-friend-moving-abroad-send-off', title: 'A Farewell Song for a Friend Moving Abroad' },
  ],
  motivational: [
    { slug: 'motivational-song-for-students-before-exams', title: 'A Motivational Song for Students Before Exams' },
    { slug: 'motivational-song-new-business-venture-launch', title: 'A Motivational Song for a New Business' },
    { slug: 'motivational-song-comeback-tough-time-encouragement', title: 'A Motivational Song for a Comeback' },
  ],

  // Batch 6 — Work & festive
  'corporate-events': [
    { slug: 'custom-anthem-company-annual-day-town-hall', title: 'A Custom Anthem for Your Company Annual Day' },
    { slug: 'employee-recognition-song-years-of-service-award', title: 'An Employee Recognition Song' },
    { slug: 'song-celebrate-product-launch-company-milestone', title: 'A Song for a Product Launch or Milestone' },
  ],
  'festive-holiday': [
    { slug: 'personalised-diwali-song-for-family-festive-gift', title: 'A Personalised Diwali Song for Your Family' },
    { slug: 'personalised-new-year-song-welcome-celebration', title: 'A Personalised New Year Song' },
    { slug: 'festive-season-song-for-loved-ones-far-from-home', title: 'A Festive Song for Loved Ones Far From Home' },
  ],

  // Phase 3 — Existing clusters (wired from already-published blogs)
  'devotional-spiritual': [
    { slug: 'personalized-bhajan-for-home-pooja', title: 'A Personalized Bhajan for Your Home Pooja' },
    { slug: 'custom-ganesh-bhajan-for-ganesh-chaturthi', title: 'A Custom Ganesh Bhajan for Ganesh Chaturthi' },
    { slug: 'personalized-krishna-bhajan-for-janmashtami', title: 'A Krishna Bhajan for Janmashtami' },
  ],
  birthday: [
    { slug: 'birthday-song-ideas-custom-hindi-indian-languages', title: 'Birthday Song Ideas in Hindi & Indian Languages' },
    { slug: 'personalized-birthday-song-for-best-friend', title: 'A Birthday Song for Your Best Friend' },
    { slug: 'surprise-birthday-party-personalized-song', title: 'A Surprise Birthday Reveal Song' },
  ],
  'adult-birthday': [
    { slug: 'personalized-18th-birthday-song', title: 'An 18th Birthday Milestone Song' },
    { slug: '30th-birthday-celebration-ideas-milestone', title: 'Turning 30: Celebration Ideas' },
    { slug: '50th-birthday-celebration-ideas-milestone', title: 'Celebrating Your 50th Birthday' },
  ],
  kids: [
    { slug: 'custom-birthday-song-for-kids', title: 'A Custom Birthday Song for Kids' },
    { slug: 'first-birthday-song-for-baby', title: "A First Birthday Song for Baby" },
    { slug: 'superhero-birthday-song-for-kids', title: 'A Superhero Birthday Song for Kids' },
  ],
  'mothers-day': [
    { slug: 'why-custom-song-beats-flowers-for-mothers-day', title: 'Why a Custom Song Beats Flowers' },
    { slug: 'mothers-day-gift-ideas-2026', title: "Mother's Day Gift Ideas 2026" },
    { slug: 'mothers-day-song-in-hindi-for-maa', title: "A Mother's Day Song in Hindi for Maa" },
  ],
  'fathers-day': [
    { slug: 'why-custom-song-beats-gadget-for-fathers-day', title: 'Why a Custom Song Beats a Gadget' },
    { slug: 'first-fathers-day-gift-personalized-song', title: "A First Father's Day Song" },
    { slug: 'fathers-day-gift-dad-who-has-everything', title: 'A Gift for the Dad Who Has Everything' },
  ],
};

/** Returns the related blog guides for an occasion (empty array if none). */
export function getOccasionBlogLinks(occasionSlug: string): OccasionBlogLink[] {
  return OCCASION_BLOG_LINKS[occasionSlug] ?? [];
}

/**
 * Human-readable titles for occasion slugs, used when linking a blog post BACK
 * to its occasion landing page (e.g. "Explore all Wedding Songs →"). Covers
 * every slug in `@/lib/seo/occasions` so newly seeded blog clusters light up
 * automatically — no second edit needed when a Batch 5/6 cluster is populated.
 */
export const OCCASION_LABELS: Record<string, string> = {
  'mothers-day': "Mother's Day Songs",
  'fathers-day': "Father's Day Songs",
  birthday: 'Birthday Songs',
  'adult-birthday': 'Adult Birthday Songs',
  anniversary: 'Anniversary Songs',
  weddings: 'Wedding Songs',
  sangeet: 'Sangeet Songs',
  haldi: 'Haldi Ceremony Songs',
  mehndi: 'Mehndi Songs',
  'ring-ceremony': 'Ring Ceremony Songs',
  romantic: 'Romantic Songs',
  party: 'Party Songs',
  kids: 'Kids Songs',
  lullaby: 'Lullabies',
  friendship: 'Friendship Songs',
  siblings: 'Sibling Songs',
  parents: 'Songs for Parents',
  apology: 'Apology Songs',
  congratulations: 'Congratulations Songs',
  'thank-you': 'Thank You Songs',
  farewell: 'Farewell Songs',
  'corporate-events': 'Corporate Event Songs',
  motivational: 'Motivational Songs',
  'devotional-spiritual': 'Devotional Songs',
  'festive-holiday': 'Festive & Holiday Songs',
};

/**
 * A blog post's place in its topical cluster: the occasion it belongs to and
 * its sibling guides (the other blogs under the same occasion).
 */
export interface BlogCluster {
  /** Occasion slug → `/occasions/<occasionSlug>`. */
  occasionSlug: string;
  /** Display title for the occasion back-link, e.g. "Wedding Songs". */
  occasionTitle: string;
  /** Sibling blog guides under the same occasion (excludes the current post). */
  siblings: OccasionBlogLink[];
}

/**
 * Reverse index: blog slug → its cluster. Derived from `OCCASION_BLOG_LINKS` at
 * module load so the blog→occasion direction can never drift from the
 * occasion→blog direction — there is only one map to maintain. If a blog slug
 * ever appears under multiple occasions, the first wins (data is 1:1 today).
 */
const BLOG_CLUSTER_INDEX: Record<string, BlogCluster> = (() => {
  const index: Record<string, BlogCluster> = {};
  for (const [occasionSlug, links] of Object.entries(OCCASION_BLOG_LINKS)) {
    for (const link of links) {
      if (index[link.slug]) continue; // first occasion wins
      index[link.slug] = {
        occasionSlug,
        occasionTitle: OCCASION_LABELS[occasionSlug] ?? occasionSlug,
        siblings: links.filter((l) => l.slug !== link.slug),
      };
    }
  }
  return index;
})();

/** Returns the cluster a blog post belongs to, or null if it isn't wired. */
export function getBlogCluster(blogSlug: string): BlogCluster | null {
  return BLOG_CLUSTER_INDEX[blogSlug] ?? null;
}
