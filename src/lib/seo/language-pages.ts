export type LanguagePageData = {
  slug: string;
  name: string;
  nativeName: string;
  introHeading: string;
  introContent: string;
  popularOccasions: string[];
  samplePhrases: { occasion: string; phrase: string }[];
};

export const LANGUAGE_PAGES: LanguagePageData[] = [
  {
    slug: "hindi",
    name: "Hindi",
    nativeName: "हिन्दी",
    introHeading: "Personalized Songs in Hindi",
    introContent:
      "Hindi is the most popular language for personalized songs on Melodia. Whether you want a romantic Bollywood-style love ballad, a fun birthday anthem, or an emotional wedding Sangeet number, Melodia creates custom Hindi songs that sound like they were written by a professional Bollywood lyricist. Our AI understands Hindi poetic conventions, emotional expressions, and cultural nuances, crafting lyrics in Shudh Hindi, Hinglish (Hindi-English blend), or colloquial Hindi based on your preference. Thousands of users across India create personalized Hindi songs on Melodia for weddings, birthdays, anniversaries, festivals like Diwali and Holi, and every special occasion. Starting at INR 199 with instant delivery.",
    popularOccasions: ["weddings", "birthday", "anniversary", "romantic", "sangeet", "haldi", "festive-holiday", "devotional-spiritual"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janamdin Mubarak" },
      { occasion: "Wedding", phrase: "Shaadi Mubarak" },
      { occasion: "Anniversary", phrase: "Salgirah Mubarak" },
    ],
  },
  {
    slug: "tamil",
    name: "Tamil",
    nativeName: "தமிழ்",
    introHeading: "Personalized Songs in Tamil",
    introContent:
      "Create beautiful personalized songs in Tamil on Melodia. Tamil has a rich musical and poetic tradition, and Melodia's AI captures this beauty in every custom song it creates. Whether you want a wedding song for a Tamil Kalyanam, a birthday song (Pirandha Naal Vazhthukkal), or a devotional song for a temple ceremony, Melodia crafts authentic Tamil lyrics produced with professional vocals and music. Tamil songs on Melodia honor the language's literary depth while remaining natural and emotionally resonant. Create songs in pure Tamil or Tamil-English blend for any occasion. Popular across Tamil Nadu and among Tamil-speaking communities worldwide. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "anniversary", "devotional-spiritual", "parents", "festive-holiday"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Pirandha Naal Vazhthukkal" },
      { occasion: "Wedding", phrase: "Thirumanam Vazhthukkal" },
      { occasion: "Festival", phrase: "Pongal Vazhthukkal" },
    ],
  },
  {
    slug: "telugu",
    name: "Telugu",
    nativeName: "తెలుగు",
    introHeading: "Personalized Songs in Telugu",
    introContent:
      "Melodia creates personalized songs in Telugu for all occasions — weddings (Pelli Paatalu), birthdays (Puttina Roju Subhakankshalu), anniversaries, festivals like Sankranti, and family celebrations. Telugu is known as the 'Italian of the East' for its melodic quality, and Melodia's AI captures this sweetness in every custom Telugu song. Create songs in pure Telugu or Telugu-English blend with professional vocals and music production. Telugu personalized songs are popular across Andhra Pradesh, Telangana, and among Telugu-speaking communities everywhere. Starting at INR 199 with instant delivery.",
    popularOccasions: ["weddings", "birthday", "anniversary", "devotional-spiritual", "festive-holiday", "parents"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Puttina Roju Subhakankshalu" },
      { occasion: "Wedding", phrase: "Pelli Subhakankshalu" },
      { occasion: "Festival", phrase: "Sankranti Subhakankshalu" },
    ],
  },
  {
    slug: "kannada",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    introHeading: "Personalized Songs in Kannada",
    introContent:
      "Create personalized songs in Kannada on Melodia for birthdays, weddings, anniversaries, festivals, and family celebrations. Kannada has a beautiful literary tradition, and Melodia's AI crafts lyrics that honor this cultural richness while remaining emotionally authentic. Whether you want a wedding song for a Karnataka-style celebration, a birthday anthem in Kannada, or a devotional song, Melodia delivers studio-quality personalized music. Songs are available in pure Kannada or Kannada-English blend. Popular across Karnataka and among Kannada-speaking communities. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "anniversary", "devotional-spiritual", "festive-holiday"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Huttuhabbada Shubhashayagalu" },
      { occasion: "Wedding", phrase: "Maduve Shubhashayagalu" },
    ],
  },
  {
    slug: "malayalam",
    name: "Malayalam",
    nativeName: "മലയാളം",
    introHeading: "Personalized Songs in Malayalam",
    introContent:
      "Melodia creates personalized songs in Malayalam for Onam celebrations, weddings, birthdays, anniversaries, and all special occasions. Malayalam is known for its melodic quality and rich cultural heritage, and Melodia captures this beauty in every custom song. Whether you want a festive Onam song, a romantic wedding song, or a heartfelt birthday tribute in Malayalam, our AI crafts authentic lyrics produced with professional vocals and music. Popular across Kerala and among Malayali communities worldwide. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "anniversary", "festive-holiday", "devotional-spiritual", "parents"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janmadinasamsakal" },
      { occasion: "Festival", phrase: "Onashamsakal" },
    ],
  },
  {
    slug: "bengali",
    name: "Bengali",
    nativeName: "বাংলা",
    introHeading: "Personalized Songs in Bengali",
    introContent:
      "Bengali has one of the richest poetic and musical traditions in India, and Melodia captures this literary beauty in every personalized Bengali song. Create custom songs in Bengali for Durga Puja celebrations, weddings, birthdays (Janmadiner Shubhechha), anniversaries, and family occasions. Melodia's AI understands Bengali emotional expressions and poetic conventions, creating lyrics that feel naturally Bengali while being deeply personal. Perfect for Rabindra-sangeet style compositions, modern Bengali pop, or traditional folk-style songs. Popular across West Bengal, Tripura, and among Bengali communities worldwide. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "anniversary", "festive-holiday", "devotional-spiritual", "parents"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janmadiner Shubhechha" },
      { occasion: "Festival", phrase: "Shubho Bijoya" },
      { occasion: "Wedding", phrase: "Shubho Bibaho" },
    ],
  },
  {
    slug: "marathi",
    name: "Marathi",
    nativeName: "मराठी",
    introHeading: "Personalized Songs in Marathi",
    introContent:
      "Create personalized songs in Marathi on Melodia for weddings, birthdays, Ganesh Chaturthi, family celebrations, and all occasions. Marathi has a vibrant musical tradition with Lavani, Powada, and Natya Sangeet, and Melodia captures this cultural richness in custom songs with professional vocals and music. Whether you want a traditional Marathi wedding song, a fun birthday anthem, or a devotional Ganpati song, Melodia crafts authentic Marathi lyrics tailored to your story. Popular across Maharashtra and among Marathi-speaking communities. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "anniversary", "festive-holiday", "devotional-spiritual", "siblings"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Vadhdivsachya Shubhechha" },
      { occasion: "Festival", phrase: "Ganpati Bappa Morya" },
    ],
  },
  {
    slug: "gujarati",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    introHeading: "Personalized Songs in Gujarati",
    introContent:
      "Melodia creates personalized songs in Gujarati for Navratri celebrations, weddings, birthdays, anniversaries, and all special occasions. Gujarati music is famous for its festive energy — from Garba to Raas — and Melodia captures this vibrant spirit in custom songs. Create Garba-style Navratri songs, romantic wedding songs, fun birthday anthems, or devotional songs in authentic Gujarati with professional vocals and music production. Perfect for Navratri nights, wedding celebrations, and family milestones. Popular across Gujarat and among Gujarati communities worldwide. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "festive-holiday", "anniversary", "devotional-spiritual", "party"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janmadivas Ni Shubhkamna" },
      { occasion: "Festival", phrase: "Navratri Ni Shubhkamna" },
    ],
  },
  {
    slug: "punjabi",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    introHeading: "Personalized Songs in Punjabi",
    introContent:
      "Nothing matches the energy and joy of Punjabi music. Melodia creates personalized Punjabi songs for weddings, Sangeet ceremonies, birthdays, Baisakhi, Lohri, and all celebrations. From high-energy Bhangra numbers to romantic ballads, Melodia's AI crafts authentic Punjabi lyrics with the infectious energy that Punjabi music is famous for. Custom Punjabi wedding songs are among the most popular creations on Melodia — perfect for Sangeet performances, Baraat entries, and reception dances. Create songs in pure Punjabi or Punjabi-Hindi blend. Popular across Punjab, Haryana, Delhi, and among Punjabi communities worldwide. Starting at INR 199.",
    popularOccasions: ["weddings", "sangeet", "birthday", "party", "festive-holiday", "haldi"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janamdin Diyan Vadhaiyan" },
      { occasion: "Wedding", phrase: "Viah Mubarakan" },
      { occasion: "Festival", phrase: "Lohri Diyan Vadhaiyan" },
    ],
  },
  {
    slug: "urdu",
    name: "Urdu",
    nativeName: "اردو",
    introHeading: "Personalized Songs in Urdu",
    introContent:
      "Urdu is the language of poetry, romance, and deep emotion. Melodia creates personalized songs in Urdu that capture the ghazal-like beauty of the language for weddings, romantic occasions, birthdays, Eid celebrations, and personal tributes. Whether you want a romantic nazm, a celebratory wedding song, or an emotional tribute in Urdu, Melodia's AI crafts eloquent lyrics with the poetic depth that Urdu is famous for, produced with professional vocals and music. Perfect for anyone who appreciates the literary beauty of Urdu. Starting at INR 199.",
    popularOccasions: ["romantic", "weddings", "festive-holiday", "birthday", "devotional-spiritual", "anniversary"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janamdin Mubarak" },
      { occasion: "Festival", phrase: "Eid Mubarak" },
      { occasion: "Wedding", phrase: "Shadi Mubarak" },
    ],
  },
  {
    slug: "odia",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    introHeading: "Personalized Songs in Odia",
    introContent:
      "Create personalized songs in Odia on Melodia for Rath Yatra, Raja festival, weddings, birthdays, and all special occasions. Odia has a beautiful cultural and literary heritage, and Melodia crafts custom songs that honor this tradition while being deeply personal. Whether you want a festive Odia song, a wedding tribute, or a birthday anthem, our AI generates authentic Odia lyrics produced with professional vocals and music. Popular across Odisha and among Odia-speaking communities. Starting at INR 199.",
    popularOccasions: ["weddings", "birthday", "festive-holiday", "devotional-spiritual", "anniversary"],
    samplePhrases: [
      { occasion: "Birthday", phrase: "Janmadina Abhinandana" },
      { occasion: "Festival", phrase: "Rath Yatra Shubhkamna" },
    ],
  },
  {
    slug: "assamese",
    name: "Assamese",
    nativeName: "অসমীয়া",
    introHeading: "Personalized Songs in Assamese",
    introContent:
      "Melodia creates personalized songs in Assamese for Bihu celebrations, weddings, birthdays, and all occasions. Assamese music has a unique charm — from the energy of Bihu songs to the romance of Zubeen Garg-style ballads — and Melodia captures this cultural richness in custom songs with professional vocals and music. Create Bihu-style festive songs, romantic wedding music, or heartfelt birthday tributes in authentic Assamese. Popular across Assam and among Assamese-speaking communities. Starting at INR 199.",
    popularOccasions: ["festive-holiday", "weddings", "birthday", "romantic", "devotional-spiritual"],
    samplePhrases: [
      { occasion: "Festival", phrase: "Bohag Bihu-r Subhechha" },
      { occasion: "Birthday", phrase: "Jonmodinor Subhechha" },
    ],
  },
];
