/**
 * Admin: Create template song via Suno (no persona)
 * POST /api/admin/templated-songs/[id]/create-song
 * Uses draft_lyrics + music_style + title, calls Suno, sets suno_task_id on template.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { templatedSongsTable, personasTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from '@/lib/utils/url';
import { SunoAPIFactory } from '@/lib/suno-api';
import { checkSunoCreditAndNotify } from '@/lib/suno-credit-alert';
import { withApiLogger } from '@/lib/logger/api-middleware';

async function handler(
  req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> }
) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const logger = context.logger;
  const params = await (context.params ?? Promise.resolve({ id: '' }));
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const template = rows[0];
    const lyrics = template.draft_lyrics?.trim() ?? template.template_lyrics?.trim();
    if (!lyrics) {
      return NextResponse.json(
        { error: 'Template has no draft_lyrics or template_lyrics to send to Suno' },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl();
    const callbackUrl = `${baseUrl}/api/suno-webhook/templated-songs`;

    let personaId: string | undefined;
    if (template.persona_id) {
      const personas = await db
        .select({ suno_persona_id: personasTable.suno_persona_id })
        .from(personasTable)
        .where(eq(personasTable.id, template.persona_id))
        .limit(1);
      if (personas[0]?.suno_persona_id) {
        personaId = personas[0].suno_persona_id;
      }
    }

    const sunoAPI = SunoAPIFactory.getAPI();
    const sunoResponse = await sunoAPI.generateSong({
      title: template.title,
      prompt: lyrics,
      ...(personaId ? { personaId } : { style: template.music_style ?? 'Pop' }),
      callBackUrl: callbackUrl,
    });

    if (sunoResponse.code !== 200 || !sunoResponse.data?.taskId) {
      logger.error('Suno API error in admin create template song', {
        code: sunoResponse.code,
        msg: sunoResponse.msg,
      });
      return NextResponse.json(
        { error: sunoResponse.msg || 'Failed to start Suno generation' },
        { status: 500 }
      );
    }

    const taskId = sunoResponse.data.taskId.trim();
    await db
      .update(templatedSongsTable)
      .set({
        suno_task_id: taskId,
        updated_at: new Date(),
      })
      .where(eq(templatedSongsTable.id, id));

    logger.info('Admin started template song creation via Suno', {
      templateId: id,
      taskId,
    });

    void checkSunoCreditAndNotify();

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Song generation started. Variants will be stored when Suno completes.',
    });
  } catch (error) {
    logger.error('Admin create template song error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create song' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('admin-templated-songs-create-song', handler);
