import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable, personaAssociationsTable, personasTable, lyricsDraftsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';

export const GET = withApiLogger('admin-song-details', async (
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
    const songId = parseInt(id, 10);
    if (Number.isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    // Get song with basic information
    const songs = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        lyrics: songsTable.lyrics,
        music_style: songsTable.music_style,
        song_request_id: songsTable.song_request_id,
        metadata: songsTable.metadata,
      })
      .from(songsTable)
      .where(eq(songsTable.id, songId))
      .limit(1);

    if (!songs || songs.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = songs[0];

    // Initialize response data
    let lyrics: string | null = song.lyrics;
    let musicStyle: string | null = song.music_style;
    let persona: any = null;

    // If lyrics are not directly available, try to get them from lyrics drafts
    if (!lyrics && song.song_request_id) {
      try {
        const lyricsDraft = await db
          .select({
            customer_lyrics: lyricsDraftsTable.customer_lyrics,
            music_style: lyricsDraftsTable.music_style,
          })
          .from(lyricsDraftsTable)
          .where(eq(lyricsDraftsTable.song_request_id, song.song_request_id))
          .orderBy(lyricsDraftsTable.version)
          .limit(1);

        if (lyricsDraft && lyricsDraft.length > 0) {
          lyrics = lyricsDraft[0].customer_lyrics;
          if (!musicStyle) {
            musicStyle = lyricsDraft[0].music_style;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch lyrics from drafts:', error);
      }
    }

    // Fetch persona information if available
    try {
      const personaData = await db
        .select({
          persona: {
            id: personasTable.id,
            name: personasTable.name,
            description: personasTable.description,
            variant_index: personasTable.variant_index,
            suno_persona_id: personasTable.suno_persona_id,
          },
        })
        .from(personaAssociationsTable)
        .innerJoin(personasTable, eq(personaAssociationsTable.persona_id, personasTable.id))
        .where(eq(personaAssociationsTable.song_id, songId))
        .limit(1);

      if (personaData && personaData.length > 0) {
        const p = personaData[0];
        persona = {
          id: p.persona.id,
          name: p.persona.name,
          description: p.persona.description,
          variantIndex: p.persona.variant_index,
          sunoPersonaId: p.persona.suno_persona_id,
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