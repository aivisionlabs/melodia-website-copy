/**
 * List templated songs (public)
 * GET /api/templated-songs
 * Query: categorySlug (optional) - filter to templates that have this category.
 * Returns active templated songs ordered by display_order with song_variants and categories per template.
 * When categorySlug is set, includes effective promotion_tag for that category and sorts tagged songs first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  templatedSongsTable,
  templatedSongCategoriesTable,
  categoriesTable,
} from '@/lib/db/schema';
import { eq, asc, inArray, and, count, SQL } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { mapSongVariantsRecordForResponse } from '@/lib/utils/url';
import {
  resolveEffectivePromotionTag,
  type TemplatedPromotionTag,
} from '@/lib/templated-songs/promotion-tag';

async function handler(req: NextRequest, context: { logger: any; requestId?: string }) {
  const { logger } = context;
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('categorySlug')?.trim() || null;
    const includeLyrics = searchParams.get('includeLyrics') === 'true';
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const namedropParam = searchParams.get('namedrop');
    const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 12, 1), 50) : null;
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0;

    const namedropCondition: SQL | null =
      namedropParam === 'true' ? eq(templatedSongsTable.is_namedrop_eligible, true)
        : namedropParam === 'false' ? eq(templatedSongsTable.is_namedrop_eligible, false)
          : null;

    const baseConditions = namedropCondition
      ? and(eq(templatedSongsTable.is_active, true), namedropCondition)!
      : eq(templatedSongsTable.is_active, true);

    const baseSelect = {
      id: templatedSongsTable.id,
      title: templatedSongsTable.title,
      template_title: templatedSongsTable.template_title,
      slug: templatedSongsTable.slug,
      song_variants: templatedSongsTable.song_variants,
      selected_variant: templatedSongsTable.selected_variant,
      display_order: templatedSongsTable.display_order,
      language: templatedSongsTable.language,
      description: templatedSongsTable.description,
      tags: templatedSongsTable.tags,
      first_activated_at: templatedSongsTable.first_activated_at,
      ...(includeLyrics ? { template_lyrics: templatedSongsTable.template_lyrics } : {}),
    };

    type TemplateRow = {
      id: number;
      title: string;
      template_title: string | null;
      template_lyrics?: string | null;
      slug: string;
      song_variants: unknown;
      selected_variant: number | null;
      display_order: number | null;
      language: string | null;
      description: string | null;
      tags: string[];
      first_activated_at: Date | null;
      category_display_order?: number;
      junction_promotion_tag?: TemplatedPromotionTag | null;
      junction_suppress_auto_new?: boolean;
    };

    let templates: TemplateRow[];
    let total = 0;

    if (categorySlug) {
      if (limit !== null) {
        const [countResult] = await db
          .select({ total: count() })
          .from(templatedSongsTable)
          .innerJoin(
            templatedSongCategoriesTable,
            eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id)
          )
          .innerJoin(
            categoriesTable,
            and(
              eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
              eq(categoriesTable.slug, categorySlug)
            )
          )
          .where(baseConditions);
        total = Number(countResult?.total ?? 0);
      }

      const withCategoryQuery = db
        .select({
          ...baseSelect,
          category_display_order: templatedSongCategoriesTable.display_order,
          junction_promotion_tag: templatedSongCategoriesTable.promotion_tag,
          junction_suppress_auto_new: templatedSongCategoriesTable.suppress_auto_new,
        })
        .from(templatedSongsTable)
        .innerJoin(
          templatedSongCategoriesTable,
          eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id)
        )
        .innerJoin(
          categoriesTable,
          and(
            eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
            eq(categoriesTable.slug, categorySlug)
          )
        )
        .where(baseConditions)
        .orderBy(asc(templatedSongCategoriesTable.display_order), asc(templatedSongsTable.id));

      templates = limit !== null
        ? await withCategoryQuery.limit(limit).offset(offset)
        : await withCategoryQuery;
    } else {
      if (limit !== null) {
        const [countResult] = await db
          .select({ total: count() })
          .from(templatedSongsTable)
          .where(baseConditions);
        total = Number(countResult?.total ?? 0);
      }

      const baseQuery = db
        .select(baseSelect)
        .from(templatedSongsTable)
        .where(baseConditions)
        .orderBy(asc(templatedSongsTable.display_order), asc(templatedSongsTable.id));

      templates = limit !== null
        ? await baseQuery.limit(limit).offset(offset)
        : await baseQuery;
    }

    const templateIds = templates.map((t) => t.id);
    const categoriesByTemplate = new Map<
      number,
      Array<{ id: number; name: string; slug: string }>
    >();

    if (templateIds.length > 0) {
      const categoryRows = await db
        .select({
          templated_song_id: templatedSongCategoriesTable.templated_song_id,
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
        })
        .from(templatedSongCategoriesTable)
        .innerJoin(
          categoriesTable,
          eq(categoriesTable.id, templatedSongCategoriesTable.category_id)
        )
        .where(inArray(templatedSongCategoriesTable.templated_song_id, templateIds));

      for (const row of categoryRows) {
        const list = categoriesByTemplate.get(row.templated_song_id) ?? [];
        list.push({ id: row.id, name: row.name, slug: row.slug });
        categoriesByTemplate.set(row.templated_song_id, list);
      }
    }

    const now = new Date();

    let templatedSongs = templates.map((t) => {
      const promotion_tag = categorySlug
        ? resolveEffectivePromotionTag({
          promotionTag: t.junction_promotion_tag ?? null,
          suppressAutoNew: t.junction_suppress_auto_new ?? false,
          firstActivatedAt: t.first_activated_at,
          now,
        })
        : null;

      const {
        junction_promotion_tag: _junctionPromotionTag,
        junction_suppress_auto_new: _junctionSuppressAutoNew,
        category_display_order: _categoryDisplayOrder,
        first_activated_at: _firstActivatedAt,
        ...rest
      } = t;

      return {
        ...rest,
        title: t.title ?? t.template_title,
        song_variants: mapSongVariantsRecordForResponse(t.song_variants),
        categories: categoriesByTemplate.get(t.id) ?? [],
        promotion_tag,
      };
    });

    if (categorySlug) {
      // Sort strictly by the admin-configured category display_order, with id
      // as a stable tie-break. Promotion tags do not affect ordering.
      templatedSongs = [...templatedSongs].sort((a, b) => {
        const orderA = templates.find((row) => row.id === a.id)?.category_display_order ?? 0;
        const orderB = templates.find((row) => row.id === b.id)?.category_display_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.id - b.id;
      });
    }

    const hasMore = limit !== null ? offset + templatedSongs.length < total : false;

    logger.info('List templated songs', {
      count: templatedSongs.length,
      total: limit !== null ? total : templatedSongs.length,
      categorySlug: categorySlug ?? undefined,
      includeLyrics,
      limit: limit ?? 'all',
      offset,
      hasMore,
      taggedCount: templatedSongs.filter((song) => song.promotion_tag).length,
    });

    return NextResponse.json({
      success: true,
      templatedSongs,
      ...(limit !== null ? { total, hasMore, offset, limit } : {}),
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-list',
      requestId: context.requestId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list templated songs' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogger('templated-songs-list', handler);
