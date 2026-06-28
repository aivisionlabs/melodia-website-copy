/**
 * Admin: Set categories for a templated song
 * PUT /api/admin/templated-songs/[id]/categories
 * Body: { categoryIds: number[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  templatedSongCategoriesTable,
  templatedSongsTable,
  categoriesTable,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

const putSchema = z.object({
  categoryIds: z.array(z.number().int().positive()),
});

async function putHandler(
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
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { categoryIds } = parsed.data;

    const [template] = await db
      .select({ id: templatedSongsTable.id })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.id, id))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (categoryIds.length > 0) {
      const existingCategories = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, categoryIds));
      const validIds = new Set(existingCategories.map((c) => c.id));
      const invalidIds = categoryIds.filter((cid) => !validIds.has(cid));
      if (invalidIds.length > 0) {
        logger.warn('Admin templated song categories: invalid category ids', {
          templatedSongId: id,
          invalidIds,
        });
        return NextResponse.json(
          { error: 'Invalid category IDs', invalidIds },
          { status: 400 }
        );
      }
    }

    const existingJunctions = await db
      .select({
        category_id: templatedSongCategoriesTable.category_id,
        promotion_tag: templatedSongCategoriesTable.promotion_tag,
        suppress_auto_new: templatedSongCategoriesTable.suppress_auto_new,
        display_order: templatedSongCategoriesTable.display_order,
      })
      .from(templatedSongCategoriesTable)
      .where(eq(templatedSongCategoriesTable.templated_song_id, id));

    const promotionByCategoryId = new Map(
      existingJunctions.map((row) => [
        row.category_id,
        {
          promotion_tag: row.promotion_tag,
          suppress_auto_new: row.suppress_auto_new,
          display_order: row.display_order,
        },
      ])
    );

    await db.transaction(async (tx) => {
      await tx
        .delete(templatedSongCategoriesTable)
        .where(eq(templatedSongCategoriesTable.templated_song_id, id));

      if (categoryIds.length > 0) {
        await tx.insert(templatedSongCategoriesTable).values(
          categoryIds.map((category_id, index) => {
            const preserved = promotionByCategoryId.get(category_id);
            return {
              templated_song_id: id,
              category_id,
              display_order: preserved?.display_order ?? index,
              promotion_tag: preserved?.promotion_tag ?? null,
              suppress_auto_new: preserved?.suppress_auto_new ?? false,
            };
          })
        );
      }
    });

    logger.info('Admin updated templated song categories', {
      templatedSongId: id,
      categoryCount: categoryIds.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Categories updated successfully',
    });
  } catch (error) {
    logger.error('Admin update templated song categories error', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update categories',
      },
      { status: 500 }
    );
  }
}

export const PUT = withApiLogger(
  'admin-templated-songs-put-categories',
  putHandler
);
