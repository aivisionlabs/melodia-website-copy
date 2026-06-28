/**
 * Seed: Bhajan creation blog posts — fills gaps left by seed-devotional-blogs.ts and
 * seed-devotional-blogs-2.ts. Covers a how-to bhajan creation anchor plus underserved
 * deities and festivals (Khatu Shyam, Venkateswara, Ayyappa, Murugan, Chhath, Jagannath,
 * Vaishno Devi, Hare Krishna kirtan, and a shraddhanjali tribute song).
 * Run: npx tsx -r dotenv/config scripts/seed-bhajan-creation-blogs.ts dotenv_config_path=.env.local
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
    title: 'How to Create Your Own Bhajan: A Step by Step Guide to Writing Devotional Music',
    slug: 'how-to-create-your-own-bhajan-step-by-step',
    meta_description:
      'Learn how to create your own bhajan, from choosing a deity and theme to writing simple lyrics and a repeating chorus, then turning it into real music.',
    category: 'devotional',
    content: `
<p>A bhajan is one of the most personal forms of worship there is. It has no fixed rules, no prescribed melody, no minimum length. At its heart, a bhajan is simply your devotion put into words and song. That freedom is exactly why so many people want to write one of their own, for a home pooja, a festival, or a quiet moment with the divine.</p>
<p>If you have ever wanted to compose a bhajan but felt you lacked the training or the talent, this guide is for you. You do not need to read music or play an instrument. You only need a feeling you want to express and a little structure to hold it together.</p>

<h2>Step One: Choose Your Deity and Your Bhav</h2>
<p>Every bhajan begins with a relationship. Are you singing to Krishna as a playful friend, to Hanuman as a protector, to Maa as a loving mother, or to a formless divine presence? The emotion you carry, the bhav, shapes everything that follows. Decide whether your song is one of surrender, gratitude, longing, celebration, or pleading. Hold that single feeling in mind as you write.</p>

<h2>Step Two: Find Your Central Line</h2>
<p>Most beloved bhajans are built around one line that repeats, the chorus or sthayi. Think of how a single phrase like a name of the Lord can be sung again and again until it fills the room. Write one short, singable line that captures your whole message. Keep it simple enough that a child or an elder could join in on the second listen.</p>

<h2>Step Three: Write Your Verses</h2>
<p>Around that central line, add two or three short verses. A reliable structure looks like this:</p>
<ul>
  <li><strong>Verse one:</strong> introduce the deity and the feeling, the way a darshan opens a heart.</li>
  <li><strong>Verse two:</strong> recall a story, a quality, or a blessing you are grateful for.</li>
  <li><strong>Verse three:</strong> offer your prayer or surrender, ending on a note of peace.</li>
</ul>
<p>Keep the language plain and rhythmic. The most loved bhajans use everyday words, not difficult Sanskrit, so that anyone can feel them. Let each line rhyme gently with the next where it can, because rhyme is what makes a bhajan easy to remember and sweet to sing.</p>

<h2>Step Four: Decide the Mood of the Melody</h2>
<p>You do not need to compose a raga from scratch, but it helps to know the mood you want. A morning prayer wants something soft and rising. A celebration bhajan wants energy and a steady clap. A longing bhajan, missing the divine, wants something slow and tender. Naming the mood is enough to guide the music that comes next.</p>

<h2>Step Five: Turn Your Words Into Real Music</h2>
<p>This is the step that used to require a harmonium, a singer, and a recording studio. Today it does not. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you can take the lyrics and the mood you just created and have them turned into a fully sung, studio quality bhajan in your own chosen language. You provide the words and the feeling, and you receive a real devotional song you can play during aarti, share with family, or keep as a recording of your bhakti.</p>
<p>A custom bhajan from Melodia starts at just ₹199, which makes it easy to create one for every festival in the year, each carrying your own words rather than borrowed ones.</p>

<h2>Step Six: Sing It, Share It, Offer It</h2>
<p>A bhajan is not finished until it is sung. Play it at your next pooja, teach the chorus to your children, or send it to a parent who will treasure hearing the divine praised in words you wrote yourself. Devotion grows when it is shared.</p>
<p>Whether you are honouring a family deity or simply want to express what you feel, the process is the same: one feeling, one line, a few verses, and a melody to carry them. When you are ready to hear your words come alive, <a href="https://www.melodia-songs.com/pricing">create your bhajan with Melodia</a> and offer something truly your own.</p>
`.trim(),
  },
  {
    title: 'Custom Khatu Shyam Bhajan With Your Own Lyrics — Sing Haare Ka Sahara in Your Words',
    slug: 'custom-khatu-shyam-bhajan-own-lyrics',
    meta_description:
      'Create a personalised Khatu Shyam bhajan with your own lyrics for your chowki, jagran, or Falgun Mela. Turn your devotion to Baba Shyam into a real song.',
    category: 'devotional',
    content: `
<p>Few deities inspire the kind of love that Khatu Shyam Ji does. Known as the one who supports the helpless, Haare ka sahara, Baba Shyam draws millions to his temple in Rajasthan and into countless homes where the colours of his flag and the sound of his bhajans fill every Shyam chowki. If you are a devotee, you already know that a Khatu Shyam jagran is incomplete without song.</p>
<p>This year, instead of singing only the familiar tracks, imagine offering Baba a bhajan written in your own words, naming your own gratitude and your own prayers.</p>

<h2>Why Khatu Shyam Bhajans Feel So Personal</h2>
<p>The story of Khatu Shyam, of Barbarika offering his very head and being blessed to be worshipped in the age of Kali, is a story of total surrender. That is why his devotees do not sing from a distance. They sing as people who have been carried through their hardest days. A bhajan to Baba Shyam is a thank you, a promise, and a plea all at once.</p>

<h2>What to Put Into Your Personalised Bhajan</h2>
<p>When you create your own Khatu Shyam bhajan, you can weave in the things that matter to your family:</p>
<ul>
  <li><strong>Your gratitude:</strong> the wish that was granted, the trouble he carried you through.</li>
  <li><strong>His beloved names:</strong> Shyam, Khatu Naresh, Lakhdatar, Haare ka sahara, Teen Baan Dhari.</li>
  <li><strong>Your family vow:</strong> the nishan you carry, the chowki you host every year.</li>
  <li><strong>Your prayer:</strong> the blessing you seek for the year ahead.</li>
</ul>

<h2>Perfect for Your Chowki, Jagran, and Falgun Mela</h2>
<p>A personalised bhajan shines brightest at the moments that already belong to Baba. Play it as the centrepiece of your Shyam chowki, open your jagran with it, or carry it in your heart to the great Falgun Mela in Khatu. Because the words are yours, the whole gathering feels closer to the devotion behind them.</p>

<h2>Create Your Khatu Shyam Bhajan in Minutes</h2>
<p>You do not need a music studio or a professional singer. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the words, the names, and the feeling you want to express, and you receive a fully sung, studio quality Khatu Shyam bhajan in the language you love, whether that is Hindi, Marwari flavoured Hindi, or any tongue your family prays in.</p>
<p>Starting at just ₹199, it is an offering any devotee can make, and one Baba Shyam, who never weighs the size of a gift, will surely receive with love.</p>

<h2>Let Your Devotion Be Heard</h2>
<p>Baba Shyam is famous for listening to the smallest voice. This year, give that voice your own words. <a href="https://www.melodia-songs.com/pricing">Create your personalised Khatu Shyam bhajan with Melodia</a> and let your jagran ring with a song that no one else in the world has ever sung. Jai Shree Shyam.</p>
`.trim(),
  },
  {
    title: 'Personalized Venkateswara Bhajan for Tirupati Balaji — Sing Govinda in Your Own Words',
    slug: 'personalized-venkateswara-balaji-bhajan-tirupati',
    meta_description:
      'Create a custom Venkateswara bhajan for Lord Balaji with your own lyrics. Perfect for a Tirupati pilgrimage, Saturday puja, or a Govinda Govinda namasankirtana.',
    category: 'devotional',
    content: `
<p>The cry of Govinda Govinda echoing up the seven hills of Tirumala is one of the most stirring sounds in all of devotion. Lord Venkateswara, known lovingly as Balaji, Srinivasa, and Govinda, is among the most worshipped forms of Vishnu, drawing devotees from across South India and the world to fulfil vows and seek his grace.</p>
<p>If Balaji is your family deity, or if you have a Tirupati pilgrimage in your heart, a bhajan written in your own words can carry your devotion in a way a borrowed song never quite will.</p>

<h2>The Many Names of the Lord of Seven Hills</h2>
<p>Part of the beauty of singing to Venkateswara is the richness of his names. A personalised bhajan can move through them like beads on a mala:</p>
<ul>
  <li><strong>Govinda and Srinivasa:</strong> the names devotees call out on the climb to Tirumala.</li>
  <li><strong>Balaji and Venkatesha:</strong> the form that grants every sincere wish.</li>
  <li><strong>Edukondalavada:</strong> the Lord of the seven hills, in beloved Telugu.</li>
</ul>
<p>Naming him in your own tongue, whether Telugu, Tamil, Kannada, or Hindi, makes the song feel like a true conversation with the divine.</p>

<h2>What Makes a Personalised Balaji Bhajan Special</h2>
<p>When you write your own bhajan, you can fold in the vow you are fulfilling, the gratitude for a prayer answered, and the blessing you seek for your family. Many devotees who have promised a tonsure, a hundi offering, or a pilgrimage find that a song naming that vow makes the whole journey more heartfelt.</p>

<h2>For Your Saturday Puja and Your Pilgrimage</h2>
<p>Saturday is especially dear to Balaji, and a personalised bhajan is a beautiful way to begin your weekly puja at home. It also makes a meaningful keepsake of a Tirupati trip, a recording you can return to long after you have come down from the hills, the namasankirtana of Govinda Govinda still ringing in your memory.</p>

<h2>Create Your Venkateswara Bhajan With Ease</h2>
<p>You do not need to be a singer or know a single raga. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you provide the names, the vow, and the feeling you want to express, and you receive a fully sung, studio quality Balaji bhajan in your chosen language. Starting at just ₹199, it is a simple and loving way to offer the Lord of the seven hills a song that is truly your own.</p>

<h2>Offer the Lord Your Own Voice</h2>
<p>Balaji is said to receive even the humblest offering with boundless grace. This year, let your offering be a song no one else has sung. <a href="https://www.melodia-songs.com/pricing">Create your personalised Venkateswara bhajan with Melodia</a> and carry Govinda in your own words. Govinda Govinda.</p>
`.trim(),
  },
  {
    title: 'Custom Ayyappa Bhajan for Sabarimala and the Mandala Season — Swamiye Saranam Ayyappa',
    slug: 'custom-ayyappa-bhajan-sabarimala-mandala-season',
    meta_description:
      'Create a personalised Ayyappa bhajan for your Mandala vratham, irumudi, and Sabarimala pilgrimage. Turn your saranam ghosha into a song made in your own words.',
    category: 'devotional',
    content: `
<p>When the Mandala season arrives and devotees don the black mala, the air fills with one chant above all others: Swamiye Saranam Ayyappa. The pilgrimage to Sabarimala is one of the most disciplined and devotional journeys in all of Hinduism, a forty one day vratham of austerity, brotherhood, and surrender to Lord Ayyappa, the eternal Dharma Shasta.</p>
<p>For the millions who undertake this journey, a personalised bhajan can hold the spirit of the vratham in a way that lasts long after the season ends.</p>

<h2>The Devotion of the Mandala Vratham</h2>
<p>What makes Ayyappa devotion unique is its demand. The devotee, the Ayyappan, lives simply, walks barefoot, calls every fellow pilgrim Swami, and carries the sacred irumudi on the head up the eighteen holy steps. A bhajan written for this journey can honour every part of it, the vow taken, the discipline kept, and the longing for darshan at the hilltop shrine.</p>

<h2>What to Weave Into Your Ayyappa Bhajan</h2>
<ul>
  <li><strong>The saranam ghosha:</strong> the beloved call of Swamiye Saranam Ayyappa that binds every devotee.</li>
  <li><strong>His sacred names:</strong> Ayyappa, Manikandan, Dharma Shasta, Hariharasudan, born of Hari and Hara.</li>
  <li><strong>Your vratham:</strong> the mala you wore, the discipline you kept, the irumudi you carried.</li>
  <li><strong>Your prayer:</strong> the grace you seek as you climb the eighteen steps.</li>
</ul>

<h2>A Song for Your Pilgrimage and Your Pooja</h2>
<p>A personalised Ayyappa bhajan is beautiful during the bhajan sandhya that families and groups hold through the Mandala season, when devotees gather each evening to sing. It also becomes a treasured memory of the pilgrimage itself, a recording in your own words that brings the peace of Sabarimala back to you any day of the year. Sing it in Malayalam, Tamil, Telugu, Kannada, or Hindi, whichever language carries your bhakti best.</p>

<h2>Create Your Ayyappa Bhajan Without a Studio</h2>
<p>You do not need musical training to offer Swami a song. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the saranam, the names, and the devotion of your vratham, and you receive a fully sung, studio quality Ayyappa bhajan in your chosen language. Starting at just ₹199, it is an offering every Ayyappan can make for the season.</p>

<h2>Let the Hills Echo Your Words</h2>
<p>Lord Ayyappa receives the devotion of every sincere heart, prince or pauper, alike. This Mandala season, let your saranam ghosha be a song that is truly yours. <a href="https://www.melodia-songs.com/pricing">Create your personalised Ayyappa bhajan with Melodia</a> and carry it with you to the eighteen steps. Swamiye Saranam Ayyappa.</p>
`.trim(),
  },
  {
    title: 'Personalized Murugan Bhajan for Skanda Sashti and Thaipusam — Haro Hara in Your Own Words',
    slug: 'personalized-murugan-bhajan-skanda-sashti',
    meta_description:
      'Create a custom Murugan bhajan for Skanda Sashti, Thaipusam, or your kavadi vow. Turn your devotion to Lord Kartikeya into a real song in your own words.',
    category: 'devotional',
    content: `
<p>To his devotees across Tamil Nadu and the wider South, Lord Murugan is the ever youthful god of valour, wisdom, and grace. Known as Kartikeya, Skanda, Subramanya, and Velan, the holder of the divine spear, he is celebrated with some of the most joyful and powerful devotion in all of Hinduism, from the fast of Skanda Sashti to the great kavadi processions of Thaipusam.</p>
<p>If Murugan is the deity your heart calls to, a personalised bhajan lets you offer him a song shaped by your own vow and your own gratitude.</p>

<h2>A God Worshipped With Both Joy and Penance</h2>
<p>Murugan devotion has two beautiful faces. There is the celebration, the dancing and singing of Haro Hara as devotees praise him. And there is the penance, the kavadi carried on the shoulders and the vel kavadi offered at Thaipusam as a vow fulfilled. A bhajan written in your own words can hold both, the joy of his blessings and the seriousness of your promise to him.</p>

<h2>What to Bring Into Your Murugan Bhajan</h2>
<ul>
  <li><strong>His names and forms:</strong> Murugan, Kartikeya, Skanda, Subramanya, Velan, Arumugam, the six faced lord.</li>
  <li><strong>His sacred abodes:</strong> Palani, Tiruchendur, and the Arupadai Veedu, his six holy homes.</li>
  <li><strong>Your vow:</strong> the kavadi you carry, the fast of Sashti you keep.</li>
  <li><strong>Your prayer:</strong> the courage, wisdom, and protection you seek from his vel.</li>
</ul>

<h2>For Skanda Sashti, Thaipusam, and Daily Worship</h2>
<p>A personalised Murugan bhajan brings depth to the six day fast of Skanda Sashti, which ends in the joyous Soorasamharam. It carries the spirit of Thaipusam as you prepare your kavadi. And it makes a beautiful daily prayer at your home altar. Sing it in Tamil, Telugu, Kannada, Malayalam, or Hindi, in whichever language your devotion flows.</p>

<h2>Create Your Murugan Bhajan With Melodia</h2>
<p>You do not need to be a trained singer to praise Velan. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you provide his names, your vow, and the feeling you want to express, and you receive a fully sung, studio quality Murugan bhajan in your chosen language. Starting at just ₹199, it is a heartfelt and affordable way to offer the lord of the vel a song that is truly your own.</p>

<h2>Raise Your Voice to the Lord of the Vel</h2>
<p>Murugan blesses the devotion of every sincere heart with his ever youthful grace. This Skanda Sashti, let your praise be a song no one else has sung. <a href="https://www.melodia-songs.com/pricing">Create your personalised Murugan bhajan with Melodia</a> and offer it with love. Haro Hara, Vetri Vel Muruganukku Haro Hara.</p>
`.trim(),
  },
  {
    title: 'Custom Chhath Puja Song for Surya and Chhathi Maiya — Honour the Sun in Your Own Words',
    slug: 'custom-chhath-puja-song-surya-chhathi-maiya',
    meta_description:
      'Create a personalised Chhath Puja song for Surya Dev and Chhathi Maiya. Perfect for arghya at the ghat, your vrat, and a heartfelt Bhojpuri devotional gift.',
    category: 'devotional',
    content: `
<p>There is no festival quite like Chhath. For four days, devotees across Bihar, Jharkhand, eastern Uttar Pradesh, and far beyond keep one of the most demanding vrats in Hinduism, standing waist deep in water to offer arghya to the setting and rising sun. It is a festival of gratitude to Surya Dev, the source of all life, and to Chhathi Maiya, the beloved mother who protects children and grants well being. In 2026, Chhath Puja falls in mid November.</p>
<p>For families who hold this vrat sacred, a personalised Chhath song can carry the devotion of those four days in a way that lasts all year.</p>

<h2>A Festival of Discipline, Purity, and Gratitude</h2>
<p>Chhath asks much of its devotees, the Vratis: the day of Nahay Khay, the fast of Kharna, the long nirjala vrat without even water, and the arghya offered at the ghat as the whole family gathers. The songs of Chhath, sung in Bhojpuri and Maithili, are the soul of the festival. A bhajan written in your own words can name your family, your gratitude, and the wishes you carry to the riverbank.</p>

<h2>What to Weave Into Your Chhath Song</h2>
<ul>
  <li><strong>Surya Dev:</strong> the sun who gives life, health, and prosperity.</li>
  <li><strong>Chhathi Maiya:</strong> the mother who blesses children and guards the family.</li>
  <li><strong>The arghya and the ghat:</strong> the offering of water, fruit, and thekua at dawn and dusk.</li>
  <li><strong>Your gratitude and vow:</strong> the blessing received and the prayer for the year ahead.</li>
</ul>

<h2>Perfect for the Ghat and for Loved Ones Far From Home</h2>
<p>A personalised Chhath song is beautiful to play as the family prepares the soop and daura for the ghat. It is also a deeply moving gift for relatives who cannot be home for Chhath this year, a way to send the warmth of the festival across any distance, in the Bhojpuri or Maithili they grew up singing, or in Hindi.</p>

<h2>Create Your Chhath Song With Melodia</h2>
<p>You do not need a music studio or a folk singer to honour Chhathi Maiya. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the names, the gratitude, and the feeling of your family vrat, and you receive a fully sung, studio quality Chhath song in your chosen language. Starting at just ₹199, it is a loving offering any devotee can make.</p>

<h2>Let the Sun Hear Your Family's Voice</h2>
<p>Surya Dev and Chhathi Maiya receive the devotion of every sincere family. This Chhath, let your arghya rise with a song that is truly your own. <a href="https://www.melodia-songs.com/pricing">Create your personalised Chhath song with Melodia</a> and honour the giver of life in your own words. Jai Chhathi Maiya.</p>
`.trim(),
  },
  {
    title: 'Personalized Jagannath Bhajan for Rath Yatra — Sing Jai Jagannath in Your Own Words',
    slug: 'personalized-jagannath-bhajan-rath-yatra',
    meta_description:
      'Create a custom Jagannath bhajan for Rath Yatra with your own lyrics. Honour Mahaprabhu, Balabhadra, and Subhadra of Puri with a real devotional song.',
    category: 'devotional',
    content: `
<p>When the great chariots roll down the Grand Road of Puri and millions raise their hands and voices, the cry of Jai Jagannath fills the air like nothing else on earth. Rath Yatra, the festival of chariots, is the moment Lord Jagannath, with his brother Balabhadra and sister Subhadra, leaves the temple to bless all who gather, regardless of who they are. In 2026, Rath Yatra falls in mid July.</p>
<p>For devotees of Mahaprabhu, a personalised bhajan is a beautiful way to carry the joy of Puri into your own home and heart.</p>

<h2>The Lord Who Comes Out to Meet His People</h2>
<p>What makes Jagannath so beloved is his openness. Once a year he steps out of the sanctum so that even those who cannot enter the temple can have his darshan. A bhajan to Jagannath is a song of that closeness, of a Lord who is family, called affectionately Kalia, Mahaprabhu, and the Lord of the universe. Writing one in your own words lets you speak to him as your own.</p>

<h2>What to Bring Into Your Jagannath Bhajan</h2>
<ul>
  <li><strong>The divine siblings:</strong> Jagannath, Balabhadra, and Subhadra on their three chariots.</li>
  <li><strong>His loving names:</strong> Mahaprabhu, Kalia, Patitapavana, the saviour of the fallen.</li>
  <li><strong>The Rath Yatra:</strong> the pulling of the chariots, the Grand Road, the return Bahuda Yatra.</li>
  <li><strong>Your prayer:</strong> the blessing and refuge you seek at his feet.</li>
</ul>

<h2>For Rath Yatra, Snana Yatra, and Daily Bhakti</h2>
<p>A personalised Jagannath bhajan brings the spirit of Puri to your Rath Yatra celebrations at home, to Snana Purnima, and to your everyday worship before his image. Sing it in Odia, Bengali, Hindi, or any language your devotion speaks, and let the joy of the chariot festival live in your house all year.</p>

<h2>Create Your Jagannath Bhajan With Melodia</h2>
<p>You do not need to be a trained singer to praise Mahaprabhu. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share his names, the spirit of the Rath Yatra, and the feeling you want to express, and you receive a fully sung, studio quality Jagannath bhajan in your chosen language. Starting at just ₹199, it is a joyful and affordable offering to the Lord of Puri.</p>

<h2>Raise Your Voice With the Chariots</h2>
<p>Jagannath comes out to meet every devotee, asking nothing but love. This Rath Yatra, let your love be a song that is truly your own. <a href="https://www.melodia-songs.com/pricing">Create your personalised Jagannath bhajan with Melodia</a> and sing him home in your own words. Jai Jagannath.</p>
`.trim(),
  },
  {
    title: 'Personalized Vaishno Devi Bhajan for Mata Rani — Jai Mata Di in Your Own Words',
    slug: 'personalized-vaishno-devi-bhajan-mata-rani',
    meta_description:
      'Create a custom Vaishno Devi bhajan for Mata Rani with your own lyrics. Perfect for your yatra, a mata ki chowki, or a jagrata in honour of the divine mother.',
    category: 'devotional',
    content: `
<p>The call of Jai Mata Di carries up the hills of Trikuta as lakhs of devotees make the climb to the holy cave of Mata Vaishno Devi. For her children, Mata Rani is the loving mother who calls each devotee herself, the one whose bulawa, her divine invitation, brings them to her doorstep. The yatra to her shrine is among the most cherished pilgrimages in all of North India.</p>
<p>If the Mother is the deity your heart turns to, a personalised bhajan lets you answer her call with a song made of your own devotion.</p>

<h2>The Mother Who Calls Her Children Home</h2>
<p>Devotees say that no one reaches Vaishno Devi without her wish. That belief, that the Mother herself summons you, is the heart of Mata Rani bhakti. A bhajan written in your own words can speak of the call you felt, the climb you made, and the gratitude that filled you at her darshan in the holy cave where she resides as three pindis.</p>

<h2>What to Weave Into Your Mata Rani Bhajan</h2>
<ul>
  <li><strong>Her beloved names:</strong> Vaishno Devi, Mata Rani, Sherawali, Jyotanwali, the divine mother.</li>
  <li><strong>The yatra:</strong> the bulawa you received, the climb through Ardhkuwari to Bhawan.</li>
  <li><strong>Your gratitude:</strong> the wish she granted, the protection she gave your family.</li>
  <li><strong>Your prayer:</strong> the blessing you carry back down the hill.</li>
</ul>

<h2>Beautiful for Your Chowki, Jagrata, and Yatra</h2>
<p>A personalised Mata Rani bhajan is the heart of a mata ki chowki or a night long jagrata, where families gather to sing the Mother's praises. It also makes a moving keepsake of your Vaishno Devi yatra, a recording in your own words that brings the peace of the holy cave back to you whenever you play it. Sing it in Hindi, Dogri, Punjabi, or any tongue your bhakti speaks.</p>

<h2>Create Your Vaishno Devi Bhajan in Minutes</h2>
<p>You do not need a singer or a studio to praise the Mother. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share her names, your yatra, and the gratitude in your heart, and you receive a fully sung, studio quality Mata Rani bhajan in your chosen language. Starting at just ₹199, it is a loving offering every child of the Mother can make.</p>

<h2>Answer the Mother's Call With a Song</h2>
<p>Mata Rani calls each devotee with love and receives every offering with grace. This year, let your offering be a song that is truly your own. <a href="https://www.melodia-songs.com/pricing">Create your personalised Vaishno Devi bhajan with Melodia</a> and sing her praises in your own words. Jai Mata Di.</p>
`.trim(),
  },
  {
    title: 'Custom Hare Krishna Kirtan — Create a Mahamantra Song With Your Own Devotion',
    slug: 'custom-hare-krishna-kirtan-mahamantra-song',
    meta_description:
      'Create a personalised Hare Krishna kirtan built around the Mahamantra. Perfect for your home sankirtan, japa, satsang, and daily Krishna consciousness practice.',
    category: 'devotional',
    content: `
<p>Of all the practices of bhakti, none is simpler or more joyful than kirtan, the singing of the holy names of God. At its centre stands the Mahamantra, the great chant of Hare Krishna Hare Krishna, Krishna Krishna, Hare Hare, Hare Rama Hare Rama, Rama Rama, Hare Hare. Sung in homes, temples, and streets the world over, it is the heartbeat of Krishna consciousness, a sound said to cleanse the heart and awaken pure love.</p>
<p>If kirtan is part of your spiritual life, a personalised Hare Krishna song can give your sankirtan a melody and a feeling that are truly your own.</p>

<h2>The Power of the Holy Name</h2>
<p>Kirtan is unique because it asks nothing but participation. There is no requirement of training, only the willingness to sing. The Mahamantra repeats the names of Krishna and Rama, and around that repetition devotees build melodies that rise from a gentle hum to soaring, ecstatic call and response. A personalised kirtan lets you set that journey to a mood that fits your practice, whether meditative for morning japa or uplifting for an evening sankirtan.</p>

<h2>What You Can Shape in Your Kirtan</h2>
<ul>
  <li><strong>The Mahamantra:</strong> the sixteen names at the heart of the song.</li>
  <li><strong>The names of the Lord:</strong> Govinda, Gopala, Madhava, Radhe Shyam, woven between rounds.</li>
  <li><strong>The mood:</strong> soft and meditative, or building and joyful for group singing.</li>
  <li><strong>Your dedication:</strong> a verse offering the kirtan for your family or your spiritual progress.</li>
</ul>

<h2>For Your Home Sankirtan and Satsang</h2>
<p>A personalised kirtan is wonderful for the gatherings that already centre on the holy name, the home sankirtan, the weekly satsang, the quiet hour of japa. Because the melody is yours, it becomes the song your family returns to again and again, teaching the Mahamantra to children and elders alike. Sing it in the language that feels most natural, with the names of the Lord always at its core.</p>

<h2>Create Your Hare Krishna Kirtan With Melodia</h2>
<p>You do not need to be a musician to lead a kirtan. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the Mahamantra, the names you love, and the mood you want, and you receive a fully sung, studio quality kirtan you can play and sing along to every day. Starting at just ₹199, it is a simple way to bring the holy name into your home in a melody of your own.</p>

<h2>Let the Holy Name Fill Your Home</h2>
<p>The Mahamantra welcomes every voice and asks nothing in return but love. Bring it alive in a song that is truly yours. <a href="https://www.melodia-songs.com/pricing">Create your personalised Hare Krishna kirtan with Melodia</a> and let your home ring with the names of the Lord. Hare Krishna.</p>
`.trim(),
  },
  {
    title: 'A Devotional Tribute Song for a Departed Loved One — A Shraddhanjali in Music',
    slug: 'devotional-tribute-song-departed-loved-one-shraddhanjali',
    meta_description:
      'Create a personalised devotional tribute song for a departed loved one. A shraddhanjali in music for a barsi, shraddh, or prayer meeting that honours their soul.',
    category: 'devotional',
    content: `
<p>When someone we love leaves this world, we search for ways to honour them that feel as deep as our grief. Flowers fade and photographs sit silent, but a song carries feeling in a way few things can. A devotional tribute song, a shraddhanjali set to music, weaves prayer for the departed soul together with the memory of who they were, creating something families return to year after year.</p>
<p>It is one of the most meaningful offerings you can make, whether for a prayer meeting, a barsi, or the quiet anniversary that only the family remembers.</p>

<h2>Why a Devotional Tribute Song Heals</h2>
<p>In Hindu tradition, we pray for the peace and onward journey of the soul, for sadgati and moksha. A tribute song can hold both that prayer and the love that remains. It can name the person, recall their gentleness or their laughter, and place them in the care of the divine. For a grieving family, hearing their loved one honoured in music gives sorrow a place to rest.</p>

<h2>What a Tribute Song Can Hold</h2>
<ul>
  <li><strong>Their name and spirit:</strong> the warmth, the values, the small things that made them theirs.</li>
  <li><strong>A prayer for the soul:</strong> for peace, for moksha, for the blessing of the divine.</li>
  <li><strong>The family's gratitude:</strong> for the years given, the lessons taught, the love shared.</li>
  <li><strong>A note of comfort:</strong> the faith that the bond endures beyond this life.</li>
</ul>

<h2>For a Barsi, Shraddh, or Prayer Meeting</h2>
<p>A personalised tribute song brings a sacred stillness to a prayer meeting or shanti path, and it becomes a gentle ritual at each barsi, the yearly remembrance. Played softly as the family gathers, it lets everyone grieve and give thanks together. It can also be shared with relatives who live far away, so they too can be part of honouring the one who has gone, in the language the family holds closest.</p>

<h2>Create a Tribute Song With Care</h2>
<p>You do not need to be a writer or a singer to give this gift. With <a href="https://www.melodia-songs.com/pricing">Melodia</a>, you share the name, the memories, and the prayer you hold, and you receive a fully sung, studio quality tribute song in your chosen language. Starting at just ₹199, it is a deeply personal way to honour a life and to comfort those who remain.</p>

<h2>Let Their Memory Live in Music</h2>
<p>Love does not end with parting, and neither does the wish to honour it. A song can carry both your grief and your gratitude, and keep the memory of your loved one close. <a href="https://www.melodia-songs.com/pricing">Create a devotional tribute song with Melodia</a> and offer a shraddhanjali that your family will treasure for years to come. Om Shanti.</p>
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
