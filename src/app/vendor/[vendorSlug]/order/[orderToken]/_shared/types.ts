import type { TemplatedInstanceInfo } from "@/components/TemplatedSongVendorDisplay";

export interface VendorInfo {
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface OrderInfo {
  id: number;
  /** Partner-supplied reference (API field `external_order_id`). */
  external_order_id: string;
  status: string;
  product_type: string;
  customer_name: string | null;
  /** Partner pre-fill from create order; if either this or `customer_name` is missing, customer completes on template selection screen. */
  template_id: number | null;
  occasion: string | null;
  package_slug: string | null;
  song_request_id: number | null;
  metadata: Record<string, unknown> | null;
}

export interface LyricsDraftInfo {
  id: number;
  status: string;
  version: number;
  customer_lyrics: string | null;
  song_title: string;
  music_style: string | null;
}

export interface UserSongInfo {
  id: number;
  slug: string;
  status: string | null;
  song_variants: unknown;
}

export interface SongRequestInfo {
  id: number;
  status: string | null;
  occasion: string | null;
  languages: string;
  lyrics_edits_used: number | null;
}

export type RjShowStatus =
  | "script_pending"
  | "script_generating"
  | "script_ready"
  | "script_approved"
  | "producing"
  | "completed"
  | "failed";

export interface RjShowYoutubeLink {
  url: string;
  title?: string;
  author?: string;
  start_seconds?: number;
  end_seconds?: number;
}

export interface RjShowScriptSegment {
  segment_order: number;
  type: "tts" | "song" | "user_voice";
  label: string;
  text?: string;
  youtube_url?: string;
  title?: string;
  start_seconds?: number;
  end_seconds?: number;
  audio_url?: string;
}

export interface RjShowScript {
  show_title?: string;
  segments: RjShowScriptSegment[];
}

export interface RjShowScriptModifications {
  modified_segment_ids: number[];
  last_saved_at: string;
}

export interface RjShowInfo {
  id: number;
  slug: string;
  status: RjShowStatus;
  recipient_name: string;
  paragraphs: number;
  voice_gender: "male" | "female";
  voice_key: string | null;
  vibe_key: string | null;
  youtube_links: RjShowYoutubeLink[] | null;
  user_voice_url: string | null;
  user_voice_start_seconds: string | number | null;
  user_voice_end_seconds: string | number | null;
  script: RjShowScript | null;
  generated_script?: RjShowScript | null;
  script_modifications?: RjShowScriptModifications | null;
  final_audio_url: string | null;
  final_audio_duration_seconds: string | number | null;
  error_message: string | null;
  failed_step: string | null;
}

export interface VariationSongInfo {
  slug: string;
  status: string | null;
  song_variants: unknown;
}

export interface VendorOrderState {
  vendor: VendorInfo;
  order: OrderInfo;
  song_request: SongRequestInfo | null;
  lyrics_drafts: LyricsDraftInfo[];
  user_song: UserSongInfo | null;
  variations_remaining: number;
  variations: VariationSongInfo[];
  templated_instance: TemplatedInstanceInfo | null;
  rj_show: RjShowInfo | null;
}

export interface FlowProps {
  state: VendorOrderState;
  onStateChange: React.Dispatch<React.SetStateAction<VendorOrderState>>;
  orderToken: string;
  fetchState: () => Promise<void>;
}
