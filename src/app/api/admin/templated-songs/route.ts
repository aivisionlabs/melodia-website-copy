/**
 * Admin: List and create templated songs
 * GET /api/admin/templated-songs - list all
 * POST /api/admin/templated-songs - create (title, draft_lyrics, music_style, slug optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { templatedSongsTable, templatedSongCategoriesTable, categoriesTable, personasTable } from '@/lib/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';
import { generateBaseSlug } from '@/lib/utils/slug';

const createSchema = z.object({
  title: z.string().min(1).max(500),
  draft_lyrics: z.string().optional(),
  music_style: z.string().max(950).optional(),
  slug: z.string().max(200).optional(),
  persona_id: z.number().int().positive().optional(),
  language: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
  is_namedrop_eligible: z.boolean().optional(),
});

async function listHandler(req: NextRequest, { logger }: { logger: any }) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(templatedSongsTable)
      .orderBy(asc(templatedSongsTable.display_order), asc(templatedSongsTable.id));

    // Fetch categories and category-specific display order for all templates
    const templateIds = rows.map((r) => r.id);
    const categoriesByTemplate = new Map<
      number,
      Array<{
        id: number;
        name: string;
        slug: string;
        display_order: number;
        promotion_tag: string | null;
        suppress_auto_new: boolean;
      }>
    >();
    if (templateIds.length > 0) {
      const categoryRows = await db
        .select({
          templated_song_id: templatedSongCategoriesTable.templated_song_id,
          display_order: templatedSongCategoriesTable.display_order,
          promotion_tag: templatedSongCategoriesTable.promotion_tag,
          suppress_auto_new: templatedSongCategoriesTable.suppress_auto_new,
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
        })
        .from(templatedSongCategoriesTable)
        .innerJoin(categoriesTable, eq(categoriesTable.id, templatedSongCategoriesTable.category_id))
        .where(inArray(templatedSongCategoriesTable.templated_song_id, templateIds));

      for (const row of categoryRows) {
        const list = categoriesByTemplate.get(row.templated_song_id) ?? [];
        list.push({
          id: row.id,
          name: row.name,
          slug: row.slug,
          display_order: row.display_order,
          promotion_tag: row.promotion_tag,
          suppress_auto_new: row.suppress_auto_new,
        });
        categoriesByTemplate.set(row.templated_song_id, list);
      }
    }

    const templatedSongs = rows.map((r) => ({
      ...r,
      categories: categoriesByTemplate.get(r.id) ?? [],
    }));

    logger.info('Admin list templated songs', { count: templatedSongs.length });
    return NextResponse.json({ success: true, templatedSongs });
  } catch (error) {
    logger.error('Admin list templated songs error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list' },
      { status: 500 }
    );
  }
}

async function createHandler(req: NextRequest, { logger }: { logger: any }) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.parse(body);

    if (parsed.persona_id != null) {
      const persona = await db
        .select({ id: personasTable.id })
        .from(personasTable)
        .where(eq(personasTable.id, parsed.persona_id))
        .limit(1);

      if (persona.length === 0) {
        return NextResponse.json(
          { error: 'Persona not found', details: `Persona with ID ${parsed.persona_id} does not exist` },
          { status: 400 }
        );
      }
    }

    let slug = parsed.slug?.trim();
    if (!slug) {
      slug = generateBaseSlug(parsed.title);
      const existing = await db
        .select()
        .from(templatedSongsTable)
        .where(eq(templatedSongsTable.slug, slug))
        .limit(1);
      if (existing.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const [row] = await db
      .insert(templatedSongsTable)
      .values({
        title: parsed.title,
        draft_lyrics: parsed.draft_lyrics ?? null,
        music_style: parsed.music_style ?? null,
        slug,
        persona_id: parsed.persona_id ?? null,
        language: parsed.language ?? 'English',
        description: parsed.description ?? null,
        // Active + NameDrop-eligible by default (admin can uncheck on create).
        is_active: parsed.is_active ?? true,
        is_namedrop_eligible: parsed.is_namedrop_eligible ?? true,
      })
      .returning();

    logger.info('Admin created templated song', { id: row?.id, slug: row?.slug, persona_id: parsed.persona_id });
    return NextResponse.json({ success: true, templatedSong: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    logger.error('Admin create templated song error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('admin-templated-songs-list', listHandler);
export const POST = withApiLogger('admin-templated-songs-create', createHandler);
