import { NextRequest, NextResponse } from 'next/server';
import { getCategorySlugForOccasionLabel } from '@/lib/occasion-category-mapping';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_OFFSET = 5000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const occasion = (searchParams.get('occasion') || '').trim();
    const limitRaw = searchParams.get('limit') || '12';
    const limit = Math.min(Math.max(Number.parseInt(limitRaw, 10) || 12, 1), 24);
    const offsetRaw = searchParams.get('offset') || '0';
    const offset = Math.min(
      Math.max(Number.parseInt(offsetRaw, 10) || 0, 0),
      MAX_OFFSET,
    );

    const categorySlug = getCategorySlugForOccasionLabel(occasion);
    if (!categorySlug) {
      logger.info('Persona templates: no category for occasion', {
        apiName: 'persona-templates',
        occasion,
        offset,
        limit,
      });
      return NextResponse.json({
        success: true,
        songs: [],
        hasMore: false,
        total: 0,
        offset,
        limit,
      });
    }

    const { getSongsWithPersonaByCategorySlugPaginated } = await import('@/lib/db/queries/select');
    const { songs: rows, total } =
      await getSongsWithPersonaByCategorySlugPaginated(categorySlug, limit, offset);

    // `suno_variants` is already reduced to an object containing `sourceImageUrl` by the query.
    const songs = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      imageUrl: r?.suno_variants?.sourceImageUrl ?? null,
      song_url: r.song_url ?? null,
      service_provider: r.service_provider ?? null,
    }));

    const hasMore = offset + rows.length < total;

    logger.info('Persona templates fetched', {
      apiName: 'persona-templates',
      occasion,
      categorySlug,
      offset,
      limit,
      returned: songs.length,
      total,
      hasMore,
    });

    return NextResponse.json({
      success: true,
      songs,
      hasMore,
      total,
      offset,
      limit,
    });
  } catch (error) {
    logger.error('Persona templates fetch failed', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}


