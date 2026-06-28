/**
 * Demo: Test Suno webhook locally
 * POST /api/demo/suno-webhook
 *
 * Only available when DEMO_MODE=true. Sends a mock Suno callback payload to the
 * webhook handler so you can test variant storage and merge logic without Suno.
 *
 * Body: { taskId: string, callbackType?: 'complete' | 'first' | 'text' | 'error' }
 * - taskId: must match an existing record (user_song metadata.sunoTaskId, songs.suno_task_id,
 *   templated_song_instances.suno_task_id, or templated_songs.suno_task_id).
 * - callbackType: defaults to 'complete'. Use 'complete' to simulate success with 2 demo variants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { createContextLogger } from '@/lib/logger';
import { webhookHandler } from '@/app/api/suno-webhook/route';

const DEMO_VARIANTS = [
  {
    id: 'ce5b09ea-ad49-4a6c-b449-e4c47597d123',
    title: 'Demo Song',
    duration: 85.76,
    audio_url: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    source_audio_url: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    source_stream_audio_url: 'https://cdn1.suno.ai/ce5b09ea-ad49-4a6c-b449-e4c47597d123.mp3',
    image_url: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
    source_image_url: 'https://cdn2.suno.ai/image_ce5b09ea-ad49-4a6c-b449-e4c47597d123.jpeg',
    model_name: 'SUNO',
  },
  {
    id: 'e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608',
    title: 'Demo Song',
    duration: 89.92,
    audio_url: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    source_audio_url: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    source_stream_audio_url: 'https://cdn1.suno.ai/e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.mp3',
    image_url: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
    source_image_url: 'https://cdn2.suno.ai/image_e7ee6bb7-61d9-479e-9cd1-4ebc9fa36608.jpeg',
    model_name: 'SUNO',
  },
];

export async function POST(req: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Demo mode is disabled. Set DEMO_MODE=true to test the webhook.' },
      { status: 403 }
    );
  }

  let body: { taskId?: string; callbackType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON. Body must be { taskId: string, callbackType?: "complete" | "first" | "text" | "error" }' },
      { status: 400 }
    );
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId is required' },
      { status: 400 }
    );
  }

  const callbackType = ['complete', 'first', 'text', 'error'].includes(body.callbackType ?? '')
    ? body.callbackType
    : 'complete';

  const code = callbackType === 'error' ? 500 : 200;
  const msg = callbackType === 'error' ? 'Simulated error' : 'success';

  const payload = {
    code,
    msg,
    data: {
      callbackType: callbackType as 'text' | 'first' | 'complete' | 'error',
      task_id: taskId,
      data: callbackType === 'error' ? undefined : DEMO_VARIANTS,
    },
  };

  const mockRequest = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  const logger = createContextLogger({
    apiName: 'suno-webhook',
    requestId: `demo-${Date.now()}`,
    demo: true,
  });

  const response = await webhookHandler(mockRequest, { logger });
  const clone = response.clone();

  try {
    const data = await response.json();
    return NextResponse.json({
      demo: true,
      taskId,
      callbackType,
      webhookResponse: data,
      status: clone.status,
    });
  } catch {
    return clone;
  }
}

/** GET: Return usage when DEMO_MODE is enabled */
export async function GET() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: 'Demo mode is disabled. Set DEMO_MODE=true.' },
      { status: 403 }
    );
  }
  return NextResponse.json({
    usage: 'POST with JSON body: { taskId: string, callbackType?: "complete" | "first" | "text" | "error" }',
    description: 'Simulates a Suno callback for the given taskId. The taskId must exist (user_song, songs, templated_songs, or templated_song_instances).',
    example: 'curl -X POST http://localhost:3000/api/demo/suno-webhook -H "Content-Type: application/json" -d \'{"taskId":"demo-task-1234567890","callbackType":"complete"}\'',
  });
}
