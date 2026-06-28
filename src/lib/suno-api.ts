/**
 * Suno API Integration
 * Handles music generation via Suno API
 */

import { logger } from '@/lib/logger';
import { coerceRecordInfoSunoDataToArray } from '@/lib/utils/variant-utils';
import { getDemoTaskTimestamp, isDemoModeEnabled } from './demo-mode';

const SUNO_API_URL = process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY || process.env.SUNO_API_TOKEN || '';

export interface SunoGenerateResponse {
  taskId: string;
  status: 'queued' | 'processing';
  estimatedTime?: number;
}

export interface SunoStatusResponse {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  songs?: Array<{
    id: string;
    title?: string;
    audioUrl: string;
    sourceAudioUrl: string;
    streamAudioUrl: string;
    sourceStreamAudioUrl?: string;
    imageUrl?: string;
    sourceImageUrl: string;
    duration?: number;
    modelName?: string;
    [key: string]: any; // Allow additional fields for flexibility
  }>;
  error?: string;
}

export type SunoNormalizedStatus = SunoStatusResponse['status'];

export function normalizeSunoStatus(rawStatus: unknown): SunoNormalizedStatus {
  const s = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : '';

  if (s === 'SUCCESS' || s === 'COMPLETED') return 'completed';

  if (
    s === 'CREATE_TASK_FAILED' ||
    s === 'GENERATE_AUDIO_FAILED' ||
    s === 'CALLBACK_EXCEPTION' ||
    s === 'SENSITIVE_WORD_ERROR' ||
    s === 'FAILED'
  ) {
    return 'failed';
  }

  if (s === 'PENDING' || s === 'QUEUED') return 'queued';

  // TEXT_SUCCESS, FIRST_SUCCESS, and other intermediate states
  return 'processing';
}

/**
 * Generate a song with Suno API
 */
export async function generateSong(
  request: {
    prompt: string;
    style?: string;
    title: string;
    negativeTags?: string;
    callBackUrl: string;
    personaId?: string;
    vocalGender?: 'm' | 'f';
  }
): Promise<SunoGenerateResponse> {
  // Demo mode - return mock data
  if (isDemoModeEnabled()) {
    console.log('[DEMO MODE] Suno API - Generate song:', request.title);
    return {
      taskId: `demo-task-${Date.now()}`,
      status: 'queued',
      estimatedTime: 120, // 2 minutes
    };
  }

  try {
    const response = await fetch(`${SUNO_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        title: request.title,
        prompt: request.prompt,
        ...(request.personaId ? { personaId: request.personaId } : { style: request.style }),
        customMode: true,
        instrumental: false,
        model: "V5_5",
        negativeTags: request.negativeTags,
        callBackUrl: request.callBackUrl,
        vocalGender: request.vocalGender,
      }),
    });


    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Suno API error: ${error}`);
    }

    const sunoResponse = await response.json();
    console.log("SUNO RESPONSE:", sunoResponse);
    const { data } = sunoResponse;
    console.log('Suno API generate response:', data);
    console.log('Suno API taskId:', data.taskId);
    return {
      taskId: data.task_id || data.taskId,
      status: data.status,
      estimatedTime: data.estimated_time,
    };
  } catch (error) {
    console.error('Suno API generate error:', error);
    throw error;
  }
}

/**
 * Get song generation status
 */
