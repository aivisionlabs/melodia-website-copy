import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  personaAssociationsTable,
  personasTable,
  songsTable,
  userSongsTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pid = Number(id);

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
      .where(eq(personasTable.id, pid));

    if (!rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const p = rows[0].persona;
    const a = rows[0].association;

    let audioUrl: string | null = null;
    let linkedTo: { type: 'song' | 'user_song'; id: number } | null = null;

    if (a?.song_id) {
      const songs = await db
        .select({
          id: songsTable.id,
          suno_variants: songsTable.suno_variants,
          selected_variant: songsTable.selected_variant,
          song_url: songsTable.song_url,
          song_url_variant_1: songsTable.song_url_variant_1,
        })
        .from(songsTable)
        .where(eq(songsTable.id, a.song_id))
        .limit(1);
      if (songs.length) {
        const s = songs[0] as any;
        const variants = Array.isArray(s.suno_variants)
          ? s.suno_variants
          : s.suno_variants
            ? Object.values(s.suno_variants)
            : [];
        const idx = typeof s.selected_variant === 'number' ? s.selected_variant : 0;
        const selected = variants[idx];
        audioUrl = selected?.sourceAudioUrl || selected?.audioUrl || selected?.streamAudioUrl || s.song_url || s.song_url_variant_1 || null;
        linkedTo = { type: 'song', id: s.id };
      }
    } else if (a?.user_song_id) {
      const songs = await db
        .select({
          id: userSongsTable.id,
          song_variants: userSongsTable.song_variants,
        })
        .from(userSongsTable)
        .where(eq(userSongsTable.id, a.user_song_id))
        .limit(1);
      if (songs.length) {
        const us = songs[0] as any;
        const variants = Array.isArray(us.song_variants)
          ? us.song_variants
          : us.song_variants
            ? Object.values(us.song_variants)
            : [];
        const idx = 0;
        const selected = variants[idx];
        audioUrl = selected?.sourceAudioUrl || selected?.audioUrl || selected?.streamAudioUrl || null;
        linkedTo = { type: 'user_song', id: us.id };
      }
    }

    return NextResponse.json({
      success: true,
      persona: {
        id: p.id,
        sunoPersonaId: p.suno_persona_id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at,
        audioUrl,
        linkedTo,
      },
    });
  } catch (error: any) {
    console.error('Get persona error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch persona' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pid = Number(id);
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    if (!parsed.name && !parsed.description) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db
      .update(personasTable)
      .set({
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.description ? { description: parsed.description } : {}),
      })
      .where(eq(personasTable.id, pid));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Update persona error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update persona' },
      { status: 500 }
    );
  }
}
