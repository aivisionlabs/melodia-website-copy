/**
 * Seed: Work & festive cluster blog posts (Batch 6) — corporate-events, festive-holiday.
 * 3 posts per occasion (6 total), English.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-work-festive-cluster-blogs.ts dotenv_config_path=.env.local
 *
 * Idempotent: skips any slug that already exists.
 *
 * Note: `content` is raw HTML. The `decode()` helper (mirrored from the
 * emotional-cluster seed) converts the limited set of HTML entities to raw
 * markup before inserting; on raw HTML it is a safe no-op, so the blog pages
 * render real markup either way.
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { blogPostsTable } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

interface BlogPost {
  title: string;
  slug: string;
  meta_description: string;
  content: string;
  category: string;
}

/** Decode the limited set of HTML entities present in seeded content. */
function decode(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

const posts: BlogPost[] = [
  // ===================== CORPORATE EVENTS =====================
  {
    title: 'A Custom Anthem for Your Company Annual Day: Make the Town Hall Unforgettable',
    slug: 'custom-anthem-company-annual-day-town-hall',
    meta_description:
      'Planning a company annual day or town hall? A personalised anthem from Melodia rallies the whole team, in Hindi, Tamil and more, starting at just 199.',
    category: 'corporate-events',
    content: `
<p>The company annual day comes around once a year, and most teams treat it the same way every time. There are the usual speeches, a slideshow of numbers, an awards segment, and a buffet. People clap politely and check their phones. Yet this is the one occasion built to make an entire organisation feel like one team, and it deserves a centrepiece that actually moves the room. A personalised company anthem does exactly that.</p>
<p>Instead of another forgettable presentation, imagine the lights dimming and a song playing that names your company, your journey, and the people who built it. That is the kind of moment that turns a routine event into something employees talk about for months.</p>
<h2>Why a Company Anthem Works at a Town Hall</h2>
<p>A town hall or annual day is one of the rare times the whole organisation is gathered with a shared sense of pride. A custom anthem captures that feeling and gives it a voice. It celebrates how far the company has come, honours the teams that made it happen, and points everyone towards the year ahead. Music does in three minutes what a long speech cannot. It makes people feel part of something bigger than their own desk.</p>
<h2>What to Build Into a Company Anthem</h2>
<p>The strongest corporate anthems are specific to your organisation, not generic motivational filler. Before you create one, gather the details that define your company. Worth including:</p>
<ul>
  <li>The company name and the year or milestone you are marking.</li>
  <li>The journey so far, from the early scrappy days to today.</li>
  <li>The values and the culture that make your team different.</li>
  <li>A rallying line about the goals and vision for the year ahead.</li>
</ul>
<p>When the chorus names your company and the milestone you are celebrating, the whole room recognises itself in the song, and the pride in the air is impossible to miss.</p>
<h2>Match the Anthem to Your Workforce</h2>
<p>Indian companies are wonderfully diverse, with teams that speak many languages across many cities. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Kannada, Marathi, and Bengali, so your anthem can reflect the real voice of your workforce. You can keep it high energy and celebratory, or warm and reflective, depending on the tone of your event.</p>
<h2>A Centrepiece You Can Reuse All Year</h2>
<p>A company anthem is not a one time gimmick. Once you have it, you can play it at the start of town halls, use it in internal videos, share it on the team channel, or open future events with it. It becomes a small piece of your culture that the whole organisation recognises. Few investments in employee morale keep paying off the way a well made anthem does.</p>
<h2>Simple to Arrange, Easy on the Budget</h2>
<p>You do not need a marketing agency or a music studio to pull this off. With Melodia you share the company story, choose the language and the mood, and receive a finished anthem crafted around your organisation. Personalised songs start at just ₹199, which for a company event is a remarkably small price for a moment the whole team will remember.</p>
<p>If you want your next annual day or town hall to land differently this year, give your people more than another slideshow. <a href="/pricing">Create a custom company anthem with Melodia</a> and turn your event into a moment that unites the entire team.</p>
`.trim(),
  },
  {
    title: 'An Employee Recognition Song: Honour Years of Service the Right Way',
    slug: 'employee-recognition-song-years-of-service-award',
    meta_description:
      'Recognising a long serving employee? A personalised song from Melodia honours their years of service beautifully, in Hindi, Tamil and more, from 199.',
    category: 'corporate-events',
    content: `
<p>When an employee has given a company ten, fifteen, or twenty years, the standard recognition feels thin. A plaque, a certificate, and a gift card are kind gestures, but they rarely match the loyalty and effort the person poured in over so long. More companies are realising that real recognition needs to feel personal. A custom song made to honour an employee's journey does precisely that, and it lands far harder than anything from the rewards catalogue.</p>
<h2>Why Recognition Needs to Feel Personal</h2>
<p>People do not stay loyal to a company for a gift voucher. They stay because they feel valued. The trouble is that most recognition programs are generic, the same template handed to everyone. A personalised song breaks that mould completely. It names the individual, traces their actual contribution, and tells them in front of their peers that their years mattered. That feeling of being truly seen is what employees remember long after the event is over.</p>
<h2>What to Capture in a Recognition Song</h2>
<p>The best recognition songs are built from real history, not corporate buzzwords. Before you create one, gather the story of this person's time with the company. Consider including:</p>
<ul>
  <li>The number of years they served and the role they grew into.</li>
  <li>A signature project or achievement that defined their contribution.</li>
  <li>The way they mentored others or shaped the team culture.</li>
  <li>A warm, sincere thank you for their loyalty and effort.</li>
</ul>
<p>When the lyrics name a real milestone the employee delivered, the recognition stops feeling like a formality and becomes a genuine tribute.</p>
<h2>Honour Them in Their Own Language</h2>
<p>A tribute in someone's own language carries an extra layer of warmth and respect. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Marathi, Gujarati, and Bengali. For a long serving employee, hearing their years honoured in their mother tongue feels deeply personal, and it lets their family share in the pride too.</p>
<h2>A Keepsake That Outlasts Any Plaque</h2>
<p>A plaque ends up on a shelf, but a song travels with the person. They can play it at home, share it with their family, and return to it whenever they want to remember the chapter of their life they gave to the company. It becomes a lasting symbol of appreciation, and a quiet reminder to the rest of the team that loyalty here is truly valued.</p>
<h2>Easy to Create, Deeply Appreciated</h2>
<p>You do not need anyone musical on the team to do this. With Melodia you share the employee's story, choose the language and the mood, and receive a finished tribute song. Personalised songs start at just ₹199, which makes meaningful recognition affordable even for a small business that wants to thank its people properly.</p>
<p>When an employee has given your company their best years, give them recognition that matches. <a href="/pricing">Create an employee recognition song with Melodia</a> and honour their service in a way they will never forget.</p>
`.trim(),
  },
  {
    title: 'A Song to Celebrate a Product Launch or Company Milestone',
    slug: 'song-celebrate-product-launch-company-milestone',
    meta_description:
      'Launching a product or hitting a big milestone? A personalised celebration song from Melodia marks the moment, in Hindi, Tamil and more, starting at 199.',
    category: 'corporate-events',
    content: `
<p>Big company moments deserve to be marked. A product going live after months of work, a funding round closing, a first crore in revenue, a tenth anniversary, or breaking into a new market are the milestones that define an organisation's story. Too often these moments pass with a quick email and maybe a cake in the pantry. A personalised celebration song gives a major milestone the fanfare it deserves and bottles the team's pride in a way they can replay forever.</p>
<h2>Why Milestones Deserve More Than an Email</h2>
<p>Reaching a milestone is the payoff for countless late nights, hard decisions, and small acts of effort across the whole team. When that moment slides by with barely a mention, people quietly feel their work went unnoticed. A celebration song does the opposite. It stops the clock, gathers everyone, and says out loud that this achievement mattered and that the people behind it are seen. That recognition fuels the energy for the next big push.</p>
<h2>What to Put Into a Milestone Song</h2>
<p>The most rousing celebration songs are rooted in the specific journey to the milestone. Before you create one, think about the road your team travelled. Worth including:</p>
<ul>
  <li>The milestone itself, whether a launch, an anniversary, or a record number.</li>
  <li>The challenges the team overcame to get there.</li>
  <li>The people and the teams who made it happen.</li>
  <li>An energising line about the next chapter ahead.</li>
</ul>
<p>When the song names your actual product or the exact milestone you hit, the whole team feels the win, and the celebration becomes something far more memorable than a round of applause.</p>
<h2>Set the Tone With the Right Language and Mood</h2>
<p>Every company has its own personality, and your celebration song can match it. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Punjabi, Marathi, and Kannada. You can make it a high energy anthem to blast at the launch party, or a warmer, prouder track for a reflective milestone. The mood is entirely yours to set.</p>
<h2>Content You Can Share Beyond the Office</h2>
<p>A milestone song is not just for the internal celebration. It makes wonderful content for a launch video, a social media post, or a message to investors and partners. It shows the world that your company celebrates its wins with heart and creativity, which says a lot about the culture behind the product. One song can serve the team party and the public announcement at once.</p>
<h2>Quick to Create, Big on Impact</h2>
<p>You do not need a production budget to mark your moment this way. With Melodia you share the story of the milestone, choose the language and the mood, and receive a finished celebration song. Personalised songs start at just ₹199, a tiny price for a celebration that honours months or years of hard work.</p>
<p>When your company reaches a moment worth remembering, do not let it pass with a quiet email. <a href="/pricing">Create a celebration song with Melodia</a> and give your milestone the fanfare your team has earned.</p>
`.trim(),
  },

  // ===================== FESTIVE & HOLIDAY =====================
  {
    title: 'A Personalised Diwali Song for Your Family: A Festive Gift Beyond Sweets',
    slug: 'personalised-diwali-song-for-family-festive-gift',
    meta_description:
      'Want a Diwali gift beyond sweets and gifts? A personalised Diwali song from Melodia warms the whole family, in Hindi, Tamil and more, starting at just 199.',
    category: 'festive-holiday',
    content: `
<p>Diwali is the warmest time of the year, the season when the whole family comes together, homes glow with diyas, and everyone exchanges sweets and gifts. Yet year after year, the gifts start to feel the same. Another box of mithai, another set of dry fruits, another decorative item that ends up in a cupboard. If you want to give the people you love something that truly stands out this festive season, a personalised Diwali song is a gift that lights up hearts the way diyas light up the home.</p>
<h2>Why a Song Outshines the Usual Festive Gift</h2>
<p>The joy of a box of sweets fades the moment it is finished. A personalised song stays. It captures the warmth of your family, names the people gathered around the festive table, and celebrates the bond you all share. Played as everyone gathers for the puja or the family dinner, a custom Diwali song becomes the emotional heart of the celebration, a moment of togetherness no store bought gift can offer.</p>
<h2>What to Weave Into a Diwali Song</h2>
<p>The most touching festive songs are full of the things that make your family yours. Before you create one, think about what Diwali means in your home. Consider including:</p>
<ul>
  <li>The names of family members, from elders to the little ones.</li>
  <li>The traditions your family keeps every Diwali.</li>
  <li>A warm message of love, prosperity, and togetherness.</li>
  <li>A nod to family members celebrating far from home this year.</li>
</ul>
<p>When the song names your family and the rituals you share, it becomes a celebration of your home, not just a generic festive tune.</p>
<h2>The Warmth of Your Family's Language</h2>
<p>Festivals feel most heartfelt in the language of home. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Marathi, Gujarati, and Bengali. A Diwali song in your family's mother tongue carries a warmth that reaches every generation, from the grandparents to the youngest cousins, and makes the whole family feel truly included.</p>
<h2>A Gift for Family Far From Home</h2>
<p>Diwali can be a tender time for families spread across cities or countries, when not everyone can make it home. A personalised song bridges that distance beautifully. You can send it to a sibling working abroad, parents in another city, or relatives who cannot travel this year, so they feel wrapped in the family's love even from afar. It becomes a piece of home they can press play on whenever they miss the celebration.</p>
<h2>Easy to Create, Easy to Treasure</h2>
<p>You do not need any musical skill to give this festive gift. With Melodia you share your family details, choose the language and the mood, and receive a finished Diwali song made just for your home. Personalised songs start at just ₹199, which makes a truly memorable festive gift more affordable than a premium box of sweets.</p>
<p>This Diwali, give your family something that glows long after the diyas burn out. <a href="/pricing">Create a personalised Diwali song with Melodia</a> and turn your festive gathering into a moment everyone will remember.</p>
`.trim(),
  },
  {
    title: 'A Personalised New Year Song: Welcome 2027 With a Gift to Remember',
    slug: 'personalised-new-year-song-welcome-celebration',
    meta_description:
      'Want a New Year gift that stands out? A personalised New Year song from Melodia celebrates the year ahead, in Hindi, Tamil and more, starting at just 199.',
    category: 'festive-holiday',
    content: `
<p>The new year is a moment of fresh hope, a clean page, and quiet resolutions whispered as the clock strikes midnight. It is also a time we reach out to the people who matter, sending wishes and messages of love for the year ahead. Yet most New Year greetings look identical, a forwarded image or a copied line that everyone has seen a hundred times. A personalised New Year song is the gesture that actually stops someone in their tracks and makes them feel genuinely thought of.</p>
<h2>Why a Song Beats Another Forwarded Wish</h2>
<p>By the first of January, everyone's phone is flooded with the same recycled greetings. They get a glance and a swipe. A custom song cuts straight through the noise. It speaks directly to the person you made it for, reflects on the year you shared, and carries your real hopes for the months ahead. Instead of a wish that vanishes in a crowded inbox, you give something they will remember and replay.</p>
<h2>What to Include in a New Year Song</h2>
<p>The most heartfelt New Year songs look both backward and forward. They honour the year that passed and welcome the one arriving. Before you create one, think about your wishes for the person. Consider weaving in:</p>
<ul>
  <li>A reflection on the year you shared, the highs and the struggles.</li>
  <li>Your genuine hopes and wishes for them in the year ahead.</li>
  <li>The bond you share, whether family, partner, or close friend.</li>
  <li>An uplifting message to start their year with hope and energy.</li>
</ul>
<p>When the song names the person and the year you went through together, your New Year wish becomes deeply personal rather than just another polite greeting.</p>
<h2>Wishes That Land in the Language of the Heart</h2>
<p>Heartfelt wishes feel warmest in one's own language. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Punjabi, Marathi, and Bengali. A New Year song in someone's mother tongue feels intimate and sincere, far more so than a greeting in a borrowed language, and it makes your message feel like it came straight from the heart.</p>
<h2>A Way to Reach Loved Ones Anywhere</h2>
<p>The new year is when we think of everyone we love, including those we rarely get to see. A personalised song is the perfect way to reach a friend in another country, a relative in another city, or a parent you wish you could be with at midnight. You can send it as the clock turns, so the first thing they hear in the new year is a song made just for them.</p>
<h2>Simple to Create, Memorable to Receive</h2>
<p>You do not need any musical talent to start someone's year this way. With Melodia you share a few details, choose the language and the mood, and receive a finished New Year song. Personalised songs start at just ₹199, which makes a wish they will never forget surprisingly affordable.</p>
<p>This year, skip the forwarded greeting and give a wish that truly means something. <a href="/pricing">Create a personalised New Year song with Melodia</a> and welcome the year ahead with a gift your loved ones will remember.</p>
`.trim(),
  },
  {
    title: 'A Festive Season Song for Loved Ones Far From Home',
    slug: 'festive-season-song-for-loved-ones-far-from-home',
    meta_description:
      'Have family far from home this festive season? A personalised song from Melodia sends warmth across the distance, in Hindi, Tamil and more, from 199.',
    category: 'festive-holiday',
    content: `
<p>The festive season has a way of making distance feel sharper. When the lights go up and families gather, the empty chair of a loved one who could not make it home is felt by everyone. A child studying in another city, a parent working abroad, a sibling who could not get leave, or grandparents who can no longer travel. Whatever the festival, the ache of celebrating apart is real. A personalised song is a beautiful way to close that gap and wrap a distant loved one in the warmth of home.</p>
<h2>Why a Song Travels Better Than a Video Call</h2>
<p>A festive video call is lovely, but it is over in minutes, and the connection often drops at the worst moment. A custom song is different. It is something your loved one can keep and replay whenever the homesickness hits, not just during the call. It carries the names, the memories, and the festive warmth of your family in a form that stays with them through the whole season and beyond.</p>
<h2>What to Put Into a Festive Song From Home</h2>
<p>The most comforting festive songs are full of the small things a distant loved one misses most. Before you create one, think about what home means to them. Worth including:</p>
<ul>
  <li>The festival you are celebrating and the traditions they are missing.</li>
  <li>The family members gathered and how much they are missed.</li>
  <li>A specific memory of past celebrations together.</li>
  <li>A loving message that the distance changes nothing.</li>
</ul>
<p>When the song names the festive rituals and the people back home, it becomes a true piece of the celebration, sent across any distance to land right in their heart.</p>
<h2>The Comfort of the Mother Tongue</h2>
<p>For someone far from home, hearing their own language is like a warm embrace. Melodia creates songs in more than twenty Indian languages, including Hindi, Tamil, Telugu, Malayalam, Punjabi, and Gujarati. A festive song in their mother tongue, full of familiar words and family names, can ease the loneliness of celebrating alone in a faraway place more than almost anything else.</p>
<h2>A Gift That Works in Both Directions</h2>
<p>This song is not only for those who are away. A loved one living abroad can also send a festive song home to parents and grandparents, so the elders know they are remembered during the celebration even when their child cannot be there. Either way, the song becomes a bridge of love across the miles, keeping the family connected when the festival makes the distance feel widest.</p>
<h2>Easy to Create, Deeply Comforting</h2>
<p>You do not need any musical skill to send this kind of warmth. With Melodia you share the details, choose the language and the mood, and receive a finished festive song made just for your loved one. Personalised songs start at just ₹199, which makes a heartfelt connection across any distance beautifully affordable.</p>
<p>If someone you love is far from home this festive season, do not let the distance dim the celebration. <a href="/pricing">Create a festive song with Melodia</a> and send them the warmth of home, wherever in the world they are.</p>
`.trim(),
  },
];

async function run() {
  let inserted = 0;
  let skipped = 0;

  for (const post of posts) {
    const existing = await db
      .select({ id: blogPostsTable.id })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, post.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`SKIP (exists): ${post.slug}`);
      skipped++;
      continue;
    }

    await db.insert(blogPostsTable).values({
      title: post.title,
      slug: post.slug,
      meta_description: post.meta_description,
      content: decode(post.content),
      category: post.category,
      published: true,
    });
    console.log(`INSERTED: ${post.slug}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Total: ${posts.length}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
