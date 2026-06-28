/**
 * Seed: Indian language blog posts — one editorial blog per regional language, each
 * tied to a distinct occasion or festival so it does not duplicate the /languages SEO
 * landing pages (src/lib/seo/language-pages.ts) or existing language blogs
 * (birthday-song-for-kids-in-hindi, tamil-birthday-song-for-kids-personalized,
 * personalized-song-indian-languages-mother-tongue).
 * Run: npx tsx -r dotenv/config scripts/seed-language-blogs.ts dotenv_config_path=.env.local
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

const posts: BlogPost[] = [
  {
    title: 'Personalized Punjabi Song for a Wedding or Anniversary — Made for Your Celebration',
    slug: 'personalized-punjabi-song-for-wedding-anniversary',
    meta_description:
      'Create a custom Punjabi song for a wedding, anniversary, or sangeet. Bring dhol energy and heartfelt lyrics to your celebration in your own words, from INR 199.',
    category: 'languages',
    content: `
<p>There is a reason no celebration feels complete without a Punjabi track. The beat of the dhol, the warmth of the words, the way a whole room rises to dance the moment the music starts. Whether it is a wedding, an anniversary, or a sangeet night, a Punjabi song carries a joy that is impossible to fake. So why settle for a film track that belongs to everyone, when you can have one written for the people you are celebrating?</p>
<p>A personalised Punjabi song turns your own story into the anthem of the evening, naming your couple, your family, and the moments only you share.</p>

<h2>Why a Punjabi Song Lands So Hard at a Celebration</h2>
<p>Punjabi music is built for togetherness. It is loud in the best way, generous with emotion, and impossible to sit still through. A custom Punjabi song lets you keep all of that energy while making the lyrics personal, so the bhangra circle is dancing to a story that is actually about the bride and groom, or about the parents marking thirty years together.</p>

<h2>Occasions a Custom Punjabi Song Is Made For</h2>
<ul>
  <li><strong>Weddings:</strong> a grand entry song, a sangeet showstopper, or a surprise from the siblings.</li>
  <li><strong>Anniversaries:</strong> a heartfelt salgirah tribute to parents or to your own partner.</li>
  <li><strong>Birthdays:</strong> a high energy janamdin anthem that gets everyone on their feet.</li>
  <li><strong>Mehndi and roka:</strong> a playful track that teases the couple with inside jokes.</li>
</ul>

<h2>Pure Punjabi or a Punjabi and Hindi Blend</h2>
<p>You can choose the flavour that fits your family. Some want chaste, rooted Punjabi that honours the language. Others love a Punjabi and Hindi mix that everyone in a mixed gathering can sing along to. Either way, the names, the references, and the feeling are yours.</p>

<h2>Create Your Punjabi Song in Minutes</h2>
<p>You do not need a music studio or a professional singer. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the occasion, and the story you want to tell, and you receive a fully sung, studio quality Punjabi song you can play at the celebration or send ahead as a surprise. Starting at just INR 199, it is the easiest way to give your big day a track that is truly its own.</p>

<p>This year, let the dhol play a song that no one else has. <a href="https://www.melodia-songs.com/pricing">Create your personalised Punjabi song with Melodia</a> and watch the dance floor fill. Balle balle.</p>
`.trim(),
  },
  {
    title: 'Personalized Bengali Song for a Birthday or Poila Boishakh — Shubho in Your Words',
    slug: 'personalized-bengali-song-birthday-poila-boishakh',
    meta_description:
      'Create a custom Bengali song for a birthday, Poila Boishakh, or family celebration. Heartfelt Rabindrasangeet warmth in your own words, starting at INR 199.',
    category: 'languages',
    content: `
<p>Bengali is a language that sings on its own. It gave the world Rabindrasangeet, a tradition where poetry and melody are inseparable, and it carries an emotional softness that few languages can match. So when you want to mark a birthday, welcome the new year on Poila Boishakh, or simply tell someone how much they mean to you, a Bengali song says it with a tenderness all its own.</p>
<p>A personalised Bengali song lets you wrap that warmth around your own people, naming them and the moments you share.</p>

<h2>The Emotional Depth of a Bengali Song</h2>
<p>What makes Bengali music special is its sincerity. It does not shout its feelings; it lets them unfold. A custom Bengali song can move from gentle nostalgia to quiet joy in a way that feels like a heartfelt letter set to music. For a parent, a partner, or a dear friend, it becomes a keepsake they will return to again and again.</p>

<h2>Occasions a Custom Bengali Song Suits</h2>
<ul>
  <li><strong>Birthdays:</strong> a warm Shubho Jonmodin tribute naming the person and your memories.</li>
  <li><strong>Poila Boishakh:</strong> a Shubho Noboborsho song to open the Bengali new year with hope.</li>
  <li><strong>Anniversaries:</strong> a tender song for parents or for your own years together.</li>
  <li><strong>Durga Puja and homecomings:</strong> a song for the family gathering that defines the season.</li>
</ul>

<h2>Pure Bengali or a Gentle Blend</h2>
<p>You can keep it in graceful, literary Bengali, or soften it with a touch of Hindi or English for a mixed family. The melody can lean into the flowing feel of Rabindrasangeet or take a lighter, modern shape, whatever suits the person you are honouring.</p>

<h2>Create Your Bengali Song With Ease</h2>
<p>You do not need to write poetry or sing a note. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the name, the occasion, and the feeling you want to express, and you receive a fully sung, studio quality Bengali song in minutes. Starting at just INR 199, it is a beautiful and affordable way to give someone a gift made entirely for them.</p>

<p>This year, let your wishes arrive in song. <a href="https://www.melodia-songs.com/pricing">Create your personalised Bengali song with Melodia</a> and say it the way only Bengali can. Shubhechha.</p>
`.trim(),
  },
  {
    title: 'Personalized Marathi Song for a Wedding or Gudi Padwa — Celebrate in Your Mother Tongue',
    slug: 'personalized-marathi-song-wedding-gudi-padwa',
    meta_description:
      'Create a custom Marathi song for a wedding, Gudi Padwa, or family celebration. Heartfelt lyrics in your own words with studio quality music, from INR 199.',
    category: 'languages',
    content: `
<p>Marathi carries a proud, rooted warmth, the kind you feel at a Maharashtrian wedding when the lezim and the dhol tasha fill the air, or on Gudi Padwa morning when families raise the gudi to welcome a new year. It is a language of strong feeling and deep tradition, and a song in Marathi speaks straight to the heart of anyone who grew up with it.</p>
<p>A personalised Marathi song lets you celebrate your people in their own mother tongue, with the names, the love, and the references that belong only to your family.</p>

<h2>Why a Marathi Song Means So Much</h2>
<p>For a Marathi family, hearing a celebration song in their own language is a small homecoming. It honours where they come from. A custom Marathi song keeps that rootedness while making the words personal, so a wedding tribute or a birthday wish feels both traditional and entirely yours.</p>

<h2>Occasions a Custom Marathi Song Suits</h2>
<ul>
  <li><strong>Weddings:</strong> a tribute for the couple, a sangeet performance, or a song from the family.</li>
  <li><strong>Gudi Padwa:</strong> a bright new year song to raise with the gudi and welcome good fortune.</li>
  <li><strong>Birthdays and anniversaries:</strong> a heartfelt Vadhdivsachya Hardik Shubhechha for someone dear.</li>
  <li><strong>Ganeshotsav:</strong> a festive song for the days the whole neighbourhood celebrates together.</li>
</ul>

<h2>Pure Marathi or a Comfortable Blend</h2>
<p>Choose graceful, literary Marathi for a traditional feel, or a relaxed Marathi and Hindi mix that everyone at a mixed gathering can follow. The mood can be tender, celebratory, or playful, shaped entirely around the occasion.</p>

<h2>Create Your Marathi Song With Melodia</h2>
<p>You do not need any musical skill. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the occasion, and the story you want to tell, and you receive a fully sung, studio quality Marathi song you can play at the celebration or send as a surprise. Starting at just INR 199, it is a simple and loving way to honour your roots.</p>

<p>This year, let the celebration sing in Marathi. <a href="https://www.melodia-songs.com/pricing">Create your personalised Marathi song with Melodia</a> and give your family a gift in the language they love.</p>
`.trim(),
  },
  {
    title: 'Personalized Gujarati Song for Navratri or a Wedding — Garba Energy Made for You',
    slug: 'personalized-gujarati-song-navratri-wedding',
    meta_description:
      'Create a custom Gujarati song for Navratri garba, a wedding, or a family celebration. Joyful lyrics in your own words with studio quality music, from INR 199.',
    category: 'languages',
    content: `
<p>Few sounds capture pure joy like a Gujarati garba. When the dhol picks up and the circle begins to spin during Navratri, the music carries an energy that pulls everyone in. Gujarati is a language of celebration, of business and of big hearted families, and a song in Gujarati brings festivity wherever it plays, whether it is a nine night garba or a grand wedding.</p>
<p>A personalised Gujarati song lets you put your own people at the centre of that joy, with names and stories made just for them.</p>

<h2>Why a Gujarati Song Brings the Party</h2>
<p>Gujarati celebration music is generous and infectious. It is made for movement, for clapping, for the dandiya sticks meeting in rhythm. A custom Gujarati song keeps every bit of that spirit while making the words personal, so your garba night or sangeet has a track written about the very people dancing to it.</p>

<h2>Occasions a Custom Gujarati Song Suits</h2>
<ul>
  <li><strong>Navratri:</strong> a high energy garba and dandiya anthem for your community nights.</li>
  <li><strong>Weddings:</strong> a sangeet showstopper or a heartfelt tribute to the couple.</li>
  <li><strong>Birthdays and anniversaries:</strong> a warm Janmadivasni Shubhechha for someone special.</li>
  <li><strong>Diwali and Bestu Varas:</strong> a festive new year song for the family gathering.</li>
</ul>

<h2>Pure Gujarati or a Lively Blend</h2>
<p>You can keep it in rich, rooted Gujarati or mix in a little Hindi for a wider gathering. The mood can be festive and fast for garba, or tender and slow for a tribute, shaped entirely around your occasion.</p>

<h2>Create Your Gujarati Song With Melodia</h2>
<p>You do not need a studio or a singer. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the occasion, and the feeling you want, and you receive a fully sung, studio quality Gujarati song ready to fill the room. Starting at just INR 199, it is the easiest way to give your celebration its own anthem.</p>

<p>This Navratri or wedding season, let the garba spin to a song that is truly yours. <a href="https://www.melodia-songs.com/pricing">Create your personalised Gujarati song with Melodia</a> and bring the whole circle to life.</p>
`.trim(),
  },
  {
    title: 'Personalized Telugu Wedding Song for Your Pelli — Pelli Paatalu Made for the Couple',
    slug: 'personalized-telugu-wedding-song-pelli',
    meta_description:
      'Create a custom Telugu wedding song for your Pelli with your own lyrics. Heartfelt Pelli Paatalu naming the couple and family, studio quality, from INR 199.',
    category: 'languages',
    content: `
<p>Telugu is often called the Italian of the East for the sweetness of its sound, and nowhere does that sweetness shine more than at a Pelli. A Telugu wedding is a grand, joyful affair stretching across rituals and days, and music is woven through all of it. So why fill those moments with film songs alone, when you can have Pelli Paatalu written for the couple at the centre of it?</p>
<p>A personalised Telugu wedding song names your bride and groom, your families, and the love story everyone has gathered to celebrate.</p>

<h2>Why a Custom Telugu Song Belongs at a Pelli</h2>
<p>A Telugu wedding is rich with tradition, from the Snatakam to the Kanyadanam to the Talambralu, where the couple shower each other in pearls and rice. Music made for these moments, naming the people in them, turns a beautiful ceremony into an unforgettable one. A custom song becomes the soundtrack the family will replay for years.</p>

<h2>Moments a Personalised Telugu Song Can Fill</h2>
<ul>
  <li><strong>The couple's tribute:</strong> a heartfelt Pelli Subhakankshalu naming their journey together.</li>
  <li><strong>The sangeet and reception:</strong> a lively performance song from siblings and friends.</li>
  <li><strong>A gift from the parents:</strong> a tender blessing for their child's new life.</li>
  <li><strong>The wedding entry:</strong> a grand track to welcome the couple to the mandapam.</li>
</ul>

<h2>Pure Telugu or a Graceful Blend</h2>
<p>Choose sweet, literary Telugu for a traditional touch, or a Telugu and English blend so every guest can follow along. The melody can be classical and tender or bright and celebratory, shaped around the moment it is made for.</p>

<h2>Create Your Telugu Wedding Song With Melodia</h2>
<p>You do not need any musical skill. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the couple's names, your story, and the feeling you want, and you receive a fully sung, studio quality Telugu wedding song in minutes. Starting at just INR 199, it is a heartfelt and affordable way to make the Pelli truly personal.</p>

<p>This wedding season, let the mandapam ring with a song written for your couple. <a href="https://www.melodia-songs.com/pricing">Create your personalised Telugu wedding song with Melodia</a> and bless the Pelli in your own words.</p>
`.trim(),
  },
  {
    title: 'Personalized Kannada Song for a Birthday or Wedding — Celebrate in Namma Kannada',
    slug: 'personalized-kannada-song-birthday-wedding',
    meta_description:
      'Create a custom Kannada song for a birthday, wedding, or family celebration. Heartfelt lyrics in your own words with studio quality music, starting at INR 199.',
    category: 'languages',
    content: `
<p>Kannada is a language with a literary heritage stretching back over a thousand years, carried today with deep pride across Karnataka. It has a graceful, melodic quality that feels at home in song, whether the occasion is a birthday, a Maduve wedding, or a quiet family milestone. When you celebrate someone in Namma Kannada, you are honouring not just them but the culture they hold close.</p>
<p>A personalised Kannada song lets you make that celebration entirely your own, with the names, the memories, and the love that belong to your family.</p>

<h2>Why a Kannada Song Feels So Personal</h2>
<p>Hearing a celebration song in their own language gives a Kannadiga a warm sense of belonging. A custom Kannada song keeps that cultural rootedness while shaping the words around your story, so a birthday wish or a wedding tribute feels both traditional and unmistakably theirs.</p>

<h2>Occasions a Custom Kannada Song Suits</h2>
<ul>
  <li><strong>Birthdays:</strong> a warm Huttuhabbada Shubhashayagalu naming the person and your memories.</li>
  <li><strong>Weddings:</strong> a Maduve tribute for the couple or a lively sangeet performance.</li>
  <li><strong>Anniversaries:</strong> a heartfelt song for parents or for your own years together.</li>
  <li><strong>Festivals:</strong> a bright Ugadi or Deepavali song for the family gathering.</li>
</ul>

<h2>Pure Kannada or a Comfortable Blend</h2>
<p>You can keep it in rich, literary Kannada or add a touch of English for a mixed gathering. The mood can be tender, joyful, or celebratory, shaped entirely around the occasion and the person.</p>

<h2>Create Your Kannada Song With Melodia</h2>
<p>You do not need a studio or any musical training. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the name, the occasion, and the feeling you want to express, and you receive a fully sung, studio quality Kannada song in minutes. Starting at just INR 199, it is a simple and loving way to celebrate in your mother tongue.</p>

<p>This year, let your wishes sing in Kannada. <a href="https://www.melodia-songs.com/pricing">Create your personalised Kannada song with Melodia</a> and give your family a gift made just for them.</p>
`.trim(),
  },
  {
    title: 'Personalized Malayalam Song for Onam or a Wedding — Made for Your Family',
    slug: 'personalized-malayalam-song-onam-wedding',
    meta_description:
      'Create a custom Malayalam song for Onam, a wedding, or a family celebration. Heartfelt lyrics in your own words with studio quality music, starting at INR 199.',
    category: 'languages',
    content: `
<p>Malayalam has a softness and a music all its own, a language that flows like the backwaters it comes from. Across Kerala and among Malayalis the world over, it carries the warmth of home, of Onam sadhya feasts on banana leaves, of weddings rich with tradition, of families gathering after long times apart. A song in Malayalam reaches straight to that feeling of belonging.</p>
<p>A personalised Malayalam song lets you wrap that warmth around your own people, with the names and moments that are yours alone.</p>

<h2>Why a Malayalam Song Touches the Heart</h2>
<p>Malayalam music has a natural grace and emotional honesty. A custom Malayalam song keeps that beauty while making the lyrics personal, so an Onam greeting or a wedding tribute feels like it was written by someone who truly knows the people in it. For family far from Kerala, it becomes a piece of home they can carry anywhere.</p>

<h2>Occasions a Custom Malayalam Song Suits</h2>
<ul>
  <li><strong>Onam:</strong> a joyful Onashamsakal song for the season of feasts, flowers, and homecoming.</li>
  <li><strong>Weddings:</strong> a tribute for the couple or a heartfelt song from the family.</li>
  <li><strong>Birthdays:</strong> a warm Pirannaal Aashamsakal greeting naming the person and your memories.</li>
  <li><strong>Anniversaries:</strong> a tender song for parents or for your own journey together.</li>
</ul>

<h2>Pure Malayalam or a Gentle Blend</h2>
<p>Choose graceful, literary Malayalam for a traditional feel, or a soft blend with English for a wider family. The mood can be festive for Onam or tender for a tribute, shaped entirely around your occasion.</p>

<h2>Create Your Malayalam Song With Melodia</h2>
<p>You do not need any musical skill. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the occasion, and the feeling you want, and you receive a fully sung, studio quality Malayalam song in minutes. Starting at just INR 199, it is a beautiful and affordable way to celebrate in your mother tongue.</p>

<p>This Onam or wedding season, let your celebration sing in Malayalam. <a href="https://www.melodia-songs.com/pricing">Create your personalised Malayalam song with Melodia</a> and send a little piece of home. Onashamsakal.</p>
`.trim(),
  },
  {
    title: 'Personalized Odia Song for a Birthday or Celebration — Heartfelt Wishes in Odia',
    slug: 'personalized-odia-song-birthday-celebration',
    meta_description:
      'Create a custom Odia song for a birthday, wedding, or family celebration. Heartfelt lyrics in your own words with studio quality music, starting at INR 199.',
    category: 'languages',
    content: `
<p>Odia is a classical language with a gentle, devotional soul, shaped by the land of Lord Jagannath and centuries of poetry and song. Across Odisha and among Odia families everywhere, it carries a quiet warmth that makes every celebration feel rooted and sincere. When you mark a birthday, a wedding, or a festival in Odia, you honour both the person and the heritage they hold dear.</p>
<p>A personalised Odia song lets you make that celebration entirely your own, with the names, the memories, and the love that belong to your family.</p>

<h2>Why an Odia Song Feels So Sincere</h2>
<p>Odia music carries a soft, heartfelt quality rooted in the region's deep devotional tradition. A custom Odia song keeps that warmth while shaping the words around your story, so a birthday wish or a family tribute feels both traditional and unmistakably yours. For relatives away from home, it becomes a treasured link to their roots.</p>

<h2>Occasions a Custom Odia Song Suits</h2>
<ul>
  <li><strong>Birthdays:</strong> a warm Janmadina greeting naming the person and your memories.</li>
  <li><strong>Weddings:</strong> a heartfelt tribute for the couple or a song from the family.</li>
  <li><strong>Anniversaries:</strong> a tender song for parents or for your own years together.</li>
  <li><strong>Festivals:</strong> a joyful song for Raja, Kumar Purnima, or a family gathering.</li>
</ul>

<h2>Pure Odia or a Gentle Blend</h2>
<p>You can keep it in graceful, literary Odia or add a light touch of Hindi or English for a mixed gathering. The mood can be tender, festive, or celebratory, shaped entirely around the occasion and the person.</p>

<h2>Create Your Odia Song With Melodia</h2>
<p>You do not need a studio or any musical training. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the name, the occasion, and the feeling you want to express, and you receive a fully sung, studio quality Odia song in minutes. Starting at just INR 199, it is a simple and loving way to celebrate in your mother tongue.</p>

<p>This year, let your wishes sing in Odia. <a href="https://www.melodia-songs.com/pricing">Create your personalised Odia song with Melodia</a> and give your family a gift made just for them.</p>
`.trim(),
  },
  {
    title: 'Personalized Assamese Song for Bihu or a Celebration — Made in Your Mother Tongue',
    slug: 'personalized-assamese-song-bihu-celebration',
    meta_description:
      'Create a custom Assamese song for Bihu, a wedding, or a family celebration. Heartfelt lyrics in your own words with studio quality music, starting at INR 199.',
    category: 'languages',
    content: `
<p>Assamese is the language of the mighty Brahmaputra valley, warm and lyrical, carried with pride across Assam and the Northeast. Nowhere does its music shine brighter than at Bihu, when the dhol and pepa ring out, the husori singers move from home to home, and whole villages dance to welcome the season. A song in Assamese carries that joy and that deep sense of belonging.</p>
<p>A personalised Assamese song lets you bring that spirit to your own people, with the names and moments that are yours alone.</p>

<h2>Why an Assamese Song Means So Much</h2>
<p>For an Assamese family, a celebration song in their own language is a true homecoming, especially for those living far from the valley. A custom Assamese song keeps the warmth and rhythm of the tradition while making the lyrics personal, so a Bihu greeting or a wedding tribute feels both rooted and entirely yours.</p>

<h2>Occasions a Custom Assamese Song Suits</h2>
<ul>
  <li><strong>Bihu:</strong> a joyful Rongali Bihu song to welcome the new year with dhol and dance.</li>
  <li><strong>Weddings:</strong> a heartfelt Biya tribute for the couple or a song from the family.</li>
  <li><strong>Birthdays:</strong> a warm Janmadinar Xubhechha naming the person and your memories.</li>
  <li><strong>Anniversaries:</strong> a tender song for parents or for your own journey together.</li>
</ul>

<h2>Pure Assamese or a Gentle Blend</h2>
<p>Choose rich, rooted Assamese for a traditional feel, or a soft blend with Hindi or English for a wider gathering. The mood can be festive for Bihu or tender for a tribute, shaped entirely around your occasion.</p>

<h2>Create Your Assamese Song With Melodia</h2>
<p>You do not need any musical skill. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the occasion, and the feeling you want, and you receive a fully sung, studio quality Assamese song in minutes. Starting at just INR 199, it is a beautiful and affordable way to celebrate in your mother tongue.</p>

<p>This Bihu, let your celebration sing in Assamese. <a href="https://www.melodia-songs.com/pricing">Create your personalised Assamese song with Melodia</a> and send the warmth of the valley to those you love.</p>
`.trim(),
  },
  {
    title: 'Personalized Urdu Song or Ghazal for Love and Anniversaries — Poetry Made for You',
    slug: 'personalized-urdu-ghazal-love-anniversary',
    meta_description:
      'Create a custom Urdu song or ghazal for love, an anniversary, or a heartfelt gift. Elegant poetic lyrics in your own words with studio quality music, from INR 199.',
    category: 'languages',
    content: `
<p>No language romances quite like Urdu. Its poetry has carried lovers' feelings for centuries, through the ghazal, the nazm, and the soft shayari that turns a simple sentiment into something timeless. When ordinary words feel too plain for what you feel, Urdu offers a way to say it with grace, longing, and beauty. That is why an Urdu song makes such an unforgettable gift of love.</p>
<p>A personalised Urdu song or ghazal lets you pour your own feelings into that elegant tradition, naming the one you love and the story you share.</p>

<h2>Why an Urdu Ghazal Speaks to the Heart</h2>
<p>The ghazal is built for emotion. Each couplet holds a complete feeling, and the form lingers on love, devotion, and tender longing in a way that goes straight to the heart. A custom Urdu song keeps that poetic richness while making the words personal, so your anniversary tribute or love song feels like it was written by a shayar who knows your story.</p>

<h2>Occasions a Custom Urdu Song Suits</h2>
<ul>
  <li><strong>Anniversaries:</strong> a romantic ghazal celebrating the years and the love you have built.</li>
  <li><strong>A love song:</strong> a heartfelt nazm to express what you feel for your partner.</li>
  <li><strong>A proposal:</strong> an elegant song to ask the most important question of all.</li>
  <li><strong>A heartfelt apology or tribute:</strong> words of feeling that only Urdu can carry so gently.</li>
</ul>

<h2>Pure Urdu or a Gentle Hindustani Blend</h2>
<p>You can choose refined, classical Urdu rich with shayari, or a softer Hindustani blend that feels warm and familiar. The mood can be a slow, soulful ghazal or a tender modern love song, shaped entirely around the feeling you want to express.</p>

<h2>Create Your Urdu Song With Melodia</h2>
<p>You do not need to be a poet or a singer. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the name, the occasion, and the feelings in your heart, and you receive a fully sung, studio quality Urdu song or ghazal in minutes. Starting at just INR 199, it is an elegant and affordable way to say what matters most.</p>

<p>This anniversary, let your love speak in the language of poetry. <a href="https://www.melodia-songs.com/pricing">Create your personalised Urdu ghazal with Melodia</a> and give a gift as timeless as your feelings.</p>
`.trim(),
  },
];

async function main() {
  console.log(`Seeding ${posts.length} blog posts...`);
  let inserted = 0;
  let skipped = 0;

  for (const post of posts) {
    const existing = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.slug, post.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  SKIP (exists): ${post.slug}`);
      skipped++;
      continue;
    }

    await db.insert(blogPostsTable).values({
      title: post.title,
      slug: post.slug,
      meta_description: post.meta_description,
      content: post.content,
      category: post.category,
      published: true,
    });

    console.log(`  INSERTED: ${post.slug}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
