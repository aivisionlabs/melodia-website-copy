import { NextRequest, NextResponse } from 'next/server';
import { getSongById } from '@/lib/db/services';
import { logger } from '@/lib/logger';
import type { Song } from '@/types';

export const runtime = 'nodejs';

function extractImageUrl(song: any): string | null {
  const variants: any = song?.suno_variants as any;
  if (variants && typeof variants === 'object' && 'sourceImageUrl' in variants) {
    return (variants as any).sourceImageUrl ?? null;
  }
  if (Array.isArray(variants) && variants.length > 0) {
    return variants[0]?.sourceImageUrl ?? null;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const songId = Number.parseInt(id, 10);
    if (!Number.isFinite(songId) || songId <= 0) {
      logger.warn('library-song invalid id', { id, apiName: 'library-song-by-id' });
      return NextResponse.json({ success: false, error: 'Invalid song id' }, { status: 400 });
    }

    const song = (await getSongById(songId)) as Song | null;
    if (!song) {
      logger.info('library-song not found', { songId, apiName: 'library-song-by-id' });
      return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    }

    logger.info('library-song fetched', { songId, apiName: 'library-song-by-id' });
    return NextResponse.json({
      success: true,
      song: {
        id: song.id,
        title: song.title,
        slug: song.slug,
        imageUrl: extractImageUrl(song),
        song_url: song.song_url ?? null,
        service_provider: song.service_provider ?? null,
      },
    });
  } catch (error) {
    logger.error('Error fetching library song by id', {
      error: error as Error,
      apiName: 'library-song-by-id',
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch song' },
      { status: 500 }
    );
  }
}






