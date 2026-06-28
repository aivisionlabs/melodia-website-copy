import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSongsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SunoAPIFactory } from '@/lib/suno-api';

function extractLyricsTextFromVariant(variant: any): string | null {
  if (!variant || typeof variant !== 'object') return null;

  const candidates: Array<unknown> = [
    // Some Suno payloads embed the full lyrics in prompt
    variant.prompt,
    variant.lyrics,
    variant.lyric,
    variant.promptLyrics,
    variant.prompt_lyrics,
    variant.text,
    variant?.metadata?.lyrics,
    variant?.meta?.lyrics,
    variant?.response?.lyrics,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }

  return null;
}

function buildLyricsDownloadText(variants: any[]): {
  text: string | null;
  foundCount: number;
} {
  const lines: string[] = [];
  let foundCount = 0;

  variants.forEach((v, idx) => {
    const lyrics = extractLyricsTextFromVariant(v);
    if (!lyrics) return;
    foundCount += 1;

    const title = (typeof v?.title === 'string' && v.title.trim()) ? v.title.trim() : `Variant ${idx + 1}`;
    const id = (typeof v?.id === 'string' && v.id.trim()) ? v.id.trim() : null;

    lines.push(`=== ${title}${id ? ` (${id})` : ''} ===`);
    lines.push(lyrics);
    lines.push(''); // spacer
  });

  const text = lines.join('\n').trim();
  return { text: text.length > 0 ? text : null, foundCount };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userSongId = parseInt(id, 10);
    if (Number.isNaN(userSongId)) {
      return NextResponse.json({ error: 'Invalid user song ID' }, { status: 400 });
    }

    const songs = await db
      .select({
        id: userSongsTable.id,
        slug: userSongsTable.slug,
        metadata: userSongsTable.metadata,
      })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, userSongId))
      .limit(1);

    if (!songs || songs.length === 0) {
      return NextResponse.json({ error: 'User song not found' }, { status: 404 });
    }

    const song = songs[0];
    const taskId = (song.metadata as any)?.sunoTaskId as string | undefined;

    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      return NextResponse.json(
        { error: 'No Suno taskId found for this user song' },
        { status: 400 }
      );
    }

    const sunoAPI = SunoAPIFactory.getAPI();
    const recordInfo = await sunoAPI.getRecordInfo(taskId.trim());

    if (recordInfo.code !== 200) {
      return NextResponse.json(
        { error: recordInfo.msg || 'Failed to fetch Suno record info' },
        { status: 502 }
      );
    }

    const sunoDataRaw = recordInfo.data?.response?.sunoData;
    const variants: any[] = Array.isArray(sunoDataRaw)
      ? sunoDataRaw.filter(Boolean)
      : [];

    const { text: lyricsText, foundCount } = buildLyricsDownloadText(variants);

    return NextResponse.json({
      success: true,
      userSongId: song.id,
      slug: song.slug,
      taskId: recordInfo.data?.taskId || taskId,
      variantCount: variants.length,
      lyricsFoundCount: foundCount,
      lyricsText, // null when not present in Suno response
    });
  } catch (error) {
    console.error('Error fetching Suno response for admin user song:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Suno response' },
      { status: 500 }
    );
  }
}


