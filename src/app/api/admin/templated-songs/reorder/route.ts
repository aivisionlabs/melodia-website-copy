/**
 * Admin: Reorder templated songs within a category
 * PUT /api/admin/templated-songs/reorder
 * Body: { categoryId: number, orderedSongIds: number[] }
 * Sets display_order = index position for each song in the given category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { templatedSongCategoriesTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';

const reorderSchema = z.object({
  categoryId: z.number().int().positive(),
  orderedSongIds: z.array(z.number().int().positive()).min(1),
});

async function putHandler(req: NextRequest, { logger }: { logger: any }) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
    }

    const { categoryId, orderedSongIds } = parsed.data;

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedSongIds.length; i++) {
        await tx
          .update(templatedSongCategoriesTable)
          .set({ display_order: i })
          .where(
            and(
              eq(templatedSongCategoriesTable.category_id, categoryId),
              eq(templatedSongCategoriesTable.templated_song_id, orderedSongIds[i])
            )
          );
      }
    });

    logger.info('Admin reordered templated songs in category', {
      categoryId,
      count: orderedSongIds.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin reorder templated songs error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder' },
      { status: 500 }
    );
  }
}

export const PUT = withApiLogger('admin-templated-songs-reorder', putHandler);
