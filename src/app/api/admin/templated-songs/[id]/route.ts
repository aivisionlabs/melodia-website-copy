/**
 * Admin: Get, update, delete a templated song
 * GET /api/admin/templated-songs/[id]
 * PATCH /api/admin/templated-songs/[id]
 * DELETE /api/admin/templated-songs/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  templatedSongsTable,
  templatedSongCategoriesTable,
  categoriesTable,
  personasTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  draft_lyrics: z.string().optional().nullable(),
  template_lyrics: z.string().optional().nullable(),
  music_style: z.string().max(500).optional().nullable(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  selected_variant: z.number().int().min(0).optional().nullable(),
  persona_id: z.number().int().positive().optional().nullable(),
  song_variants: z.array(z.record(z.unknown())).optional(),
  language: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(100)).max(50).optional(),
});

async function getHandler(
  req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> }
) {
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
    const categoryRows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
      })
      .from(templatedSongCategoriesTable)
      .innerJoin(
        categoriesTable,
        eq(categoriesTable.id, templatedSongCategoriesTable.category_id)
      )
      .where(eq(templatedSongCategoriesTable.templated_song_id, id));

    return NextResponse.json({
      success: true,
      templatedSong: { ...template, categories: categoryRows },
    });
  } catch (error) {
    logger.error('Admin get templated song error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get' },
      { status: 500 }
    );
  }
}

async function patchHandler(
  req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> }
) {
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

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
    }

    // Fetch current template to get existing persona_id if not being updated
    const currentTemplate = await db
      .select()
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, id))
      .limit(1);

    if (currentTemplate.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const template = currentTemplate[0];
    const newPersonaId = parsed.data.persona_id !== undefined ? parsed.data.persona_id : template.persona_id;
    const newIsActive = parsed.data.is_active !== undefined ? parsed.data.is_active : template.is_active;

    // Validate: only block when this request is explicitly activating the template.
    // Editing other fields (e.g. selecting a variant / processing lyrics) on a
    // not-yet-ready template must not be blocked — the persona is created right
    // after, during the process-lyrics step.
    if (parsed.data.is_active === true && !newPersonaId) {
      return NextResponse.json(
        { error: 'Cannot activate template song without a persona', details: 'Templated songs must have a valid persona before being marked as active' },
        { status: 400 }
      );
    }

    // If persona_id is being set or changed, validate it exists
    if (parsed.data.persona_id !== undefined && parsed.data.persona_id !== null) {
      const persona = await db
        .select({ id: personasTable.id })
        .from(personasTable)
        .where(eq(personasTable.id, parsed.data.persona_id))
        .limit(1);

      if (persona.length === 0) {
        return NextResponse.json(
          { error: 'Persona not found', details: `Persona with ID ${parsed.data.persona_id} does not exist` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.draft_lyrics !== undefined) updates.draft_lyrics = parsed.data.draft_lyrics;
    if (parsed.data.template_lyrics !== undefined) updates.template_lyrics = parsed.data.template_lyrics;
    if (parsed.data.music_style !== undefined) updates.music_style = parsed.data.music_style;
    if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
    if (
      parsed.data.is_active === true &&
      !template.is_active &&
      !template.first_activated_at
    ) {
      updates.first_activated_at = new Date();
    }
    if (parsed.data.selected_variant !== undefined) updates.selected_variant = parsed.data.selected_variant;
    if (parsed.data.persona_id !== undefined) updates.persona_id = parsed.data.persona_id;
    if (parsed.data.song_variants !== undefined) updates.song_variants = parsed.data.song_variants;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;

    const [row] = await db
      .update(templatedSongsTable)
      .set(updates as any)
      .where(eq(templatedSongsTable.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    logger.info('Admin updated templated song', { id, is_active: newIsActive, persona_id: newPersonaId });
    return NextResponse.json({ success: true, templatedSong: row });
  } catch (error) {
    logger.error('Admin update templated song error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  req: NextRequest,
  context: { logger: any; params?: Promise<{ id: string }> }
) {
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

    const [deleted] = await db
      .delete(templatedSongsTable)
      .where(eq(templatedSongsTable.id, id))
      .returning({ id: templatedSongsTable.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    logger.info('Admin deleted templated song', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin delete templated song error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('admin-templated-songs-get', getHandler);
export const PATCH = withApiLogger('admin-templated-songs-patch', patchHandler);
export const DELETE = withApiLogger('admin-templated-songs-delete', deleteHandler);
