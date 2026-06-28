import { Song } from "@/types";
import {
  aDreamNamedJivyLyricsData,
  kaleidoscopeHeartLyricsData,
  lipsaBirthdaySongLyricsData,
  ruchiMyQueenLyricsData,
  sameOficeDifferentHeartLyricsData,
  yaaraLyricsData
} from "./lyrics-data";


export const customCreations: Song[] = [
  {
    id: 11,
    created_at: "2024-01-01T00:00:00Z",
    title: "Ruchi My Queen",
    song_description: "A rap song for Ruchi for her birthday by her husband",
    lyrics: null,
    timestamp_lyrics: ruchiMyQueenLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Rap",
    song_requester: null,
    prompt: null,
    service_provider: "Melodia",
    song_url: "/audio/ruchi-my-queen.mp3",
    duration: "179",
    slug: "ruchi-my-queen",
    categories: ["Hip Hop", "Rap", "Urban"],
  },
  {
    id: 1,
    created_at: "2024-01-01T00:00:00Z",
    title: "Kaleidoscope Heart",
    song_description: "A romantic song for a boy who changes his mind like a kaleidoscope",
    lyrics: null,
    timestamp_lyrics: kaleidoscopeHeartLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Romantic Song",
    song_requester: null,
    prompt: null,
    service_provider: "Melodia",
    song_url: "/audio/kaleidoscope.mp3",
    duration: "189",
    slug: "kaleidoscope-heart",
    categories: ["Romantic", "Acoustic", "Ballad"],
  },
  {
    id: 2,
    created_at: "2024-01-01T00:00:00Z",
    title: "Same Office, Different Hearts",
    song_description: "A love story of two people who work in the same office",
    lyrics: null,
    timestamp_lyrics: sameOficeDifferentHeartLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Love Story",
    service_provider: "Melodia",
    song_requester: null,
    prompt: null,
    song_url: "/audio/office-love.mp3",
    duration: "195",
    slug: "same-office-different-hearts",
  },
  {
    id: 3,
    created_at: "2024-01-01T00:00:00Z",
    title: "Yaara",
    song_description: "A Friendship Celebration Song",
    lyrics: null,
    timestamp_lyrics: yaaraLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Romantic Song",
    service_provider: "Melodia",
    song_requester: null,
    prompt: null,
    song_url: "/audio/yaara.mp3",
    duration: "197",
    slug: "yaara",
  },
  {
    id: 4,
    created_at: "2024-01-01T00:00:00Z",
    title: "Lipsa Birthday Song",
    lyrics: null,
    song_description: "A Birthday Celebration Song for Lipsa",
    timestamp_lyrics: lipsaBirthdaySongLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Birthday Song",
    service_provider: "Melodia",
    song_requester: null,
    prompt: null,
    song_url: "/audio/birthday-queen.mp3",
    duration: "181",
    slug: "lipsa-birthday-song",
    categories: ["Birthday", "Celebration", "Party"],
  },
  {
    id: 5,
    created_at: "2024-01-01T00:00:00Z",
    title: "A Dream Named Jivy",
    lyrics: null,
    song_description: "A Mother's Love Lullaby for Jivy",
    timestamp_lyrics: aDreamNamedJivyLyricsData,
    timestamped_lyrics_variants: null,
    selected_variant: 0,
    timestamped_lyrics_api_responses: null,
    music_style: "Mother's Love Lullaby",
    song_requester: null,
    prompt: null,
    service_provider: "Melodia",
    song_url: "/audio/a-dream-named-jivy.mp3",
    duration: "274",
    slug: "a-dream-named-jivy",
  },
];

export const testimonials = [
  {
    id: 1,
    title: "Perfect Birthday Surprise!",
    content:
      "Melodia created the most beautiful birthday song for my daughter. She absolutely loved it and it made her day so special. The personalized lyrics brought smile to my face!",
    author: "Priya S.",
  },
  {
    id: 2,
    title: "Our Wedding Song Dreams",
    content:
      "We wanted something unique for our first dance and Melodia delivered beyond our expectations. The song perfectly captured our love story.",
    author: "Rohit & Kavya",
  },
  {
    id: 3,
    title: "Heartfelt Apology Song",
    content:
      "I messed up big time with my partner and needed something special to make amends. The apology song Melodia created helped me express what I couldn't say in words.",
    author: "Arjun M.",
  },
  {
    id: 4,
    title: "Thank You Mom",
    content:
      "Created a thank you song for my mother on Mother's Day. The way they captured all the little memories and moments was incredible. Mom still plays it every day!",
    author: "Sneha K.",
  },
  {
    id: 5,
    title: "Farewell to a Dear Friend",
    content:
      "When my best friend moved across the country, I wanted to give her something meaningful. The farewell song they created perfectly expressed our friendship and the memories we shared.",
    author: "Vikram T.",
  },
];

/**
 * Partner Configuration
 * Maps partner types to their corresponding UTM medium values
 */
export const PARTNER_TYPE_UTM_MEDIUM: Record<'cake_shop' | 'instagram_influencer', string> = {
  cake_shop: 'qr_code',
  instagram_influencer: 'social',
} as const;

/**
 * Get UTM medium for a partner type
 * @param partnerType - The type of partner
 * @returns The UTM medium value for the partner type
 */
export function getPartnerUTMMedium(partnerType: 'cake_shop' | 'instagram_influencer'): string {
  return PARTNER_TYPE_UTM_MEDIUM[partnerType] || 'unknown';
}