export type SongStatus =
  | "PENDING"
  | "STREAM_AVAILABLE"
  | "COMPLETED"
  | "FAILED"
  | "NOT_FOUND"
  | "processing"
  | "completed";

export interface SongVariant {
  id: string;
  audioUrl: string;
  streamAudioUrl: string;
  sourceStreamAudioUrl?: string;
  sourceAudioUrl?: string;
  imageUrl: string;
  sourceImageUrl: string;
  prompt?: string;
  modelName: string;
  title: string;
  tags?: string;
  createTime?: string;
  duration?: number;
  variantStatus: "PENDING" | "STREAM_READY" | "DOWNLOAD_READY";
}

export interface SongStatusResponse {
  success: boolean;
  status: SongStatus;
  variants?: SongVariant[];
  message?: string;
  songId?: number;
  taskId?: string;
  slug?: string;
  selectedVariantIndex?: number | null;
  variantTimestampLyricsProcessed?: any;
  userId?: number | null;
  anonymousUserId?: string | null;
  error?: string;
  lyricsDraftTitle?: string | null;
  songRequestId?: number | null;
  variationsRemaining?: number;
  occasion?: string | null;
  languages?: string | null;
  recipientName?: string | null;
}

// New types for fulfillment workflow and change requests
export type FulfillmentStatus = 'pending' | 'shared' | 'change_requested' | 'completed';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChangeRequest {
  id: string;
  songRequestId: number;
  songId?: number;
  description: string; // max 5000 chars (validated server-side)
  createdAt: string;
  updatedAt: string;
}

export interface SongRequestExtension {
  fulfillmentStatus: FulfillmentStatus;
  priority: RequestPriority; // default 'medium'
  deliveryDate?: string | null; // YYYY-MM-DD, nullable
  eventDate?: string | null; // YYYY-MM-DD, nullable
  initialRequirementsText?: string | null; // capped in UI, validated server-side (e.g. 5000)
}
