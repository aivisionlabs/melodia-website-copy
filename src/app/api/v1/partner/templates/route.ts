/**
 * Partner API – List templated songs
 * GET /api/v1/partner/templates?occasion=...&page=1&limit=20&includeLyrics=true
 *
 * Wraps the existing templated-songs list with API-key auth, occasion → categorySlug mapping,
 * and page/limit pagination with a pagination object.
 * Use `title` (not `template_title`) for end-user display — `template_title` is a processed form for generation.
 * Each template includes `description` — a short blurb for who the song suits best (e.g. "Perfect for kids' birthday parties").
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  templatedSongsTable,
  templatedSongCategoriesTable,
  categoriesTable,
} from '@/lib/db/schema';
import { eq, asc, inArray, and, count, sql } from 'drizzle-orm';
import { withPartnerAuth, type PartnerAuthContext } from '@/lib/partner-api/auth';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { toMediaUrl, preferMelodiaLogoOverTempfileSourceImage } from '@/lib/utils/url';
import {
  getCategorySlugsForPartnerTemplatesOccasion,
  usesMultiCategoryPartnerTemplateOrdering,
} from '@/lib/occasion-category-mapping';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function handler(
  req: NextRequest,
  auth: PartnerAuthContext,
  context: { logger: any; requestId?: string },
) {
  const { logger } = context;
  const requestId = context.requestId || generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const occasion = searchParams.get('occasion')?.trim() || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const includeLyrics = searchParams.get('includeLyrics') === 'true';

    // Partner templates only expose NameDrop-eligible songs.
    const baseConditions = and(
      eq(templatedSongsTable.is_active, true),
      eq(templatedSongsTable.is_namedrop_eligible, true),
    )!;

    let totalCount: number;
    let templates: Array<{
      id: number;
      title: string;
      template_title: string | null;
      slug: string;
      song_variants: unknown;
      selected_variant: number | null;
      display_order: number | null;
      language: string | null;
      template_lyrics?: string | null;
      description: string | null;
      tags: string[];
    }>;

    const selectFields = {
      id: templatedSongsTable.id,
      title: templatedSongsTable.title,
      template_title: templatedSongsTable.template_title,
      slug: templatedSongsTable.slug,
      song_variants: templatedSongsTable.song_variants,
      selected_variant: templatedSongsTable.selected_variant,
      display_order: templatedSongsTable.display_order,
      language: templatedSongsTable.language,
      ...(includeLyrics ? { template_lyrics: templatedSongsTable.template_lyrics } : {}),
      description: templatedSongsTable.description,
      tags: templatedSongsTable.tags,
    };

    if (occasion === 'birthday') {
      // Fixed split: 5 kids birthday songs first, then 10 adult birthday songs.
      const makeQuery = (slug: string, cap: number) =>
        db
          .select(selectFields)
          .from(templatedSongsTable)
          .innerJoin(
            templatedSongCategoriesTable,
            eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id),
          )
          .innerJoin(
            categoriesTable,
            and(
              eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
              eq(categoriesTable.slug, slug),
            ),
          )
          .where(baseConditions)
          // Order by the per-category display_order (admin reorder), not the global one.
          .orderBy(asc(templatedSongCategoriesTable.display_order), asc(templatedSongsTable.id))
          .limit(cap);

      const [kidsRows, adultRows] = await Promise.all([makeQuery('birthday', 5), makeQuery('adult-birthday', 10)]);

      templates = [...kidsRows, ...adultRows];
      totalCount = templates.length;
    } else if (occasion) {
      const categorySlugs = getCategorySlugsForPartnerTemplatesOccasion(occasion);
      const categoryFilter =
        categorySlugs.length === 1
          ? eq(categoriesTable.slug, categorySlugs[0]!)
          : inArray(categoriesTable.slug, categorySlugs);

      const [countResult] = await db
        .select({ count: sql<number>`count(distinct ${templatedSongsTable.id})` })
        .from(templatedSongsTable)
        .innerJoin(
          templatedSongCategoriesTable,
          eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id),
        )
        .innerJoin(
          categoriesTable,
          and(
            eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
            categoryFilter,
          ),
        )
        .where(baseConditions);
      totalCount = Number(countResult?.count ?? 0);

      const orderByExpressions = [];
      if (usesMultiCategoryPartnerTemplateOrdering(categorySlugs)) {
        orderByExpressions.push(
          sql`MIN(CASE
            WHEN ${categoriesTable.slug} = ${categorySlugs[0]} THEN 0
            WHEN ${categoriesTable.slug} = ${categorySlugs[1]} THEN 1
            ELSE 2
          END)`,
        );
        // Rows are grouped by song id, so aggregate the per-category display_order.
        orderByExpressions.push(
          sql`MIN(${templatedSongCategoriesTable.display_order})`,
          asc(templatedSongsTable.id),
        );
      } else {
        // Single category: one junction row per song — order by its category display_order.
        orderByExpressions.push(
          asc(templatedSongCategoriesTable.display_order),
          asc(templatedSongsTable.id),
        );
      }

      const listQuery = db
        .select(selectFields)
        .from(templatedSongsTable)
        .innerJoin(
          templatedSongCategoriesTable,
          eq(templatedSongCategoriesTable.templated_song_id, templatedSongsTable.id),
        )
        .innerJoin(
          categoriesTable,
          and(
            eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
            categoryFilter,
          ),
        )
        .where(baseConditions)
        .orderBy(...orderByExpressions)
        .limit(limit)
        .offset(offset);

      // One row per template even if a song were tagged in both slugs
      templates =
        usesMultiCategoryPartnerTemplateOrdering(categorySlugs)
          ? await listQuery.groupBy(templatedSongsTable.id)
          : await listQuery;
    } else {
      const [countResult] = await db
        .select({ count: count() })
        .from(templatedSongsTable)
        .where(baseConditions);
      totalCount = countResult?.count ?? 0;

      templates = await db
        .select(selectFields)
        .from(templatedSongsTable)
        .where(baseConditions)
        .orderBy(asc(templatedSongsTable.display_order), asc(templatedSongsTable.id))
        .limit(limit)
        .offset(offset);
    }

    // Fetch categories for returned templates
    const templateIds = templates.map((t) => t.id);
    const categoriesByTemplate = new Map<number, Array<{ id: number; name: string; slug: string }>>();

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
          eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
        )
        .where(inArray(templatedSongCategoriesTable.templated_song_id, templateIds));

      for (const row of categoryRows) {
        const list = categoriesByTemplate.get(row.templated_song_id) ?? [];
        list.push({ id: row.id, name: row.name, slug: row.slug });
        categoriesByTemplate.set(row.templated_song_id, list);
      }
    }

    // Build response: extract thumbnail_url and song_url from selected variant
    const templatedSongs = templates.map((t) => {
      const variants = Array.isArray(t.song_variants) ? t.song_variants : [];
      const selectedIdx = t.selected_variant ?? 0;
      const selectedVariant = variants[selectedIdx] as Record<string, any> | undefined;

      // Merge language + description into the language field: "language - (description)"
      const language =
        t.language && t.description
          ? `${t.language} - (${t.description})`
          : t.language;

      return {
        id: t.id,
        title: t.title,
        template_title: t.template_title,
        slug: t.slug,
        language,
        display_order: t.display_order,
        description: t.description,
        tags: t.tags,
        categories: categoriesByTemplate.get(t.id) ?? [],
        thumbnail_url: toMediaUrl(
          preferMelodiaLogoOverTempfileSourceImage(
            selectedVariant?.sourceImageUrl || selectedVariant?.imageUrl || null,
          ),
        ),
        song_url: toMediaUrl(selectedVariant?.sourceAudioUrl || selectedVariant?.audioUrl || null),
        ...(includeLyrics ? { template_lyrics: t.template_lyrics } : {}),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Partner API: list templates', {
      vendorId: auth.vendor.id,
      occasion,
      page,
      limit,
      includeLyrics,
      count: templatedSongs.length,
      totalCount,
    });

    return NextResponse.json({
      success: true,
      templatedSongs,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'partner-api-templates',
      requestId,
      additionalData: { vendorId: auth.vendor.id },
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list templates.', request_id: requestId } },
      { status: 500 },
    );
  }
}

const authedHandler = withPartnerAuth(handler);
const loggedHandler = withApiLogger('partner-api-templates', authedHandler);
export const GET = withRateLimit('partner.templates', loggedHandler);