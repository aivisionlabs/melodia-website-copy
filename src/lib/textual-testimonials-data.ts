export interface TextualTestimonial {
  id: string;
  name: string;
  handle?: string;
  text: string;
  rating: number; // 1-5 stars
}

export const textualTestimonials: TextualTestimonial[] = [
  {
    id: "lipsa-swain",
    name: "Lipsa Swain",
    handle: "@lipsa.swain",
    text: "A beautifully composed personalised song just for me! Amazing beats, lyrics that perfectly describe me, and even my name in it! Thank you @melodia.songs for making my birthday truly unforgettable 🎶",
    rating: 5,
  },
  {
    id: "gaurav",
    name: "Gaurav",
    text: "The personalized song for my brother's birthday was one of the most special gifts I've ever given. The hip-hop vibe captured our bond perfectly — so personal and meaningful. Will definitely be recommending Melodia to everyone! ❤️",
    rating: 5,
  },
  {
    id: "sahana",
    name: "Sahana",
    text: "Heard the song on the way to Abhi's place — what a wholesome experience! Feels so great to have a personalized song for our big day. Very beautiful 😍😍 ❤️",
    rating: 5,
  },
  {
    id: "pooja",
    name: "Pooja",
    text: "A very beautiful song that rhymes so well. I will read it to them every day. Beautiful ❤️ Thank you so much for taking the time to make it 😍",
    rating: 5,
  },
  {
    id: "aayatu-parent",
    name: "Aayatu's Parent",
    text: "LOVED LOVED THIS. I was in tears when I heard the song 🥺 Captured exactly how we feel, oh so beautifully! I'm definitely coming back for more occasions — and now I want a personalised lullaby for Aayatu! 🎵",
    rating: 5,
  },
];
