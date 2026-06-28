/**
 * Shared types for select queries
 * These types define lightweight row shapes to avoid heavy JSON columns
 */

// Lightweight row shape for library listings (avoids heavy JSON columns)
export type LibrarySongRow = {
  id: number;
  created_at: Date;
  title: string;
  song_description: string | null;
  music_style: string | null;
  service_provider: string | null;
  song_url: string | null;
  duration: string | null;
  slug: string;
  add_to_library: boolean | null;
  is_deleted: boolean | null;
  status: string | null;
  categories: string[] | null;
  tags: string[] | null;
  suno_variants: unknown;
  selected_variant: number | null;
  sequence: number | null;
  show_lyrics: boolean | null;
  likes_count: number | null;
  play_count: number | null;
  has_persona: boolean | null;
  language: string | null;
};

// Lightweight row for admin dashboard (avoids heavy JSONB fields)
export type AdminSongRow = {
  id: number;
  created_at: Date;
  title: string;
  music_style: string | null;
  service_provider: string | null;
  song_requester: string | null;
  song_url: string | null;
  duration: string | null;
  slug: string;
  add_to_library: boolean | null;
  is_deleted: boolean | null;
  status: string | null;
  categories: string[] | null;
  tags: string[] | null;
  sequence: number | null;
  show_lyrics: boolean | null;
  likes_count: number | null;
  play_count: number | null;
  download_allowed: boolean | null;
  suno_task_id: string | null;
  // New lightweight fields for admin list views (avoid shipping large JSON)
  has_timestamp_lyrics?: boolean | null;
  variant_count?: number | null;
  variant_audio_urls?: Array<string | null> | null;
  // Kept optional for backward compatibility (deprecated in list views)
  timestamp_lyrics?: any;
  suno_variants?: any | null;
  selected_variant: number | null;
  language: string | null;
};

// User song row for admin dashboard
export type AdminUserSongRow = {
  id: number;
  slug: string | null;
  title: string;
  status: string;
  created_at: Date;
  request_id: number;
  recipient_details: string | null;
  occasion: string | null;
  languages: string | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  is_anonymous: boolean;
  variant_count: number;
  music_style: string | null;
  selected_variant: number | null;
  is_converted_to_library: boolean;
  play_count: number;
  variant_audio_urls?: Array<string | null>;
  payment_id: string | null;
  order_id: string | null;
  feedback?: Array<{
    id: number;
    variant_index: number;
    accepted: boolean;
    rating: number | null;
    reason_labels: string[];
    other_text: string | null;
    selected: boolean | null;
    created_at: Date;
  }>;
};

// Payment analytics data
export type PaymentAnalyticsData = {
  paidSongs: { count: number; revenue: number };
  paidRequests: { count: number; revenue: number };
  totalRevenue: number;
  totalCompletedPayments: number;
  recentPayments: { count: number; revenue: number };
  paymentStatusBreakdown: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  dailyData: Array<{
    date: string;
    revenue: number;
    paymentCount: number;
    paidSongs: number;
    paidRequests: number;
  }>;
};