export async function getSongStatus(
  taskId: string
): Promise<SunoStatusResponse> {
  // Demo mode - simulate completion after 5 seconds
  // IMPORTANT: We key demo simulation off the taskId prefix, not env flags.
  // This supports "demoMode: true" API calls that create demo-task-* IDs even when DEMO_MODE env isn't set.
  const demoTs = getDemoTaskTimestamp(taskId);
  if (demoTs) {
    const taskTime = demoTs;
    const elapsedSeconds = (Date.now() - taskTime) / 1000;

    console.log(`[DEMO MODE] Suno API - Status check for ${taskId}`);

    if (elapsedSeconds < 5) {
      // Still processing
      return {
        taskId,
        status: 'processing',
      };
    }

    // Completed - return mock song data with 2 variants (matching song-status API)
    return {
      taskId,
      status: 'completed',
      songs: [
        {
          id: 'ce5b09ea-ad49-4a6c-b449-e4c47597d123',
          title: 'Demo Song',
          audioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          sourceAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          streamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          sourceStreamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
          imageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
          sourceImageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
          duration: 85.76,
          modelName: 'DEMO',
        },
        {
          id: 'e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608',
          title: 'Demo Song',
          audioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          sourceAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          streamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          sourceStreamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
          imageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
          sourceImageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
          duration: 89.92,
          modelName: 'DEMO',
        },
      ],
    };
  }

  try {
    const response = await fetch(`${SUNO_API_URL}/generate/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Suno API error: ${error}`);
    }

    const { data } = await response.json();

    // Handle null or undefined data - return safe default instead of throwing
    if (!data) {
      return {
        taskId,
        status: 'processing' as const,
        songs: [],
      };
    }

    const rawStatus = typeof data.status === 'string' ? data.status.toUpperCase() : undefined;
    const normalizedStatus = normalizeSunoStatus(rawStatus);

    const rawSunoRows = data.response?.sunoData;
    const sunoRows = coerceRecordInfoSunoDataToArray(rawSunoRows);
    if (rawSunoRows != null && !Array.isArray(rawSunoRows)) {
      logger.info('Suno getSongStatus: coerced sunoData to array', {
        taskId: data.taskId || taskId,
        coercedLength: sunoRows.length,
      });
    }

    return {
      taskId: data.taskId || taskId,
      status: normalizedStatus,
      songs: sunoRows.map((song: any) => {
        // Preserve ALL fields from Suno API response
        // Ensure backward compatibility by normalizing common field names
        return {
          ...song, // Preserve all original fields
          // Normalize common field names for backward compatibility
          audioUrl:
            song.audioUrl || song.sourceAudioUrl || song.audio_url || song.source_audio_url || '',
          sourceAudioUrl:
            song.sourceAudioUrl || song.source_audio_url || song.audioUrl || song.audio_url || '',
          streamAudioUrl:
            song.streamAudioUrl ||
            song.sourceStreamAudioUrl ||
            song.stream_audio_url ||
            song.source_stream_audio_url ||
            '',
          sourceStreamAudioUrl:
            song.sourceStreamAudioUrl ||
            song.source_stream_audio_url ||
            song.streamAudioUrl ||
            song.stream_audio_url ||
            '',
          // Prefer source image URL; also populate imageUrl for consumers that expect it.
          sourceImageUrl:
            song.sourceImageUrl ||
            song.source_image_url ||
            song.imageUrl ||
            song.image_url ||
            '',
          imageUrl:
            song.sourceImageUrl ||
            song.source_image_url ||
            song.imageUrl ||
            song.image_url ||
            '',
          // Ensure required fields have defaults
          id: song.id || '',
          title: song.title || 'Generated Song',
          modelName: song.modelName || song.model_name || 'SUNO',
          duration: song.duration || 0,
        };
      }),
      error: data.error,
    };
  } catch (error) {
    console.error('Suno API status error:', error);
    throw error;
  }
}

/**
 * Get timestamped lyrics for a song
 */
