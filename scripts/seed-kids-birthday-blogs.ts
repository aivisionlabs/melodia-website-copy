/**
 * Seed: Inserts 5 kids birthday occasion blog posts.
 * Run: npx tsx -r dotenv/config scripts/seed-kids-birthday-blogs.ts dotenv_config_path=.env.local
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
  // ─── 1. General Kids Birthday ────────────────────────────────────────────────
  {
    title: 'Custom Birthday Song for Kids: Make Their Special Day Unforgettable',
    slug: 'custom-birthday-song-for-kids',
    meta_description:
      'Create a personalized birthday song for your child with their name, favourite things, and your love built in. Instant delivery in 20+ Indian languages. From ₹299.',
    content: `
<h2>A Birthday They Will Talk About All Year</h2>
<p>Every parent wants their child's birthday to feel magical. But the balloons deflate, the cake gets eaten, and by evening most gifts are already forgotten in a pile. What children actually remember is not the most expensive item in the room. It is the moment they felt completely seen — the moment a grown-up paid close enough attention to know exactly who they are.</p>
<p>A personalized birthday song does exactly this. It is a full audio track — original lyrics, original music, real vocals — built entirely around your child. Their name in the chorus. Their favourite things woven through the verses. Their personality on full display. Nothing else at the party will feel like it was made this specifically for them. Because nothing else was.</p>

<h2>What Goes Into a Birthday Song for a Child</h2>
<p>The power of a personalized song comes entirely from the details. The more specific you are, the more the song sounds like it was written by someone who knows your child deeply. Here is what you can include:</p>
<ul>
<li>Their full name and the nickname only the family uses</li>
<li>Their age and what feels exciting or new about turning that age</li>
<li>Their favourite cartoon, superhero, sport, or hobby</li>
<li>A silly habit or funny personality trait</li>
<li>Something they are really proud of this year — a skill they learned, something they did for the first time</li>
<li>What they want to be when they grow up</li>
<li>A message from the family — parents, grandparents, siblings, all together</li>
</ul>
<p>You do not need to write the song yourself. Melodia's form guides you through these details, and the AI builds the lyrics. You review them, request changes if needed, then approve. Music is generated and the file is yours to download and play.</p>

<h2>Why a Song Beats Every Other Birthday Gift</h2>
<p>Toys break. Clothes are outgrown in months. Gadgets become outdated. But a song with your child's name in it, describing who they are at this specific age, stays relevant in a way no physical gift can. At six they will love the song for the words. At sixteen they will love it for the nostalgia. At twenty-six they will play it and remember exactly how it felt to be celebrated by people who knew them before the world got complicated.</p>
<p>A custom birthday song is the gift that grows with the memory.</p>

<h2>Playing the Song at the Party</h2>
<p>A personalized song is also the world's most unique party moment. Here are a few ways to use it:</p>
<ul>
<li><strong>Cake entrance music:</strong> Replace the standard Happy Birthday tune with their custom song as the cake comes out. Watch their face when they hear their own name in the lyrics.</li>
<li><strong>Morning surprise:</strong> Play it when they wake up before the day officially begins. Start the birthday with something that is entirely about them.</li>
<li><strong>Video message:</strong> Record the child listening to their song for the first time and share it with family who cannot be there in person.</li>
<li><strong>Grandparents' gift:</strong> If grandparents are involved in creating it, the song becomes a gift from the whole family — something they can send from across the city or across the country.</li>
</ul>

<h2>Languages That Make the Song Feel Like Home</h2>
<p>Children in Indian families grow up in multiple languages. The language of their grandparents, the language of school, the language spoken at home after dinner. A birthday song in the language they associate with love and family carries a different emotional weight than one in English.</p>
<p>Melodia supports <strong>20+ Indian languages</strong> — Hindi, Tamil, Telugu, Marathi, Punjabi, Gujarati, Bengali, Kannada, Malayalam, and more. Choose the language your child hears at home when something important is being said.</p>

<h2>The Right Song Style for Every Child</h2>
<h3>Energetic and fun</h3>
<p>For the child who cannot sit still. A pop or dance track with their name in a big, singable chorus. The song they will ask to play on repeat for a week.</p>
<h3>Warm and loving</h3>
<p>For a sentimental family moment — a softer track that tells the story of who they are and how much they are loved. Tissues optional but likely.</p>
<h3>Adventure theme</h3>
<p>For the kid who loves superheroes, space, or dinosaurs. A song that puts them at the centre of their favourite kind of story.</p>

<h2>Packages and Pricing</h2>
<p>Melodia's Starter package begins at <strong>₹299</strong> and delivers a complete personalized song with AI-generated lyrics and two music variants, instantly. The Creator package (₹599) adds editing flexibility and music style selection. The Maestro package (₹999) pairs your child's story with expert-crafted lyrics and the highest quality output — a good choice for milestone birthdays.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include multiple children's names in one song?</h3>
<p>Yes. If twins are celebrating together, or if siblings want to be included, you can add multiple names and the AI will incorporate them into the lyrics.</p>
<h3>What age group works best for this?</h3>
<p>Any age. Toddlers love hearing their name in a song. School-age children love hearing their specific interests referenced. Teenagers love the uniqueness of something made just for them. There is no wrong age for a personalized birthday song.</p>
<h3>How long is the song?</h3>
<p>Typically 2 to 3 minutes — a full track with instrumentation, vocals, and lyrics. Long enough to feel like a real song, short enough to play at a party without losing the room.</p>
<h3>Can I download and share the song?</h3>
<p>Yes. All packages include a downloadable MP3 file you can share on WhatsApp, play on speakers, or post to family groups.</p>
<p>This birthday, give them a moment they will never forget. <a href="https://www.melodia-songs.com/pricing">Create their song at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 2. First Birthday ───────────────────────────────────────────────────────
  {
    title: "First Birthday Song for Baby: Celebrate One Year of Pure Joy",
    slug: 'first-birthday-song-for-baby',
    meta_description:
      "Mark your baby's first birthday with a personalized song that captures this once-in-a-lifetime milestone. Their name, their story, your love. From ₹299 on Melodia.",
    content: `
<h2>The Birthday That Only Happens Once</h2>
<p>A first birthday is not really a party for the baby. The baby will not remember it. The balloons, the smash cake, the relatives crowded into the living room — all of this is for the parents. It is the day you mark one full year of a love you never knew you were capable of. A year of feeding and worrying and not sleeping and watching a tiny human become a person. A year that changed you permanently.</p>
<p>A personalized song for your baby's first birthday is not just a gift for them. It is a record for you — a piece of music that captures who they are at exactly one year old, and who you are as their parent, on the day you stopped to say: this happened, and it was everything.</p>

<h2>What to Capture in a First Birthday Song</h2>
<p>A first birthday song is unlike any other birthday song because the child's story is still being written in real time. Here is what makes it special:</p>
<ul>
<li>Their name — the full name and the nickname that emerged in those first weeks</li>
<li>The date they arrived and any detail of that day that stays with you</li>
<li>Something they did in their first year that surprised you — the first smile, the first time they sat up, the first laugh that stopped everything</li>
<li>What they love most right now — a toy, a sound, a person, a face they light up for</li>
<li>Something you want them to know about this year, from you, for when they are old enough to hear it</li>
<li>A message from both parents — or from the whole family — about what this year has meant</li>
</ul>
<p>These details make the song a time capsule. Play it on their first birthday. Play it on their tenth. Play it on their wedding day. It will hold everything the photographs cannot.</p>

<h2>Why a Personalized Song Is the Right Gift for a First Birthday</h2>
<p>Most first birthday gifts are toys the baby is not ready for yet, or clothes they will outgrow by the next month. A personalized song does not expire. It cannot be outgrown. It does not require batteries or break if dropped. It simply exists — a piece of music that says: you were here, you were loved, you changed us, and we wanted to mark that in a way that lasts.</p>
<p>It is also the kind of gift that other families do not give. At a first birthday party, every gift is similar. A personalized song is the only one no one else thought to bring.</p>

<h2>A Song From the Parents, or From Everyone</h2>
<p>You can frame the song however feels right:</p>
<ul>
<li><strong>From both parents to their child</strong> — a letter in music form from the two people who spent every day of this year watching them grow</li>
<li><strong>From the whole family</strong> — include grandparents, aunts, uncles, older siblings by name; make it a family message</li>
<li><strong>A song about the year</strong> — not addressed to anyone in particular, but a musical portrait of who this baby is and what this year contained</li>
</ul>
<p>There is no wrong approach. The song becomes what you make it.</p>

<h2>Choosing the Right Mood</h2>
<h3>Joyful and celebratory</h3>
<p>An upbeat track that matches the energy of the party. Something to play when the cake comes out — happy, bright, full of the baby's name sung out loud.</p>
<h3>Soft and tender</h3>
<p>For the parents who want to cry, happily, at their child's first birthday. A gentle ballad that holds the full weight of what this year has meant.</p>
<h3>Lullaby-inspired</h3>
<p>A song that fits the sleepy, sacred hours of early parenthood. Something that sounds like a bedtime story set to music.</p>

<h2>In the Language of Home</h2>
<p>Your baby's first year happened in a specific language — the language you used in the dark at 3am, the language your mother sang over them, the language you whispered when you were scared and when you were amazed. Melodia supports <strong>20+ Indian languages</strong>. Hindi, Tamil, Telugu, Punjabi, Marathi, Gujarati, Bengali, and more. Choose the language this child was welcomed into the world in.</p>

<h2>Pricing</h2>
<p>A first birthday song starts at <strong>₹299</strong> on Melodia. Starter delivers instantly with AI lyrics and two music variants. Creator (₹599) adds editing options and music style selection. Maestro (₹999) pairs the story with expert-crafted lyrics — a worthy choice for a milestone this significant.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include the birth story in the song?</h3>
<p>Yes. You can include details from the delivery, the first moments, the early weeks — as much or as little of the birth story as you want the song to hold.</p>
<h3>Can grandparents be mentioned by name?</h3>
<p>Yes. You can name specific family members, their relationships to the baby, and include them in the song's message.</p>
<h3>Will the song still make sense when the baby is older?</h3>
<p>Yes. A well-written first birthday song is a portrait of a specific moment in time. When played years later, it works as a window back into who they were at one — which becomes more meaningful, not less, with time.</p>
<h3>How quickly can I have the song ready?</h3>
<p>Starter and Creator packages are instant. From filling in the form to downloading the song: under 20 minutes. Maestro is ready within 24 hours.</p>
<p>One year ago, everything changed. Make sure there is a song that says so. <a href="https://www.melodia-songs.com/pricing">Create your baby's first birthday song at Melodia</a>.</p>
`.trim(),
  },

  // ─── 3. Birthday Song for Daughter ──────────────────────────────────────────
  {
    title: "Personalized Birthday Song for Your Daughter: A Gift That Sings Her Story",
    slug: 'personalized-birthday-song-for-daughter',
    meta_description:
      "Give your daughter a birthday she will remember forever with a custom song made just for her. Her name, her personality, her language. From ₹299 on Melodia.",
    content: `
<h2>She Deserves a Birthday That Feels Like Her</h2>
<p>Your daughter is not like any other child. She has her specific interests, her specific way of laughing, the things she says that the whole family repeats, the way she gets completely absorbed in whatever she loves. She is already her own person, in ways that are surprising and delightful every single day.</p>
<p>A generic birthday gift cannot capture any of this. A personalized birthday song can. It puts her name in the lyrics. It describes who she actually is — not a generic version of a seven-year-old or a ten-year-old, but her. When she hears it for the first time, she will know immediately that this was made for her and no one else.</p>

<h2>What Makes a Birthday Song for a Daughter Feel Truly Personal</h2>
<p>The details you provide are what transform the song from pleasant to unforgettable. Consider including:</p>
<ul>
<li>Her name — and any nickname that belongs only to your family</li>
<li>Her age and what changed this year — a new school, a new skill, a big moment</li>
<li>What she is passionate about right now — dance, drawing, books, animals, sport, music</li>
<li>A personality trait that defines her — her kindness, her boldness, her curiosity, her silliness</li>
<li>Something she did recently that made you proud, even if it was small</li>
<li>What you love most about who she is becoming</li>
<li>A message from you — or from the whole family — about who she is and how loved she is</li>
</ul>
<p>You provide these details through Melodia's simple form. The AI shapes them into lyrics. You review, adjust if needed, and approve before the music is generated.</p>

<h2>Moments That Make This Gift Land</h2>
<h3>The morning of her birthday</h3>
<p>Play the song before she is fully awake. Let it be the first thing she hears on her birthday — her own name, her own story, in music. Nothing starts a birthday like this.</p>
<h3>During the cake moment</h3>
<p>Instead of the traditional Happy Birthday, play her custom song as the cake comes out. Every person in the room will understand immediately that this birthday is different.</p>
<h3>A gift she can keep</h3>
<p>The MP3 file lives on her phone or her parents' phone forever. She can play it in a year, in five years, in twenty years. It grows with her in the way only something made specifically about her can.</p>

<h2>Choosing a Mood That Fits Her</h2>
<h3>Energetic and fun</h3>
<p>For the daughter who never stops moving. A pop track with a big chorus she can dance to. Something she demands on repeat at the party.</p>
<h3>Dreamy and imaginative</h3>
<p>For the creative child who loves stories and fantasy. A song that puts her at the centre of an adventure or a world she has imagined.</p>
<h3>Warm and sentimental</h3>
<p>For the family that wants to mark how much she has grown. A song that says, honestly and with music behind it, how much she means to the people who love her.</p>
<h3>Funny and playful</h3>
<p>For the daughter who loves a joke and would rather laugh than cry. A song that celebrates her quirks and makes the whole room laugh with her.</p>

<h2>In a Language She Grows Up With</h2>
<p>If she hears Hindi at home and English at school, a birthday song in Hindi will reach her differently. If Tamil is the language of her grandparents and her earliest memories, a Tamil song carries emotional weight that English cannot. Melodia supports <strong>20+ Indian languages</strong> including Hindi, Tamil, Telugu, Marathi, Punjabi, Gujarati, and Bengali. Choose the language your daughter associates with being celebrated by the people who know her best.</p>

<h2>A Gift From the Whole Family</h2>
<p>A personalized song can come from just her parents, or from everyone — grandparents, uncles, aunts, cousins. You can name specific people in the lyrics. You can make it a collective message from her whole world. The song becomes more powerful as a shared creation: something the whole family contributed to, that she carries as evidence of how many people love her.</p>

<h2>Pricing</h2>
<p>Birthday songs start at <strong>₹299</strong> on Melodia. The Starter package is instant — AI lyrics, two music variants, download included. Creator (₹599) adds editing options and music style selection. Maestro (₹999) pairs the story with expert-crafted lyrics for the highest quality result.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include her best friend or sibling in the song?</h3>
<p>Yes. You can name other people who are important to her and include them in the narrative. The song can acknowledge her whole world, not just her parents' feelings about her.</p>
<h3>What if she is shy about attention?</h3>
<p>You can choose a softer, less "spotlight on me" approach — a warm song that acknowledges her without making her feel put on the spot. The tone is always yours to set.</p>
<h3>Can I specify what music style the song uses?</h3>
<p>Yes. The Creator and Maestro packages let you choose a music style — pop, classical, Bollywood-inspired, folk, hip-hop, and more.</p>
<h3>Is the song hers to keep forever?</h3>
<p>Yes. All packages include a downloadable MP3 file with no expiry. She keeps it for life.</p>
<p>She is one of a kind. Give her the gift that proves it. <a href="https://www.melodia-songs.com/pricing">Create her birthday song at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 4. Birthday Song for Son ────────────────────────────────────────────────
  {
    title: "Personalized Birthday Song for Your Son: Make His Birthday Truly His Own",
    slug: 'personalized-birthday-song-for-son',
    meta_description:
      "Create a unique birthday song for your son with his name, interests, and your love built in. Instant delivery in 20+ Indian languages. From ₹299 on Melodia.",
    content: `
<h2>A Birthday Gift That Knows Who He Is</h2>
<p>Most birthday gifts for boys are variations on the same themes. A toy tied to whatever he is currently obsessed with. A sports kit. A video game. These are fine gifts, and he will enjoy them. But they are replaceable. When this phase of his interests passes, the gift becomes a relic of who he used to be — not who he is becoming.</p>
<p>A personalized birthday song does not work this way. It captures who he is specifically at this birthday, in this year, with the details that only someone who knows him well could include. It is not tied to a trend. It is tied to him. That means it does not date the way toys do. It becomes more meaningful with time, not less.</p>

<h2>What to Put in a Birthday Song for Your Son</h2>
<p>The more specific the details, the more the song sounds like it was written for him personally. Here is what to think about:</p>
<ul>
<li>His name — full name and whatever you actually call him at home</li>
<li>His age and what he is proud of this year — a sport he improved at, something he built or learned or overcame</li>
<li>What he loves right now — cricket, coding, cars, Marvel, history, cooking, anything he is currently passionate about</li>
<li>A personality trait that defines him — his competitiveness, his loyalty, his humour, his kindness, his stubbornness</li>
<li>A memory from this past year that stands out</li>
<li>Something you want him to know about who he is and who he is becoming</li>
<li>A message from the family — parents, grandparents, siblings — all woven together</li>
</ul>
<p>These details go into Melodia's form, and the AI builds the lyrics from them. You review, can request adjustments, and approve before the music is generated.</p>

<h2>How to Use the Song on His Birthday</h2>
<p>The song is most effective when the reveal feels deliberate:</p>
<ul>
<li><strong>Cake moment:</strong> Play it instead of the standard Happy Birthday as the cake is carried in. When he hears his own name and his own interests in the opening lines, the look on his face is worth every rupee.</li>
<li><strong>First thing in the morning:</strong> Play it when he wakes up, before anyone else is awake. Let the first experience of his birthday be a song made just for him.</li>
<li><strong>After the party:</strong> Once the guests are gone and the family is together, play it again. Late-night birthday moments with family often hit deeper than the party itself.</li>
<li><strong>Send to extended family:</strong> Share the song on the family WhatsApp group. Let grandparents and cousins who could not be there hear what you made for him.</li>
</ul>

<h2>Mood Options for Every Kind of Boy</h2>
<h3>High-energy and hype</h3>
<p>For the boy who lives loud. An upbeat track with a chorus he can shout along to. Something that sounds like a sports montage — triumphant, confident, made for him.</p>
<h3>Adventure and hero</h3>
<p>For the kid who loves action, space, or superheroes. A song that puts him at the centre of an epic story and celebrates his courage and imagination.</p>
<h3>Warm and sincere</h3>
<p>For the families who want to say something real on his birthday. A song that tells him, in honest language, what he means to the people who know him best.</p>
<h3>Funny and playful</h3>
<p>For the boy who would rather be roasted than serenaded. A song that lovingly teases his habits and quirks, that makes him laugh out loud and ask to hear it again immediately.</p>

<h2>In the Language He Hears at Home</h2>
<p>Hindi, Tamil, Telugu, Marathi, Punjabi — whatever language fills your home when life is happening normally, a birthday song in that language lands with a different kind of warmth. It is not translated love. It is love in its original form. Melodia supports <strong>20+ Indian languages</strong>. Choose the one that your son associates with being safe and celebrated.</p>

<h2>A Gift He Can Return to for Years</h2>
<p>Boys often do not know what to do with sentimentality. But they remember it. A song made for him at seven, played again when he is seventeen, or twenty-seven, carries a weight that no toy or gadget can approximate. It says: someone took the time to describe exactly who you were. That matters to a person at every age, even if they cannot always say so.</p>

<h2>Pricing</h2>
<p>Birthday songs start at <strong>₹299</strong> on Melodia. The Starter package delivers instantly — AI lyrics, two music variants, download ready. Creator (₹599) adds editing flexibility and music style selection. Maestro (₹999) pairs the story with expert-crafted lyrics for the best possible output.</p>

<h2>Frequently Asked Questions</h2>
<h3>Can I include his favourite sport or team?</h3>
<p>Yes. You can include his sport, his position, his team, and any specific achievement. The more specific the detail, the more the song sounds like it was made by someone who really knows him.</p>
<h3>What if he is not the sentimental type?</h3>
<p>A funny, upbeat, or hype track is absolutely an option. The mood is entirely your choice. Personalization does not have to mean emotional — it means specific and true to who he is.</p>
<h3>Can I create the song with him, so it is a shared activity?</h3>
<p>Yes. Some families sit with the child and fill in the form together, making the creation of the song part of the birthday experience. The child helps choose the details and hears the result as a genuine surprise.</p>
<h3>Can grandparents be named in the song?</h3>
<p>Yes. You can include specific family members and their messages within the song's narrative.</p>
<p>He is one of a kind. Give him a birthday that proves it. <a href="https://www.melodia-songs.com/pricing">Create his birthday song at Melodia</a> — starting at ₹299.</p>
`.trim(),
  },

  // ─── 5. Kids Birthday Song in Hindi ─────────────────────────────────────────
  {
    title: 'बच्चों के लिए जन्मदिन का गाना: हिंदी में बनाएं एक खास पर्सनलाइज्ड सॉन्ग',
    slug: 'birthday-song-for-kids-in-hindi',
    meta_description:
      'अपने बच्चे के जन्मदिन के लिए हिंदी में एक पर्सनलाइज्ड गाना बनाएं। उनका नाम, उनकी कहानी, आपका प्यार — सब एक गाने में। सिर्फ ₹299 से।',
    content: `
<h2>जन्मदिन पर एक गाना जो सिर्फ उनका हो</h2>
<p>हर साल जन्मदिन आता है और हम सोचते हैं — इस बार कुछ अलग करें। केक, गुब्बारे, तोहफे — ये सब होते हैं, लेकिन कुछ ऐसा जो बच्चा हमेशा याद रखे, वो कम ही होता है।</p>
<p>एक पर्सनलाइज्ड गाना — जो सिर्फ आपके बच्चे के लिए बना हो, उनके नाम से, उनकी पसंद से, उनकी कहानी से — वो बाकी सब तोहफों से अलग होता है। जब बच्चा पहली बार सुनता है कि गाने में उसका नाम आ रहा है, उसकी पसंदीदा चीज़ें आ रही हैं — वो पल किसी और चीज़ से नहीं बदला जा सकता।</p>

<h2>हिंदी में क्यों बनाएं जन्मदिन का गाना?</h2>
<p>"Happy Birthday to You" एक अच्छा गाना है — लेकिन यह हर बच्चे के लिए एक जैसा है। जब गाना हिंदी में हो, आपके घर की भाषा में हो, तो उसका असर बिल्कुल अलग होता है।</p>
<p>वो भाषा जिसमें बच्चे को डांट पड़ती है, जिसमें लोरी सुनाई जाती है, जिसमें दादी-नानी प्यार जताती हैं — उसी भाषा में जन्मदिन का गाना सुनना बच्चे के लिए एक अलग ही खुशी है। यह सिर्फ शब्दों का नहीं, यादों और रिश्तों का गाना बन जाता है।</p>

<h2>गाने में क्या शामिल करें?</h2>
<p>जितना खास input, उतना खास गाना। आप इन चीज़ों को शामिल कर सकते हैं:</p>
<ul>
<li>बच्चे का नाम — और जो प्यार का नाम घर में बुलाते हैं</li>
<li>उनकी उम्र और इस साल कुछ खास जो उन्होंने सीखा या किया</li>
<li>उनकी पसंदीदा चीज़ — खेल, कार्टून, सुपरहीरो, जानवर, मिठाई</li>
<li>कोई मज़ेदार आदत जो सिर्फ आपके बच्चे की है</li>
<li>माँ, पापा, दादा-दादी, नाना-नानी या भाई-बहन का प्यार भरा संदेश</li>
<li>कुछ जो आप उन्हें बताना चाहते हैं — उनकी ख़ूबियाँ, उनसे उम्मीदें, आपका प्यार</li>
</ul>
<p>Melodia का form भरना बेहद आसान है। AI आपकी बातों से lyrics बनाता है — हिंदी में। आप देख सकते हैं, बदल सकते हैं, और approve करने के बाद पूरा गाना तैयार हो जाता है।</p>

<h2>गाना कैसे सुनाएं — पार्टी को यादगार बनाएं</h2>
<ul>
<li><strong>केक लाते वक्त:</strong> Happy Birthday की जगह पर्सनलाइज्ड गाना बजाएं। जब बच्चा पहली बार सुनेगा कि गाने में उसका नाम है — उस पल की खुशी देखते बनती है।</li>
<li><strong>सुबह उठते ही:</strong> जन्मदिन की सुबह गाना बजाएं — पहले पल से दिन खास शुरू होगा।</li>
<li><strong>WhatsApp पर भेजें:</strong> जो रिश्तेदार नहीं आ सके, उन्हें गाना भेजें। दादा-दादी, नाना-नानी, फुफू, मामा — सब बच्चे का गाना सुनकर खुश हों।</li>
<li><strong>हमेशा के लिए save करें:</strong> गाना MP3 में download होता है — बच्चे के phone में save रहेगा, सालों तक याद दिलाएगा।</li>
</ul>

<h2>गाने का mood चुनें</h2>
<h3>मस्ती और धमाल वाला</h3>
<p>जो बच्चे चुप नहीं बैठते, उनके लिए एक energetic, dance track — जिसे सुनकर पाँव थिरक उठें।</p>
<h3>प्यार भरा और भावुक</h3>
<p>जब माँ-बाप की आँखें भर आएं — एक soft, emotional गाना जो बच्चे को बताए कि वो कितना प्यारा है।</p>
<h3>Adventure और हीरो</h3>
<p>जो बच्चे सुपरहीरो या अंतरिक्ष यात्री बनना चाहते हैं — उनके लिए एक ऐसा गाना जो उन्हें कहानी का हीरो बनाए।</p>
<h3>हँसाने वाला</h3>
<p>बच्चे की मज़ेदार आदतों पर based एक funny गाना — जिसे सुनकर पूरा परिवार हँसे और बच्चा भी बार-बार सुनने को कहे।</p>

<h2>20+ भारतीय भाषाओं में उपलब्ध</h2>
<p>Melodia सिर्फ हिंदी तक सीमित नहीं है। अगर आपके घर में तमिल, तेलुगु, मराठी, पंजाबी, गुजराती, बंगाली, कन्नड़, मलयालम या कोई और भाषा बोली जाती है — तो उसी भाषा में गाना बनाएं। <strong>20+ भारतीय भाषाओं</strong> में support मिलता है।</p>

<h2>कीमत और packages</h2>
<p>Melodia पर पर्सनलाइज्ड गाना बनाना सिर्फ <strong>₹299 से शुरू</strong> होता है। Starter package में AI lyrics, 2 music variants और instant download शामिल है। Creator (₹599) में ज़्यादा editing options और music style चुनने की सुविधा है। Maestro (₹999) में expert-crafted lyrics और 24 घंटे में best quality delivery मिलती है।</p>

<h2>अक्सर पूछे जाने वाले सवाल</h2>
<h3>क्या गाना सच में हिंदी में होगा?</h3>
<p>हाँ। आप भाषा select करते हैं, और lyrics पूरी तरह हिंदी में बनते हैं — music और vocals भी उसी mood में।</p>
<h3>क्या मुझे कुछ लिखना होगा?</h3>
<p>नहीं। सिर्फ form में बच्चे की details भरें — नाम, उम्र, पसंद, कुछ यादें। बाकी AI करता है।</p>
<h3>गाना कितनी जल्दी मिलेगा?</h3>
<p>Starter और Creator packages instant हैं — कुछ मिनटों में गाना तैयार। Maestro 24 घंटे में।</p>
<h3>क्या दादा-दादी का नाम भी गाने में शामिल हो सकता है?</h3>
<p>हाँ। आप चाहें जितने परिवारवालों का नाम और संदेश गाने में शामिल करवा सकते हैं।</p>
<h3>क्या lyrics पहले दिख सकते हैं?</h3>
<p>हाँ। Lyrics generate होने के बाद आप देख सकते हैं, बदल सकते हैं, या नया version माँग सकते हैं। Music तभी बनेगा जब आप approve करेंगे।</p>
<p>इस जन्मदिन पर बच्चे को कुछ ऐसा दें जो सिर्फ उनका हो। <a href="https://www.melodia-songs.com/pricing">Melodia पर अभी बनाएं</a> — सिर्फ ₹299 से शुरू।</p>
`.trim(),
  },
];

async function main() {
  console.log(`Seeding ${posts.length} kids birthday blog posts...`);
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
