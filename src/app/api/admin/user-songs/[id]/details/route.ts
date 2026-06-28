import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { userSongsTable, lyricsDraftsTable, personaAssociationsTable, personasTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SunoAPIFactory } from '@/lib/suno-api';
import { withApiLogger } from '@/lib/logger/api-middleware';

export const GET = withApiLogger('admin-user-song-details', async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
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

    // Get user song with lyrics draft info
    const songs = await db
      .select({
        id: userSongsTable.id,
        song_request_id: userSongsTable.song_request_id,
        approved_lyrics_id: userSongsTable.approved_lyrics_id,
        metadata: userSongsTable.metadata,
      })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, userSongId))
      .limit(1);

    if (!songs || songs.length === 0) {
      return NextResponse.json({ error: 'User song not found' }, { status: 404 });
    }

    const song = songs[0];

    // Initialize response data
    let lyrics: string | null = null;
    let musicStyle: string | null = null;
    let persona: any = null;

    // 1. Fetch original lyrics from Suno response
    try {
      const taskId = (song.metadata as any)?.sunoTaskId as string | undefined;
      if (taskId) {
        const sunoAPI = SunoAPIFactory.getAPI();
        const recordInfo = await sunoAPI.getRecordInfo(taskId);

        if (recordInfo.code === 200) {
          const sunoDataRaw = recordInfo.data?.response?.sunoData;
          const variants: any[] = Array.isArray(sunoDataRaw)
            ? sunoDataRaw.filter(Boolean)
            : [];

          // Extract lyrics from the first variant (or any variant that has lyrics)
          for (const variant of variants) {
            const variantLyrics = extractLyricsTextFromVariant(variant);
            if (variantLyrics) {
              lyrics = variantLyrics;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch lyrics from Suno API:', error);
      // Continue without lyrics - this is not a critical error
    }

    // 2. Fetch music style from approved lyrics draft
    if (song.approved_lyrics_id) {
      try {
        const lyricsDraft = await db
          .select({
            music_style: lyricsDraftsTable.music_style,
          })
          .from(lyricsDraftsTable)
          .where(eq(lyricsDraftsTable.id, song.approved_lyrics_id))
          .limit(1);

        if (lyricsDraft && lyricsDraft.length > 0) {
          musicStyle = lyricsDraft[0].music_style;
        }
      } catch (error) {
        console.warn('Failed to fetch music style from lyrics draft:', error);
      }
    }

    // 3. Fetch persona information if available
    try {
      const personaData = await db
        .select({
          persona: {
            id: personasTable.id,
            name: personasTable.name,
            description: personasTable.description,
            variant_index: personasTable.variant_index,
          },
        })
        .from(personaAssociationsTable)
        .innerJoin(personasTable, eq(personaAssociationsTable.persona_id, personasTable.id))
        .where(eq(personaAssociationsTable.user_song_id, userSongId))
        .limit(1);

      if (personaData && personaData.length > 0) {
        const p = personaData[0];
        persona = {
          id: p.persona.id,
          name: p.persona.name,
          description: p.persona.description,
          variantIndex: p.persona.variant_index,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch persona information:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        lyrics,
        musicStyle,
        persona,
      },
    });
  } catch (error) {
    console.error('Error fetching song details for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch song details' },
      { status: 500 }
    );
  }
});

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