/**
 * Partner API – Sample songs
 * GET /api/v1/partner/sample?page=1&limit=10
 *
 * Returns songs from the library sorted by likes_count descending.
 * Response structure matches /api/v1/partner/templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songsTable,
  songCategoriesTable,
  categoriesTable,
} from '@/lib/db/schema';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { withPartnerAuth, type PartnerAuthContext } from '@/lib/partner-api/auth';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { toMediaUrl, preferMelodiaLogoOverTempfileSourceImage } from '@/lib/utils/url';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const offset = (page - 1) * limit;

    const baseConditions = and(
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false),
    );

    // Run count and songs queries in parallel
    const [countResult, songs] = await Promise.all([
      db
        .select({ count: count() })
        .from(songsTable)
        .where(baseConditions),
      db
        .select({
          id: songsTable.id,
          title: songsTable.title,
          slug: songsTable.slug,
          suno_variants: songsTable.suno_variants,
          selected_variant: songsTable.selected_variant,
          language: songsTable.language,
          lyrics: songsTable.lyrics,
          likes_count: songsTable.likes_count,
        })
        .from(songsTable)
        .where(baseConditions)
        .orderBy(desc(songsTable.likes_count), desc(songsTable.sequence), desc(songsTable.created_at))
        .limit(limit)
        .offset(offset),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    // Fetch categories for returned songs
    const songIds = songs.map((s) => s.id);
    const categoriesBySong = new Map<number, Array<{ id: number; name: string; slug: string }>>();

    if (songIds.length > 0) {
      const categoryRows = await db
        .select({
          song_id: songCategoriesTable.song_id,
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
        })
        .from(songCategoriesTable)
        .innerJoin(
          categoriesTable,
          eq(categoriesTable.id, songCategoriesTable.category_id),
        )
        .where(inArray(songCategoriesTable.song_id, songIds));

      for (const row of categoryRows) {
        const list = categoriesBySong.get(row.song_id) ?? [];
        list.push({ id: row.id, name: row.name, slug: row.slug });
        categoriesBySong.set(row.song_id, list);
      }
    }

    const sampleSongs = songs.map((s) => {
      const variants = Array.isArray(s.suno_variants) ? s.suno_variants : [];
      const selectedIdx = s.selected_variant ?? 0;
      const selectedVariant = variants[selectedIdx] as Record<string, any> | undefined;

      return {
        id: s.id,
        title: s.title,
        slug: s.slug,
        language: s.language,
        categories: categoriesBySong.get(s.id) ?? [],
        thumbnail_url: toMediaUrl(
          preferMelodiaLogoOverTempfileSourceImage(
            selectedVariant?.sourceImageUrl || selectedVariant?.imageUrl || null,
          ),
        ),
        song_url: toMediaUrl(selectedVariant?.sourceAudioUrl || selectedVariant?.audioUrl || null),
        lyrics: s.lyrics,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Partner API: list sample songs', {
      vendorId: auth.vendor.id,
      page,
      limit,
      count: sampleSongs.length,
      totalCount,
    });

    return NextResponse.json(
      {
        success: true,
        songs: sampleSongs,
        pagination: {
          page,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_previous_page: page > 1,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      },
    );
  } catch (error) {
    logStructuredError(error, {
      operation: 'partner-api-sample',
      requestId,
      additionalData: { vendorId: auth.vendor.id },
    });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list sample songs.', request_id: requestId } },
      { status: 500 },
    );
  }
}

const authedHandler = withPartnerAuth(handler);
const loggedHandler = withApiLogger('partner-api-sample', authedHandler);
export const GET = withRateLimit('partner.templates', loggedHandler);
