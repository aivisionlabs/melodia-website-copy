// Client-side types and functions for user content
export interface UserContentItem {
  id: string;
  type: 'lyrics_draft' | 'song_request' | 'song';
  title: string;
  recipient_name: string;
  status: string;
  created_at: string;
  lyrics?: string;
  audio_url?: string;
  request_id?: number;
  song_id?: number;
  lyrics_draft_id?: number;
  suno_task_id?: string;
  variants?: Array<{
    id: string;
    audioUrl: string;
    streamAudioUrl: string;
    imageUrl: string;
    prompt: string;
    modelName: string;
    title: string;
    tags: string;
    createTime: string;
    duration: number;
  }>;
  selected_variant?: number;
  timestamped_lyrics_variants?: { [variantIndex: number]: any[] };
  timestamp_lyrics?: any[];
}

export function getButtonForContent(item: UserContentItem) {
  switch (item.type) {
    case 'lyrics_draft':
      switch (item.status) {
        case 'draft':
          return { text: 'Generate Song', action: 'generate', variant: 'default' as const };
        case 'needs_review':
          return { text: 'Review Lyrics', action: 'review', variant: 'secondary' as const };
        case 'approved':
          return { text: 'Generate Song', action: 'generate', variant: 'default' as const };
        default:
          return { text: 'View Lyrics', action: 'view', variant: 'outline' as const };
      }
    
    case 'song_request':
      switch (item.status) {
        case 'pending':
          return { text: 'Create Lyrics', action: 'create_lyrics', variant: 'default' as const };
        case 'processing':
          return { text: 'View Progress', action: 'progress', variant: 'secondary' as const };
        default:
          return { text: 'View Details', action: 'view', variant: 'outline' as const };
      }
    
    case 'song':
      switch (item.status) {
        case 'ready':
        case 'completed':
          return { text: 'Listen', action: 'listen', variant: 'default' as const };
        case 'generating':
        case 'processing':
          return { text: 'View Progress', action: 'progress', variant: 'secondary' as const };
        case 'failed':
          return { text: 'Retry', action: 'retry', variant: 'destructive' as const };
        default:
          return { text: 'View Song', action: 'view', variant: 'outline' as const };
      }
    
    default:
      return { text: 'View', action: 'view', variant: 'outline' as const };
  }
}

export async function fetchUserContent(userId: number): Promise<UserContentItem[]> {
  try {
    const response = await fetch(`/api/user-content?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user content');
    }

    const result = await response.json();
    return result.content || [];
  } catch (error) {
    console.error('Error fetching user content:', error);
    return [];
  }
}
