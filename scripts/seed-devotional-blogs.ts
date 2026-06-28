/**
 * Seed: Inserts 5 Indian devotional songs with personalized music blog posts.
 * Run: npx tsx -r dotenv/config scripts/seed-devotional-blogs.ts dotenv_config_path=.env.local
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
}

const posts: BlogPost[] = [
  // ─── 1. Personalized Bhajan for Home Pooja ──────────────────────────────────
  {
    title: 'Personalized Bhajan for Your Home Pooja: Bring Devotion to Life With Custom Music',
    slug: 'personalized-bhajan-for-home-pooja',
    meta_description:
      'Create a custom bhajan for your home pooja with your family name, deity, and blessings you seek. AI-generated devotional music in 20+ Indian languages. From ₹299.',
    content: `
<h2>When Bhakti Becomes Truly Personal</h2>
<p>Every Indian home has its own way of worshipping. Some families light a diya every morning and sing the same bhajan their grandmother taught them. Others gather every Thursday for an aarti, voices rising together as incense curls up to the ceiling. Some have a weekly pooja where the whole family sits together before God and asks for the same things that families have always asked for — health, peace, the safety of the people they love.</p>
<p>These rituals are sacred not only because of the deity being worshipped, but because of the family doing the worshipping. The specific names, the specific prayers, the specific gratitude — these belong to your household alone. A personalized bhajan for your home pooja takes this truth and honours it in music. It is not a generic devotional track. It is a song that says your name, your deity's full title as your family uses it, and the specific blessings you have prayed for across years.</p>
<p>Melodia creates original devotional music — full audio tracks with AI-generated lyrics, real vocals, and original music — built entirely around your family's bhakti.</p>

<h2>What a Personalized Pooja Bhajan Includes</h2>
<p>The difference between a traditional bhajan and a personalized one is not the sanctity — it is the specificity. A personalized bhajan can hold:</p>
<ul>
<li>The name of the deity your family worships — not just "Bhagwan" but the full name and the affectionate title your family uses</li>
<li>Your family name and gotra, if you want the song to carry your lineage</li>
<li>The occasion — a weekly pooja, a monthly fast, an annual katha, or a daily morning ritual</li>
<li>Blessings you seek — good health, prosperity, the wellbeing of your children, the peace of your home</li>
<li>Gratitude for specific things that have happened — a recovery, a new child, a business that survived a difficult year</li>
<li>A message to the deity from your family, in the words that feel truest to your household</li>
</ul>
<p>You provide these details through Melodia's form. The AI builds the lyrics from your answers. You review them, request any changes, and approve before the music is generated. Nothing goes into your song that you have not verified.</p>

<h2>Why Every Family's Pooja Deserves Its Own Song</h2>
<p>There are hundreds of bhajans for every deity. They are beautiful, and they carry centuries of devotion in them. But they were not written for your family, about your prayers, with your names in them. When you create a personalized bhajan for your home pooja, you are not replacing those traditional songs. You are adding something that only your family possesses: a devotional piece that could not exist without you.</p>
<p>When your children grow up and move away, they will carry this song with them. When your grandchildren ask what your family's puja sounded like, there will be a specific answer. A personalized bhajan is not just music. It is a piece of your family's spiritual identity, set to melody.</p>

<h2>Occasions That Call for a Personalized Bhajan</h2>
<h3>Daily or weekly pooja</h3>
<p>A custom bhajan that your family knows by heart, specific to your deity and your prayers. Played every morning or every Friday or every ekadashi — until it becomes as much a part of your ritual as the incense itself.</p>
<h3>Satyanarayan Katha</h3>
<p>A personalized bhajan to open or close the katha, with your family name, your gratitude, and your continued prayers woven into the music. Guests at the katha will feel the difference between a generic track and something made for this household.</p>
<h3>Annual family pooja</h3>
<p>For the kutumb puja or kuldevi puja that brings the extended family together once a year. A song that names the deity and the family both — a piece of music that belongs to the occasion as surely as the prasad does.</p>
<h3>Celebrating an answered prayer</h3>
<p>After a recovery, a success, the birth of a child — a song that gives thanks in specific terms. Not just "thank you God" but a full musical offering that names what was given and who received it.</p>

<h2>The Language of Your Devotion</h2>
<p>Bhakti does not translate well. The Hindi mantra your grandmother chanted has a quality that an English version cannot replicate. The Tamil padam your family sings has notes that a Hindi translation misses. Devotional music needs to be in the language you pray in — the language in which God feels closest.</p>
<p>Melodia supports <strong>20+ Indian languages</strong> for devotional content — Hindi, Tamil, Telugu, Marathi, Punjabi, Gujarati, Bengali, Kannada, Malayalam, Odia, and more. Create your pooja bhajan in the language your family has always prayed in.</p>

<h2>Music Styles for Every Devotional Mood</h2>
<h3>Classical bhajan style</h3>
<p>Rooted in the tradition of Meerabai and Kabir. A slow, meditative track with a harmonium-like quality — the kind of music that settles the room into stillness before the deity.</p>
<h3>Aarti style</h3>
<p>Rhythmic, bright, and celebratory. The kind of music that lifts voices and moves hands in unison. Right for group poojas where the family gathers together.</p>
<h3>Kirtan style</h3>
<p>Call-and-response, repetitive, deeply immersive. A style that builds devotional energy in the room with each repetition of the deity's name.</p>
<h3>Folk devotional</h3>
<p>Rooted in regional tradition — the folk styles of Rajasthan, Maharashtra, Bengal, or whichever region your family comes from. A bhajan that sounds like it grew out of the same soil as your family's faith.</p>

<h2>Pricing</h2>
<p>Personalized devotional songs start at <strong>₹299</strong> on Melodia. The Starter package delivers a complete personalized bhajan with AI-generated lyrics and two music variants, instantly. The Creator package (₹599) adds music style selection and editing options. The Maestro package (₹999) pairs your prayers and your family's story with expert-crafted lyrics — the right choice for a bhajan meant to last generations.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include Sanskrit shlokas or mantras in the bhajan?</h3>
<p>Yes. If there is a specific mantra or shloka your family uses in your pooja, you can include it and the lyrics will be built around it.</p>
<h3>Can the bhajan include more than one deity?</h3>
<p>Yes. Many Indian homes worship multiple deities together — Lakshmi and Ganesha, Ram and Hanuman, the Panchdevata. You can specify all deities you want honoured in the song.</p>
<h3>Can I use this bhajan in a commercial mandir or event?</h3>
<p>Personal and family use is fully covered by all packages. For commercial or large-scale public use, contact Melodia to discuss licensing.</p>
<h3>Will the AI understand the religious nuances correctly?</h3>
<p>Melodia's system is trained on Indian devotional traditions and understands the correct forms of address for major deities, traditional song structures, and the specific vocabulary of bhakti poetry. You also review and approve all lyrics before music is generated.</p>
<p>Your pooja has always been personal. Now the music can be too. <a href="https://www.melodia-songs.com/pricing">Create your family's bhajan at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 2. Mata Ki Bhet for Navratri ───────────────────────────────────────────
  {
    title: 'Mata Ki Bhet: A Personalised Devotional Song for Navratri and Durga Puja',
    slug: 'custom-mata-ki-bhet-navratri-devotional-song',
    meta_description:
      'Offer a personalised Mata ki bhet this Navratri with a custom devotional song for Durga, Lakshmi, or Kali. Your family name, your prayers, your offering. From ₹299.',
    content: `
<h2>The Offering That Comes From Within</h2>
<p>Navratri is nine nights of complete devotion. The fasting, the garba, the jagrata, the aarti — all of it is directed toward Mata, in her nine forms, as a complete offering of the self. In this tradition, a bhet — a devoted offering to the goddess — is one of the highest expressions of bhakti. Flowers, prasad, cloth, and song have all been offered to Mata since the oldest kirtans were sung.</p>
<p>A personalised Mata ki bhet in the form of a song is one of the most intimate devotional offerings possible. It is not a generic bhajan downloaded from a playlist. It is a song that carries your name, your family's name, the name of your village or city, the specific form of Mata your family worships, and the prayers your household has carried to her for years. When played at the jagrata or during the aarti, it says to Mata: this song was made for you, by us, for what we have been through together.</p>

<h2>What to Offer in Your Mata Ki Bhet</h2>
<p>A personalised devotional song for Navratri can hold everything you would want to say to Mata if you could compose the words yourself. Through Melodia's form, you can include:</p>
<ul>
<li>The form of Mata your family worships — Durga, Vaishno Devi, Sheranwali, Chamundeshwari, Ambaji, Kali, or any of her nine Navratri forms</li>
<li>Your family name and the city or dham where your kuldevi resides</li>
<li>How many years your family has observed Navratri and what the fast means to your household</li>
<li>Prayers you bring to her this Navratri — for health, for a child, for success, for peace</li>
<li>Gratitude for something Mata gave you — a son who recovered, a daughter who cleared her exam, a business she protected</li>
<li>The names of family members who fast and who you want the song to honour</li>
<li>A message of complete surrender — the full expression of your bhakti in your own words</li>
</ul>
<p>The AI builds lyrics from these details. You review them before the music is generated. Nothing appears in your bhet that you have not approved.</p>

<h2>When and How to Use Your Personalised Navratri Bhajan</h2>
<h3>Jagrata</h3>
<p>A jagrata is the night vigil kept in Mata's honour. A personalized song played at the jagrata — especially one that carries the family name and specific prayers — becomes a devotional moment that guests and family members feel differently from a generic recording. When the lyrics mention your specific prayers and your family's relationship with Mata, the devotion in the room deepens.</p>
<h3>Ashtami or Navami aarti</h3>
<p>The eighth and ninth night of Navratri are the peak of the festival. Playing your personalised bhet as part of the aarti ceremony gives the occasion a solemnity and specificity that generic bhajans cannot match.</p>
<h3>Kanya Pujan</h3>
<p>During the kanya pujan — when young girls are worshipped as living forms of the goddess — a personalised song playing in the background transforms the ritual into something even more profound. The song says: we see the goddess in these children, and we have made music to prove it.</p>
<h3>Durga Puja pandal</h3>
<p>For Bengali families celebrating Durga Puja, a personalised song for your para's pandal or your home puja adds a dimension of community identity to the celebration. A song that mentions your family or locality within the larger devotion to Durga is a unique offering.</p>

<h2>The Nine Forms of Mata, in Music</h2>
<p>Each of Mata's nine Navratri forms — Shailaputri, Brahmacharini, Chandraghanta, Kushmanda, Skandamata, Katyayani, Kaalratri, Mahagauri, Siddhidatri — carries a different energy and a different prayer. If your family observes the nine-night tradition with a different emphasis each day, a personalised bhajan for a specific form adds devotional precision to your practice.</p>
<p>Tell Melodia which form you are honouring, what she represents to your family, and what you ask of her. The song will be built around that specific relationship.</p>

<h2>Language — The One That Holds Your Devotion</h2>
<p>Mata is worshipped in different languages across India. The Punjabi <em>sheranwali</em> devotions sound nothing like the Bengali <em>Durga stotram</em> or the Gujarati <em>Ambaji aarti</em>. Each tradition has its own sound, its own poetic vocabulary, its own way of addressing the goddess. Melodia supports <strong>20+ Indian languages</strong>. Your personalised Navratri bhajan can be in Hindi, Punjabi, Gujarati, Bengali, Tamil, Telugu, Marathi — whichever language your family chants in when Mata's name is on your lips.</p>

<h2>Devotional Music Styles for Navratri</h2>
<h3>Garba-inspired</h3>
<p>An energetic, rhythmic devotional track that carries the spirit of garba — music that moves the body and lifts the heart. Right for celebrations where dancing and movement are part of the worship.</p>
<h3>Traditional bhajan</h3>
<p>A classical devotional style that honours the structure of bhakti poetry. The kind of song that can be played at any point in the puja without breaking the sacred mood.</p>
<h3>Jagrata kirtan style</h3>
<p>A repetitive, building kirtan that gains intensity with each repetition. Right for the all-night vigil — music that sustains devotion through the hours of darkness before dawn.</p>
<h3>Stotra style</h3>
<p>A structured devotional composition that moves through Mata's attributes like a prayer. More meditative than celebratory — right for quiet, personal devotion.</p>

<h2>Pricing</h2>
<p>A personalised Mata ki bhet starts at <strong>₹299</strong> on Melodia. The Starter package delivers instantly with AI-generated lyrics and two music variants. The Creator package (₹599) adds music style selection and editing options. The Maestro package (₹999) pairs your devotional offering with expert-crafted lyrics — the right choice for a bhet meant to be played at a jagrata or a family's annual Navratri celebration.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include the Durga Chalisa or other traditional prayers?</h3>
<p>Yes. You can include traditional prayers, stotras, or specific verses from the Durga Saptashati, and the lyrics will incorporate or honour them in the song's structure.</p>
<h3>Can the song include the names of all family members who fast?</h3>
<p>Yes. If multiple family members observe the Navratri fast together, their names can all be included in the devotional offering.</p>
<h3>How quickly can the song be ready?</h3>
<p>Starter and Creator packages are instant. Maestro is delivered within 24 hours. If you are creating the song for an upcoming Navratri jagrata, plan one to two days ahead for best results.</p>
<h3>Can I request specific ragas or musical traditions?</h3>
<p>Yes. The Creator and Maestro packages allow you to specify musical preferences, including raga-based composition requests.</p>
<p>This Navratri, bring Mata an offering made from your own story. <a href="https://www.melodia-songs.com/pricing">Create your personalised bhet at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 3. Ganesh Chaturthi Custom Bhajan ──────────────────────────────────────
  {
    title: 'Custom Ganesh Bhajan for Ganesh Chaturthi: Make the Celebration Yours',
    slug: 'custom-ganesh-bhajan-for-ganesh-chaturthi',
    meta_description:
      'Create a custom Ganesh bhajan or aarti for Ganesh Chaturthi with your family name, your mohalla, and your love for Bappa. Personalized devotional music from ₹299.',
    content: `
<h2>Bappa Is Coming Home — Greet Him With a Song Only You Could Make</h2>
<p>Every year, across Maharashtra and beyond, millions of families bring Ganpati home for ten days. The idol arrives with flowers and dhol, is installed in the place of honour, and becomes the centre of the household for the duration of the festival. Morning aarti, evening aarti, modak offerings, visarjan — the same structure, year after year. But within that structure, every family's relationship with Bappa is completely its own.</p>
<p>Your family has its own way of talking to Ganpati. Its own history with him — the exams he helped with, the businesses he blessed, the illnesses from which you recovered. Its own name for him, its own specific form of the idol, its own style of celebration. A personalised Ganesh bhajan captures this. It is not just any aarti. It is yours: the song your family plays when Bappa comes home, that mentions the things only your family would know to mention.</p>

<h2>What to Put in Your Personalised Ganesh Bhajan</h2>
<p>The more specific the details you provide, the more the song sounds like it grew out of your family's specific relationship with Bappa. Consider including:</p>
<ul>
<li>Your family name — the surname Ganpati knows you by</li>
<li>Your neighbourhood or city — Ganpati of Dadar, Ganpati of Nagpur, Ganpati of the house on the third lane of your mohalla</li>
<li>How many years your family has been celebrating — "the forty-seventh year we have brought you home"</li>
<li>The specific form of Ganpati you install — Siddhivinayak, Ashtavinayak, Dwarkadhish Ganesh, or the style your family has used since your grandfather's time</li>
<li>What you pray to Bappa for this year — a child's education, a new venture, the health of an elder</li>
<li>Something Bappa helped with this past year — a gratitude woven into the song as an offering</li>
<li>Names of family members who are part of the celebration, especially elders or children</li>
<li>Your farewell prayer for visarjan day — the words you want to say as Bappa returns to the water</li>
</ul>
<p>Melodia's form guides you through these inputs. The AI builds the bhajan from them. You review and approve the lyrics before music is generated.</p>

<h2>Playing Your Custom Bhajan During the Festival</h2>
<h3>Sthapana — when Bappa arrives</h3>
<p>When the idol is installed in your home on Chaturthi day, play your personalised bhajan as the inaugural devotional act. The song with your family name welcoming Bappa into your home creates an opening to the festival that guests and family members will not forget.</p>
<h3>Morning and evening aarti</h3>
<p>Play the personalised bhajan as part of both daily aartis for the duration of the festival. As the family gathers morning and evening before Ganpati, the song that carries your family's name and prayers becomes part of the daily ritual.</p>
<h3>Visarjan</h3>
<p>The farewell to Bappa on the final day is one of the most emotionally charged moments of the Indian calendar. A personalised song for visarjan — one that holds your gratitude, your prayers, and your promise to welcome Bappa again next year — transforms the departure into a complete musical offering.</p>
<h3>Public mandal celebrations</h3>
<p>If your neighbourhood mandal celebrates Ganesh Chaturthi communally, a personalised song for the mandal — mentioning the street, the locality, and the collective prayers of the community — creates something that represents the entire group's devotion.</p>

<h2>The Different Moods of a Ganesh Bhajan</h2>
<h3>Celebratory and festive</h3>
<p>Dhol-inspired, bright, full of the energy of the festival. Music that gets the whole family singing and clapping during aarti. Bappa at the centre of a celebration he was always meant to lead.</p>
<h3>Traditional aarti style</h3>
<p>Rooted in the structure of Sukhkarta Dukhharta and other classic aarti forms. Meditative, rhythmic, appropriate for the twice-daily prayer that anchors the festival.</p>
<h3>Devotional kirtan</h3>
<p>A building, repetitive kirtan that cycles through the 108 names of Ganesha or a specific devotional theme. Music that sustains devotion across longer worship sessions.</p>
<h3>Tender and personal</h3>
<p>For the families whose relationship with Ganpati is deeply intimate — the households where the idol is a member of the family. A soft, personal song that speaks to Bappa the way you actually speak to him in your heart.</p>

<h2>In Marathi, or the Language of Your Home</h2>
<p>Ganesh Chaturthi is celebrated most fervently in Maharashtra, and a Marathi bhajan for Bappa carries a cultural weight that Hindi or English versions cannot quite replicate. The words of the Marathi devotional tradition — <em>Ganapati Bappa Morya, Mangalmurti Morya</em> — have their own cadence and their own magic. Melodia creates personalised Ganesh bhajans in <strong>Marathi, Hindi, Telugu, Kannada, Tamil, Gujarati</strong>, and 20+ other Indian languages. Choose the language your family shouts Bappa's name in.</p>

<h2>Pricing</h2>
<p>A personalised Ganesh bhajan starts at <strong>₹299</strong> on Melodia. The Starter package delivers instantly with AI-generated lyrics and two music variants. The Creator package (₹599) adds music style options and editing flexibility. The Maestro package (₹999) pairs your family's devotion with expert-crafted lyrics — the best choice for a song meant to anchor the celebration year after year.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I create a visarjan song separately from the welcome bhajan?</h3>
<p>Yes. You can create two separate songs — one for Ganpati's arrival and one for his departure. Many families find that the farewell song is the more emotionally significant one.</p>
<h3>Can the song work for all ten days of the festival?</h3>
<p>Yes. A general personalised Ganesh bhajan can be played throughout the festival. You can also create a specific song for each significant day if you want the full musical offering.</p>
<h3>Can I include Ganesh's different names and attributes?</h3>
<p>Yes. You can ask for specific names — Vighnaharta, Heramba, Lambodar, Ekdanta — and the lyrics will incorporate the attributes you care about most.</p>
<h3>Can our neighbourhood mandal order a song?</h3>
<p>Yes. A neighbourhood mandal is a valid customer. The personalisation can reference the street, the locality, the number of years the mandal has celebrated, and the collective prayers of the community.</p>
<p>Bappa deserves the best welcome your family can give. This Ganesh Chaturthi, make it musical, make it personal. <a href="https://www.melodia-songs.com/pricing">Create your family's Ganesh bhajan at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 4. Personalized Krishna Bhajan for Janmashtami ─────────────────────────
  {
    title: 'Personalized Krishna Bhajan for Janmashtami: Celebrate the Lord With Music Made for You',
    slug: 'personalized-krishna-bhajan-for-janmashtami',
    meta_description:
      'Create a custom Krishna bhajan for Janmashtami with your devotion, your family, and your love for Kanha. Personalized devotional songs in 20+ Indian languages from ₹299.',
    content: `
<h2>The Night Kanha Was Born — Celebrate It With a Song That Is Yours</h2>
<p>Janmashtami is the midnight when everything changes. The birth of Krishna — the divine child who would become the cowherd, the lover, the charioteer, the philosopher — is celebrated across India with fasting, prayer, devotional singing, and the joy of <em>dahi handi</em>. At midnight, when the conch shell blows and the idol of the infant Krishna is revealed, the bhakti in the room is unlike anything else in the Indian calendar.</p>
<p>In that moment, every devotee has their own relationship with Krishna. For some he is Kanha — the naughty child who steals butter and hearts in equal measure. For others he is Giridhari — the mountain-lifter, the protector. For others still he is the Gita's speaker — the voice that steadied Arjuna when the world fell apart. A personalised Krishna bhajan for Janmashtami honours your relationship with Krishna specifically, not a generic version of his story.</p>
<p>Melodia creates original devotional songs in 20+ Indian languages, built entirely around your family's love for the Lord.</p>

<h2>Which Krishna Lives in Your Heart?</h2>
<p>One of the most beautiful aspects of Krishna as a deity is that he appears differently to every devotee. When you create a personalised Janmashtami bhajan, you choose which aspect of Krishna to celebrate:</p>
<ul>
<li><strong>Bal Gopal / Kanha</strong> — the infant and child Krishna, the one who demands love and care, the one mothers and grandmothers feel most tenderly toward</li>
<li><strong>Radha-Krishna</strong> — the divine love that defines the Vrindavan tradition; for families whose devotion centres on the relationship between Radha and Shyam</li>
<li><strong>Govinda / Giridhari</strong> — the cowherd and protector, the Krishna of the Gokulashyami tradition celebrated with special fervour in Maharashtra and the south</li>
<li><strong>Dwarkadheesh</strong> — the king of Dwarka, worshipped in Gujarat and among Gujarati families worldwide</li>
<li><strong>Parthasarathi / Gita-speaker</strong> — the Krishna who gives counsel in crisis; for devotees who have found solace in the Bhagavad Gita during difficult times</li>
</ul>
<p>Tell Melodia which Krishna is yours. The song will be built around that relationship.</p>

<h2>What Your Personalised Janmashtami Bhajan Can Carry</h2>
<ul>
<li>The form of Krishna your family worships and the names you call him by</li>
<li>Your family name and the city or temple where you celebrate</li>
<li>How many years your family has observed Janmashtami and what the fast means to you</li>
<li>A specific prayer or wish you bring to Krishna this year</li>
<li>Gratitude for something Krishna protected or gifted — a recovery, a child, a moment of clarity in a difficult time</li>
<li>The names of devotees in your family — the grandmother who has fasted every Janmashtami for fifty years, the child who is celebrating their first</li>
<li>The midnight moment itself — the prayer your family says when the conch blows and the infant Krishna is revealed at twelve</li>
</ul>

<h2>Playing Your Song During the Janmashtami Celebration</h2>
<h3>During the midnight vigil</h3>
<p>The hours of fasting and waiting that lead to midnight are filled with kirtan and bhajan. Your personalised song — with your family's name and your prayers — played during this vigil adds a devotional layer that generic tracks cannot provide.</p>
<h3>At the janmotsav moment</h3>
<p>When the clock strikes midnight and Kanha is born, your personalised bhajan playing in the background of the puja transforms the revelation of the idol into a family-specific devotional moment.</p>
<h3>Jhulas and cradle ceremonies</h3>
<p>The ritual of swinging the infant Krishna in a <em>jhula</em> (cradle) is a tenderly personal act of worship. A lullaby-style personalised bhajan for the cradle — gentle, maternal, intimate — matches the mood of this ceremony perfectly.</p>
<h3>Dahi Handi</h3>
<p>For communities celebrating the more energetic Dahi Handi tradition, an upbeat, triumphant personalised song for the team or the <em>govinda</em> group adds a musical identity to the celebration.</p>

<h2>Devotional Moods for a Krishna Bhajan</h2>
<h3>Lullaby (sopana)</h3>
<p>A gentle, intimate song sung to the infant Kanha. Soft, maternal, full of the tenderness of a parent watching over a sleeping child — even if that child is God.</p>
<h3>Vrindavan kirtan</h3>
<p>A joyful, bhakti-filled kirtan in the Vrindavan tradition. Radha and Krishna at the centre, the <em>flute playing in the forest</em>, the gopas and gopis dancing. Music that lifts the festival atmosphere.</p>
<h3>Traditional bhajan</h3>
<p>In the style of Surdas or Mirabai — a classical devotional composition that honours the literary tradition of Krishna bhakti poetry while carrying your personal story within it.</p>
<h3>Devotional pop</h3>
<p>For the families that celebrate Janmashtami with full energy — a contemporary devotional track that carries the emotion of bhakti with the production quality of modern music. Celebratory, shareable, and deeply personal.</p>

<h2>In the Language Your Family Chants Krishna's Name</h2>
<p>Mathura says Radhe Radhe. Gujarat says Jai Shri Krishna. Maharashtra says Vitthal Vitthal. Tamil Nadu sings <em>Govinda Namalu</em>. Each tradition has its own sound for the same divine love. Melodia creates personalised Krishna bhajans in <strong>Hindi, Braj Bhasha, Gujarati, Marathi, Tamil, Telugu, Kannada, Bengali</strong>, and 20+ other Indian languages. Create the song in the language that carries your family's devotion to Krishna.</p>

<h2>Pricing</h2>
<p>A personalised Krishna bhajan starts at <strong>₹299</strong> on Melodia. The Starter package delivers instantly with AI-generated lyrics and two music variants. The Creator package (₹599) adds music style selection and editing options. The Maestro package (₹999) pairs your family's bhakti with expert-crafted lyrics — the right choice for a song meant to be played every Janmashtami for years to come.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include Radha in the bhajan alongside Krishna?</h3>
<p>Yes. Radha-Krishna devotional songs are a specific and beautiful tradition. You can request that the bhajan honours both together and the lyrics will reflect the rasaleela relationship.</p>
<h3>Can I request a song in Braj Bhasha?</h3>
<p>Yes. Braj Bhasha — the dialect of Vrindavan and Mathura, used in the classical poetry of Surdas and Nandadas — is a supported option for Krishna devotional music.</p>
<h3>Can the bhajan also work for other Krishna-related occasions like Holi or Govardhan Puja?</h3>
<p>Yes. A personalised Krishna bhajan can be crafted around any Krishna-related occasion. Simply specify the festival when filling in Melodia's form.</p>
<h3>Is the midnight vigil a good time to play a digital song?</h3>
<p>Many families now use Bluetooth speakers during the vigil. A digital personalised bhajan plays exactly as any other devotional music would — the difference is that this one was made for your family's specific relationship with Kanha.</p>
<p>This Janmashtami, let your devotion have its own music. <a href="https://www.melodia-songs.com/pricing">Create your personalised Krishna bhajan at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 5. Devotional Song for Temple Opening / Griha Pravesh ──────────────────
  {
    title: 'Devotional Song for Griha Pravesh and Temple Opening: Consecrate the Sacred Moment With Music',
    slug: 'devotional-song-for-griha-pravesh-temple-opening',
    meta_description:
      'Mark your griha pravesh or mandir inauguration with a personalised devotional song. Your home, your deity, your family. Custom AI music in 20+ Indian languages. From ₹299.',
    content: `
<h2>When a Place Becomes Sacred — Give It a Song</h2>
<p>A griha pravesh is not just a housewarming party. It is the moment a building becomes a home — the ceremony that invites divine blessing into the walls, that sanctifies the threshold, that says: this is where our family will live, grow, pray, and be safe. A mandir inauguration or temple opening is even more directly a sacred act — the installation of the divine in a specific, consecrated space.</p>
<p>Both moments carry a weight that few life events match. They happen once. After the ceremony, the space is changed — it holds a different meaning than it did the morning before. A personalised devotional song for these occasions is a way of giving the moment a sound that matches its significance. Not a generic devotional track from a playlist, but music that was made for this house, this family, this deity, on this specific day.</p>

<h2>Griha Pravesh: Inviting the Divine Into Your New Home</h2>
<p>The griha pravesh ceremony is one of the most emotionally layered moments in an Indian family's life. Decades of work, of saving, of dreaming — all of it arrives at the moment the family crosses the threshold for the first time with a full kalash and the name of God on their lips. There is gratitude in this moment, and also relief, and also a prayer that what is being built here will hold.</p>
<p>A personalised devotional song for griha pravesh can carry all of this. It can hold the name of the deity who will be worshipped in the home. It can name the family entering the home. It can express the specific prayers with which the family begins this new chapter — for the children who will grow up in these rooms, for the elders who will sit by these windows, for the love that will fill these walls. When this song plays as the family enters for the first time, the ceremony has a soundtrack that is entirely theirs.</p>

<h2>What to Include in Your Griha Pravesh Song</h2>
<ul>
<li>The names of the couple, family head, or family entering the home</li>
<li>The deity to be installed in the home's mandir — Lakshmi, Ganesha, Saraswati, the Kuldevi, or whoever your family first prays to in a new space</li>
<li>The city and ideally the neighbourhood where the home is located</li>
<li>Who built or made this home possible — a dedication to parents, to hard work, to God's grace</li>
<li>The prayers for this home — safety, prosperity, health, the growth of children, the peace of elders</li>
<li>Any specific milestone that makes this home particularly significant — a first home, a home built in the family's native place, a home near an elderly parent</li>
<li>Names of family members and elders whose blessings are part of this moment</li>
</ul>

<h2>Temple and Mandir Opening: Consecrating a Sacred Space</h2>
<p>When a family builds a mandir — even a home mandir, even a small space set aside for prayer — or when a community inaugurates a temple or prayer hall, the prana pratishtha ceremony establishes the deity's presence in that space permanently. From that moment forward, the space has a different energy. It has been given over to the divine.</p>
<p>A personalised devotional song for a temple or mandir opening honours this transition. It can carry:</p>
<ul>
<li>The name of the deity being installed and the full form in which they will reside</li>
<li>The name of the family or community who built or donated the mandir</li>
<li>The location — the city, the locality, the temple's name if it has one</li>
<li>The prayers with which this space is being consecrated — what is being asked of the deity who will dwell here</li>
<li>Gratitude to those who made the temple possible — donors, builders, the priest who performed the consecration</li>
<li>A prayer for all the devotees who will come to this space in the future</li>
</ul>
<p>A song created for a temple's opening becomes part of that temple's permanent music. It can be played at every subsequent anniversary of the inauguration. It becomes part of the identity of the space.</p>

<h2>How to Use Your Personalised Song in the Ceremony</h2>
<h3>Threshold moment</h3>
<p>For a griha pravesh, play the song at the moment the family crosses the threshold for the first time — as the kalash is carried in and the deity enters the home with the family. This is the peak moment of the ceremony, and a personalised song makes it unforgettable.</p>
<h3>Prana pratishtha</h3>
<p>For a temple or mandir opening, play the song during or immediately after the prana pratishtha — the moment the deity's energy is established in the idol. The song marks the exact moment the space becomes sacred.</p>
<h3>Played at every anniversary</h3>
<p>A personalised griha pravesh or temple opening song can be played every year on the anniversary of the occasion. Over time it becomes a tradition — the song the family plays to mark the day their home began.</p>
<h3>Shared with family and community</h3>
<p>For families scattered across cities, a personalised song for the griha pravesh can be shared on WhatsApp so relatives who could not attend in person can experience the ceremony through the music that was made for it.</p>

<h2>The Language of the Consecration</h2>
<p>Sacred rituals in India are performed in the language of the tradition — but the prayers and devotion around them happen in the language of the home. A Tam Brahm family performing a griha pravesh in Chennai has a different linguistic relationship with the ceremony than a Punjabi family in Delhi or a Gujarati family in Surat. Melodia creates personalised devotional songs in <strong>20+ Indian languages</strong> — Tamil, Telugu, Kannada, Hindi, Gujarati, Marathi, Punjabi, Bengali, and more. Choose the language in which your family has always spoken to God about the things that matter most.</p>

<h2>Musical Styles for Sacred Occasions</h2>
<h3>Classical Vedic-inspired</h3>
<p>A composition that draws on the soundscapes of classical Indian sacred music — meditative, structured, appropriate for the solemnity of a consecration ceremony.</p>
<h3>Traditional bhajan</h3>
<p>In the style of the great bhakti poets — a song that could sit alongside Kabir or Tukaram in the devotional tradition, while carrying your specific story within it.</p>
<h3>Devotional folk</h3>
<p>Rooted in the regional tradition your family comes from — the folk sacred music of Maharashtra, Rajasthan, Gujarat, or Tamil Nadu — music that sounds like it belongs to your land as well as your God.</p>
<h3>Contemporary devotional</h3>
<p>A modern devotional composition with full production quality — the kind of sacred music that could play in a contemporary temple or at a modern family ceremony without feeling out of place.</p>

<h2>Pricing</h2>
<p>Personalised devotional songs for griha pravesh and temple openings start at <strong>₹299</strong> on Melodia. The Starter package delivers instantly with AI-generated lyrics and two music variants. The Creator package (₹599) adds music style selection and editing options. The Maestro package (₹999) pairs the moment with expert-crafted lyrics — the right choice for an occasion that happens only once and deserves the very best musical offering.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include the pandit or priest's name in the song?</h3>
<p>Yes. If you want to honour the priest who performed the ceremony in the song's lyrics, that can be included.</p>
<h3>Can the song include Sanskrit shlokas alongside vernacular lyrics?</h3>
<p>Yes. Many devotional songs blend Sanskrit stotras with vernacular poetry. You can specify which Sanskrit prayers or mantras you want incorporated into the song's structure.</p>
<h3>Can the same song be used for both the griha pravesh and a housewarming party?</h3>
<p>Yes. A personalised devotional song for griha pravesh can serve both purposes — the sacred ceremony at the threshold and the celebration with guests that follows. The song bridges both moments.</p>
<h3>Can a temple trust commission a song for their temple?</h3>
<p>Yes. Melodia can create personalised devotional music for temple trusts, religious organisations, and community institutions. For institutional use, please use the Creator or Maestro package, and mention the institutional context in your form submission.</p>
<p>This moment happens once. Give it a song that says exactly what it should say. <a href="https://www.melodia-songs.com/pricing">Create your personalised devotional song at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },
];

async function main() {
  console.log(`Seeding ${posts.length} Indian devotional blog posts...`);
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
      published: true,
    });

    console.log(`  INSERTED: ${post.slug}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
