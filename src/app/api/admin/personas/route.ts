import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createPersonaFromSource } from '@/lib/services/persona-service';
import { db } from '@/lib/db';
import {
  personaAssociationsTable,
  personasTable,
  songsTable,
  userSongsTable,
  lyricsDraftsTable,
} from '@/lib/db/schema';
import { and, eq, isNotNull, desc, inArray } from 'drizzle-orm';

const createSchema = z.object({
  songId: z.number().optional(),
  userSongId: z.number().optional(),
  name: z.string().min(2),
  description: z.string().min(2),
  variantIndex: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.parse(body);

    if (!!parsed.songId === !!parsed.userSongId) {
      return NextResponse.json(
        { error: 'Provide exactly one of songId or userSongId' },
        { status: 400 }
      );
    }

    const result = await createPersonaFromSource({
      songId: parsed.songId,
      userSongId: parsed.userSongId,
      name: parsed.name,
      description: parsed.description,
      variantIndex: parsed.variantIndex,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Create persona error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create persona' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const songId = searchParams.get('songId');
    const userSongId = searchParams.get('userSongId');
    const q = searchParams.get('q')?.toLowerCase() || '';

    // Basic join fetch
    const rows = await db
      .select({
        persona: personasTable,
        association: personaAssociationsTable,
      })
      .from(personasTable)
      .leftJoin(
        personaAssociationsTable,
        eq(personaAssociationsTable.persona_id, personasTable.id)
      )
      .where(
        and(
          songId ? eq(personaAssociationsTable.song_id, Number(songId)) : isNotNull(personasTable.id),
          userSongId ? eq(personaAssociationsTable.user_song_id, Number(userSongId)) : isNotNull(personasTable.id),
        )
      );

    // Collect all song_ids and user_song_ids for batch fetching
    const songIds = new Set<number>();
    const userSongIds = new Set<number>();
    const userSongRequestIds = new Set<number>();

    for (const row of rows) {
      const a = row.association;
      if (a?.song_id) {
        songIds.add(a.song_id);
      } else if (a?.user_song_id) {
        userSongIds.add(a.user_song_id);
      }
    }

    // Batch fetch all songs in one query
    const songsMap = new Map<number, any>();
    if (songIds.size > 0) {
      const songs = await db
        .select({
          id: songsTable.id,
          title: songsTable.title,
          suno_variants: songsTable.suno_variants,
          selected_variant: songsTable.selected_variant,
          song_url: songsTable.song_url,
          song_url_variant_1: songsTable.song_url_variant_1,
        })
        .from(songsTable)
        .where(inArray(songsTable.id, Array.from(songIds)));

      for (const song of songs) {
        songsMap.set(song.id, song);
      }
    }

    // Batch fetch all user_songs in one query
    const userSongsMap = new Map<number, any>();
    if (userSongIds.size > 0) {
      const userSongs = await db
        .select({
          id: userSongsTable.id,
          song_request_id: userSongsTable.song_request_id,
          song_variants: userSongsTable.song_variants,
        })
        .from(userSongsTable)
        .where(inArray(userSongsTable.id, Array.from(userSongIds)));

      for (const userSong of userSongs) {
        userSongsMap.set(userSong.id, userSong);
        if (userSong.song_request_id) {
          userSongRequestIds.add(userSong.song_request_id);
        }
      }
    }

    // Batch fetch all lyrics drafts in one query
    const lyricsDraftsMap = new Map<number, string>();
    if (userSongRequestIds.size > 0) {
      // Get latest version for each request
      const allDrafts = await db
        .select({
          song_request_id: lyricsDraftsTable.song_request_id,
          song_title: lyricsDraftsTable.song_title,
          version: lyricsDraftsTable.version,
        })
        .from(lyricsDraftsTable)
        .where(inArray(lyricsDraftsTable.song_request_id, Array.from(userSongRequestIds)))
        .orderBy(desc(lyricsDraftsTable.version));

      // Keep only the latest version for each request
      for (const draft of allDrafts) {
        if (!lyricsDraftsMap.has(draft.song_request_id) && draft.song_title) {
          lyricsDraftsMap.set(draft.song_request_id, draft.song_title);
        }
      }
    }

    // Resolve audio preview URL and linked entity label
    const results = [];
    for (const row of rows) {
      const p = row.persona;
      const a = row.association;

      let audioUrl: string | null = null;
      let linkedTo: { type: 'song' | 'user_song'; id: number } | null = null;
      let referenceSongTitle: string | null = null;
      let referenceVariant: number | null = null;

      if (a?.song_id) {
        const s = songsMap.get(a.song_id);
        if (s) {
          referenceSongTitle = s.title || null;
          const variants = Array.isArray(s.suno_variants)
            ? s.suno_variants
            : s.suno_variants
              ? Object.values(s.suno_variants)
              : [];
          const idx = typeof p.variant_index === 'number' ? p.variant_index : (typeof s.selected_variant === 'number' ? s.selected_variant : 0);
          const selected = variants[idx];
          audioUrl = selected?.sourceAudioUrl || selected?.audioUrl || selected?.streamAudioUrl || s.song_url || s.song_url_variant_1 || null;
          linkedTo = { type: 'song', id: s.id };
          referenceVariant = idx;
        }
      } else if (a?.user_song_id) {
        const us = userSongsMap.get(a.user_song_id);
        if (us) {
          // Get title from lyrics draft
          if (us.song_request_id) {
            referenceSongTitle = lyricsDraftsMap.get(us.song_request_id) || null;
          }
          const variants = Array.isArray(us.song_variants)
            ? us.song_variants
            : us.song_variants
              ? Object.values(us.song_variants)
              : [];
          const idx = typeof p.variant_index === 'number' ? p.variant_index : 0;
          const selected = variants[idx];
          audioUrl = selected?.sourceAudioUrl || selected?.audioUrl || selected?.streamAudioUrl || null;
          linkedTo = { type: 'user_song', id: us.id };
          referenceVariant = idx;
        }
      }

      // Filter by q if provided (name/description)
      if (q) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) {
          continue;
        }
      }

      results.push({
        id: p.id,
        sunoPersonaId: p.suno_persona_id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at,
        audioUrl,
        linkedTo,
        referenceSongTitle,
        referenceVariant,
        variantIndex: p.variant_index,
      });
    }

    return NextResponse.json({ success: true, personas: results });
  } catch (error: any) {
    console.error('List personas error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list personas' },
      { status: 500 }
    );
  }
}


