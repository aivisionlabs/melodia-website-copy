/**
 * Category slugs that have at least one active templated song (NameDrop / template picker).
 * GET /api/templated-songs/categories
 * Used to drive which create-flow occasions can load real templates (no hardcoded list).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templatedSongsTable, templatedSongCategoriesTable, categoriesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';

async function handler(req: NextRequest, context: { logger: any; requestId?: string }) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  const { logger } = context;
  try {
    const rows = await db
      .select({ slug: categoriesTable.slug })
      .from(templatedSongsTable)
      .innerJoin(
        templatedSongCategoriesTable,
        eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id),
      )
      .innerJoin(
        categoriesTable,
        eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
      )
      .where(eq(templatedSongsTable.is_active, true));

    const categorySlugs = [...new Set(rows.map((r) => r.slug).filter(Boolean))];

    logger.info('Templated-song template category slugs', { count: categorySlugs.length });

    return NextResponse.json({
      success: true,
      categorySlugs,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-categories',
      requestId: context.requestId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list template categories' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('templated-songs-categories', handler);
