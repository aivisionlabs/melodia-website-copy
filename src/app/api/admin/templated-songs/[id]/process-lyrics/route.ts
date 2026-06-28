/**
 * Admin: Process lyrics for a templated song
 * POST /api/admin/templated-songs/[id]/process-lyrics
 * Replaces name with {{NAME}} in text lyrics (LLM). Timestamp / singalong lyrics are not used.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { templatedSongsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { replaceNameWithPlaceholder, replaceNameWithPlaceholderSimple } from '@/lib/services/llm/llm-template-lyrics';
import { createPersonaFromTemplatedSong } from '@/lib/services/persona-service';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

const bodySchema = z.object({
  nameToReplace: z.string().min(1, 'nameToReplace is required').max(200),
});

async function handler(
  req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await (context.params ?? Promise.resolve({ id: '' }));
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      context.logger.warn('Invalid templated song id for process-lyrics', { idParam: params.id });
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const logger = context.logger;
    const body = await req.json();
    const { nameToReplace } = bodySchema.parse(body);

    const templates = await db
      .select()
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, id))
      .limit(1);

    if (templates.length === 0) {
      logger.warn('Templated song not found for process-lyrics', { id });
      return NextResponse.json({ error: 'Templated song not found' }, { status: 404 });
    }

    const template = templates[0];

    const sourceLyrics = template.draft_lyrics ?? template.template_lyrics ?? '';
    if (!sourceLyrics.trim()) {
      logger.warn('No lyrics to process for templated song', { id });
      return NextResponse.json(
        { error: 'Template has no draft_lyrics or template_lyrics to process' },
        { status: 400 }
      );
    }

    const nameLower = nameToReplace.trim().toLowerCase();
    if (!sourceLyrics.toLowerCase().includes(nameLower)) {
      logger.warn('nameToReplace not found in template lyrics', { id, nameToReplace });
      return NextResponse.json(
        { error: `"${nameToReplace}" was not found in the template lyrics` },
        { status: 400 }
      );
    }

    logger.info('Processing template lyrics', {
      templateId: id,
      nameToReplace: nameToReplace.trim(),
    });

    const templateLyrics = await replaceNameWithPlaceholder(sourceLyrics, nameToReplace.trim());
    const templateTitle =
      template.title && template.title.trim()
        ? replaceNameWithPlaceholderSimple(template.title.trim(), nameToReplace.trim())
        : null;

    await db
      .update(templatedSongsTable)
      .set({
        template_lyrics: templateLyrics,
        template_title: templateTitle ?? undefined,
        template_timestamp_lyrics: null,
        updated_at: new Date(),
      })
      .where(eq(templatedSongsTable.id, id));

    logger.info('Template lyrics processed successfully', {
      templateId: id,
    });

    let personaResult: { success: boolean; persona?: { id: number }; message?: string } | null = null;
    try {
      const title = template.title?.trim() || `Template ${id}`;
      personaResult = await createPersonaFromTemplatedSong({
        templatedSongId: id,
        name: title,
        description: `Voice for template: ${title}`,
      });
      logger.info('Persona created for templated song', {
        templateId: id,
        personaId: personaResult.persona?.id,

      });
    } catch (personaError) {
      logger.error('Failed to create persona for templated song', {
        templateId: id,
        error: personaError instanceof Error ? personaError.message : personaError,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            personaError instanceof Error
              ? personaError.message
              : 'Lyrics processed but persona creation failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templateId: id,
      template_lyrics: templateLyrics,
      persona_id: personaResult?.persona?.id ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      context.logger.warn('Validation error in process-lyrics', { errors: error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    context.logger.error('Process lyrics error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process lyrics' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogger('admin-templated-songs-process-lyrics', handler);