export async function getTimestampedLyrics(
  request: { taskId: string; musicIndex: number }
) {
  if (isDemoModeEnabled()) {
    return {
      success: true,
      lyrics: [],
    };
  }

  try {
    const response = await fetch(`${SUNO_API_URL}/generate/get-timestamped-lyrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: request.taskId,
        musicIndex: request.musicIndex,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch timestamped lyrics');
    }

    const json = await response.json();
    const data = json?.data ?? null;
    const lyrics = data?.lyrics ?? data?.alignedWords ?? [];
    return {
      success: true,
      lyrics: Array.isArray(lyrics) ? lyrics : [],
    };
  } catch (error) {
    console.error('Suno API lyrics error:', error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Factory class for Suno API
 * Provides a unified interface for API operations
 */
export class SunoAPIFactory {
  /**
   * Get API instance
   */
  static getAPI(): SunoAPIWrapper {
    return new SunoAPIWrapper();
  }
}

/**
 * Wrapper class that adapts function-based API to object-based interface
 */
class SunoAPIWrapper {
  /**
   * Generate a song
   * @param request Request object with prompt, style, title, etc.
   * @returns Response with code and data.taskId
   */
  async generateSong(request: {
    prompt?: string;
    style?: string;
    title: string;
    negativeTags?: string;
    callBackUrl?: string;
    personaId?: string;
    vocalGender?: 'm' | 'f';
  }): Promise<{ code: number; msg?: string; data: { taskId: string } }> {
    try {

      const response = await generateSong({
        prompt: request.prompt || '',
        style: request.personaId ? undefined : request.style,
        title: request.title,
        negativeTags: request.negativeTags || '',
        callBackUrl: request.callBackUrl || '',
        personaId: request.personaId,
        vocalGender: request.vocalGender,
      });

      return {
        code: 200,
        data: {
          taskId: response.taskId,
        },
      };
    } catch (error: any) {
      console.error('Error in generateSong:', error);
      return {
        code: 500,
        msg: error.message || 'Failed to generate song',
        data: {
          taskId: '',
        },
      };
    }
  }

  /**
   * Get record info for a task
   * @param taskId Task ID
   * @returns Response with task information
   */
  async getRecordInfo(taskId: string): Promise<{
    code: number;
    msg?: string;
    data: {
      taskId: string;
      parentMusicId: string;
      param: string;
      response: {
        taskId: string;
        sunoData: any[];
      };
      status: string;
      type: string;
      errorCode?: string;
      errorMessage?: string;
    };
  }> {
    try {
      // IMPORTANT: we must not "upgrade" intermediate statuses to SUCCESS in production.
      // Fetch record-info directly so we preserve Suno's raw status (PENDING/TEXT_SUCCESS/FIRST_SUCCESS/SUCCESS/etc.).
      // For demo tasks, simulate Suno raw status progression regardless of DEMO_MODE env.
      const demoTs = getDemoTaskTimestamp(taskId);
      if (demoTs) {
        const elapsedMs = Date.now() - demoTs;
        const DEMO_TEXT_MS = 1 * 1000; // 1s to start
        const DEMO_FIRST_MS = 2 * 1000; // 2s first variant
        const DEMO_BOTH_MS = 4 * 1000; // 4s second variant
        const DEMO_DONE_MS = 5 * 1000; // 5s complete

        const baseVariants = [
          {
            id: 'ce5b09ea-ad49-4a6c-b449-e4c47597d123',
            title: 'Demo Song',
            audioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
            sourceAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
            streamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
            sourceStreamAudioUrl: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
            imageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
            sourceImageUrl: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
            duration: 85.76,
            modelName: 'DEMO',
          },
          {
            id: 'e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608',
            title: 'Demo Song',
            audioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
            sourceAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
            streamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
            sourceStreamAudioUrl: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
            imageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
            sourceImageUrl: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
            duration: 89.92,
            modelName: 'DEMO',
          },
        ];

        let status: string = 'PENDING';
        let sunoData: any[] = [];

        if (elapsedMs >= DEMO_DONE_MS) {
          status = 'SUCCESS';
          sunoData = baseVariants;
        } else if (elapsedMs >= DEMO_BOTH_MS) {
          status = 'FIRST_SUCCESS';
          sunoData = baseVariants;
        } else if (elapsedMs >= DEMO_FIRST_MS) {
          status = 'FIRST_SUCCESS';
          sunoData = [baseVariants[0]];
        } else if (elapsedMs >= DEMO_TEXT_MS) {
          status = 'TEXT_SUCCESS';
          sunoData = [];
        }

        return {
          code: 200,
          data: {
            taskId,
            parentMusicId: '',
            param: '',
            response: {
              taskId,
              sunoData,
            },
            status,
            type: 'generate',
          },
        };
      }

      const response = await fetch(`${SUNO_API_URL}/generate/record-info?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Suno API error: ${error}`);
      }

      const json = await response.json();
      const data = json?.data;

      const rawStatus = typeof data?.status === 'string' ? data.status.toUpperCase() : 'PENDING';

      const rawSuno = data?.response?.sunoData;
      const sunoData = coerceRecordInfoSunoDataToArray(rawSuno);
      if (rawSuno != null && !Array.isArray(rawSuno)) {
        logger.info('Suno record-info: coerced sunoData to array', {
          taskId: data?.taskId || data?.task_id || taskId,
          coercedLength: sunoData.length,
        });
      }

      return {
        code: 200,
        data: {
          taskId: data?.taskId || data?.task_id || taskId,
          parentMusicId: data?.parentMusicId || '',
          param: data?.param || '',
          response: {
            taskId: data?.response?.taskId || data?.response?.task_id || taskId,
            sunoData,
          },
          status: rawStatus,
          type: data?.type || 'generate',
          ...(data?.errorCode && { errorCode: data.errorCode }),
          ...(data?.errorMessage && { errorMessage: data.errorMessage }),
        },
      };
    } catch (error: any) {
      console.error('Error in getRecordInfo:', error);
      return {
        code: 500,
        msg: error.message || 'Failed to fetch record info',
        data: {
          taskId,
          parentMusicId: '',
          param: '',
          response: { taskId, sunoData: [] },
          status: 'FAILED',
          type: 'generate',
          errorCode: 'INTERNAL_ERROR',
          errorMessage: error.message || 'Failed to fetch record info',
        },
      };
    }
  }

  /**
   * Get timestamped lyrics
   * @param request Request with taskId and musicIndex
   * @returns Response with code and data.alignedWords
   */
  async getTimestampedLyrics(request: {
    taskId: string;
    musicIndex: number;
  }): Promise<{
    code: number;
    msg?: string;
    data?: {
      alignedWords: any[];
    };
  }> {
    try {
      const result = await getTimestampedLyrics({
        taskId: request.taskId,
        musicIndex: request.musicIndex,
      });

      if (!result.success) {
        return {
          code: 500,
          msg: 'Failed to get timestamped lyrics',
          data: {
            alignedWords: [],
          },
        };
      }

      return {
        code: 200,
        data: {
          alignedWords: result.lyrics || [],
        },
      };
    } catch (error: any) {
      console.error('Error in getTimestampedLyrics:', error);
      return {
        code: 500,
        msg: error.message || 'Failed to get timestamped lyrics',
        data: {
          alignedWords: [],
        },
      };
    }
  }
}
