import { db } from '@/lib/db';
import {
  personasTable,
  songsTable,
  userSongsTable,
  templatedSongsTable,
  songCategoriesTable,
  templatedSongCategoriesTable,
  lyricsDraftsTable,
} from '@/lib/db/schema';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { eq, desc } from 'drizzle-orm';
import { SunoAPIFactory } from '@/lib/suno-api';
import { generateBaseSlug } from '@/lib/utils/slug';

async function generateUniqueTemplatedSongSlug(name: string): Promise<string> {
  const base = generateBaseSlug(name || 'voice-template');
  let slug = base;
  let counter = 1;
  while (counter <= 1000) {
    const existing = await db
      .select({ id: templatedSongsTable.id })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.slug, slug))
      .limit(1);
    if (existing.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
  return `${base}-${Date.now()}`;
}

const SUNO_API_URL = process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY || process.env.SUNO_API_TOKEN || '';

type CreatePersonaInput = {
  songId?: number;
  userSongId?: number;
  name: string;
  description: string;
  variantIndex?: number;
};

export async function createPersonaFromSource(input: CreatePersonaInput) {
  if (!!input.songId === !!input.userSongId) {
    throw new Error('Provide exactly one of songId or userSongId');
  }

  // Resolve identifiers from selected variant, plus extra data for templated_songs
  let sourceTaskId: string | undefined;
  let sourceAudioId: string | undefined;
  let finalVariantIndex: number = 0;
  let templateTitle: string = input.name;
  let templateDraftLyrics: string | null = null;
  let templateMusicStyle: string | null = null;
  let templateLanguage: string = 'English';
  let templateSongVariants: unknown = {};
  let templateSelectedVariant: number = 0;

  if (input.songId) {
    const songs = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        lyrics: songsTable.lyrics,
        music_style: songsTable.music_style,
        language: songsTable.language,
        suno_task_id: songsTable.suno_task_id,
        suno_variants: songsTable.suno_variants,
        selected_variant: songsTable.selected_variant,
      })
      .from(songsTable)
      .where(eq(songsTable.id, input.songId))
      .limit(1);
    if (songs.length === 0) {
      throw new Error('Song not found');
    }
    const s = songs[0] as any;
    sourceTaskId = s.suno_task_id ?? undefined;
    const variants = Array.isArray(s.suno_variants)
      ? s.suno_variants
      : s.suno_variants
        ? Object.values(s.suno_variants)
        : [];

    finalVariantIndex = typeof input.variantIndex === 'number' ? input.variantIndex : (typeof s.selected_variant === 'number' ? s.selected_variant : 0);
    const selected = variants[finalVariantIndex];
    sourceAudioId = selected?.id;

    templateTitle = s.title || input.name;
    templateDraftLyrics = s.lyrics ?? null;
    templateMusicStyle = s.music_style ?? null;
    templateLanguage = s.language ?? 'English';
    templateSongVariants = s.suno_variants ?? {};
    templateSelectedVariant = s.selected_variant ?? 0;
  } else if (input.userSongId) {
    const userSongs = await db
      .select({
        id: userSongsTable.id,
        song_request_id: userSongsTable.song_request_id,
        song_variants: userSongsTable.song_variants,
        metadata: userSongsTable.metadata,
      })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, input.userSongId))
      .limit(1);
    if (userSongs.length === 0) {
      throw new Error('User song not found');
    }
    const us = userSongs[0] as any;
    const variants = Array.isArray(us.song_variants)
      ? us.song_variants
      : us.song_variants
        ? Object.values(us.song_variants)
        : [];

    finalVariantIndex = typeof input.variantIndex === 'number' ? input.variantIndex : 0;
    const selected = variants[finalVariantIndex];
    sourceAudioId = selected?.id;
    sourceTaskId = us.metadata?.sunoTaskId ?? undefined;

    templateSongVariants = us.song_variants ?? {};
    templateSelectedVariant = finalVariantIndex;

    if (us.song_request_id) {
      const drafts = await db
        .select({
          song_title: lyricsDraftsTable.song_title,
          customer_lyrics: lyricsDraftsTable.customer_lyrics,
          music_style: lyricsDraftsTable.music_style,
          language: lyricsDraftsTable.language,
        })
        .from(lyricsDraftsTable)
        .where(eq(lyricsDraftsTable.song_request_id, us.song_request_id))
        .orderBy(desc(lyricsDraftsTable.version))
        .limit(1);
      if (drafts.length > 0) {
        const d = drafts[0] as any;
        templateTitle = d.song_title || input.name;
        templateDraftLyrics = d.customer_lyrics ?? null;
        templateMusicStyle = d.music_style ?? null;
        templateLanguage = d.language ?? 'English';
      }
    }
  }

  if (!sourceTaskId || !sourceAudioId) {
    throw new Error('Selected variant is missing taskId or audioId');
  }

  // Create persona via Suno or demo
  let sunoPersonaId: string;
  if (isDemoModeEnabled()) {
    sunoPersonaId = `demo-persona-${Date.now()}`;
  } else {
    const resp = await fetch(`${SUNO_API_URL}/generate/generate-persona`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: sourceTaskId,
        audioId: sourceAudioId,
        name: input.name,
        description: input.description,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Suno persona API error: ${text}`);
    }

    const json = await resp.json();
    if (json.code !== 200 || !json.data?.personaId) {
      throw new Error(json.msg || 'Failed to create persona');
    }
    sunoPersonaId = json.data.personaId;
  }

  // Store in DB
  try {
    const [persona] = await db
      .insert(personasTable)
      .values({
        suno_persona_id: sunoPersonaId,
        name: input.name,
        description: input.description,
        source_task_id: sourceTaskId,
        source_audio_id: sourceAudioId,
        variant_index: finalVariantIndex,
      })
      .returning();

    const slug = await generateUniqueTemplatedSongSlug(input.name);
    const [template] = await db
      .insert(templatedSongsTable)
      .values({
        title: templateTitle,
        draft_lyrics: templateDraftLyrics,
        template_lyrics: null,
        music_style: templateMusicStyle,
        persona_id: persona.id,
        language: templateLanguage,
        slug,
        is_active: false,
        is_namedrop_eligible: false,
        song_variants: templateSongVariants,
        selected_variant: templateSelectedVariant,
      })
      .returning();

    if (input.songId) {
      const songCats = await db
        .select({ category_id: songCategoriesTable.category_id })
        .from(songCategoriesTable)
        .where(eq(songCategoriesTable.song_id, input.songId));
      if (songCats.length > 0) {
        await db.insert(templatedSongCategoriesTable).values(
          songCats.map((sc, i) => ({
            templated_song_id: template.id,
            category_id: sc.category_id,
            display_order: i,
          }))
        );
      }
    }

    return {
      success: true,
      persona: {
        id: persona.id,
        sunoPersonaId: persona.suno_persona_id,
        name: persona.name,
        description: persona.description,
        variantIndex: persona.variant_index,
      },
      templatedSong: {
        id: template.id,
        slug: template.slug,
      },
    };
  } catch (error: any) {
    console.error('Create persona DB error:', error);
    // Unique violation (likely suno_persona_id collision)
    if (error?.code === '23505') {
      throw new Error('Persona already exists for this audio (duplicate ID).');
    }
    throw error;
  }
}

export type CreatePersonaFromTemplatedSongInput = {
  templatedSongId: number;
  name: string;
  description: string;
};

/**
 * Create a Suno persona from a templated song's selected variant and store it
 * in the personas table, then set templated_songs.persona_id.
 * Used after lyrics processing so the template has a voice for user generations.
 */
export async function createPersonaFromTemplatedSong(
  input: CreatePersonaFromTemplatedSongInput
) {
  const rows = await db
    .select({
      id: templatedSongsTable.id,
      title: templatedSongsTable.title,
      suno_task_id: templatedSongsTable.suno_task_id,
      song_variants: templatedSongsTable.song_variants,
      selected_variant: templatedSongsTable.selected_variant,
      persona_id: templatedSongsTable.persona_id,
    })
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.id, input.templatedSongId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('Templated song not found');
  }

  const template = rows[0] as {
    id: number;
    title: string | null;
    suno_task_id: string | null;
    song_variants: unknown;
    selected_variant: number | null;
    persona_id: number | null;
  };

  if (template.persona_id != null) {
    return {
      success: true,
      persona: { id: template.persona_id },
      skipped: true,
      message: 'Template already has a persona',
    };
  }

  const sourceTaskId = template.suno_task_id?.trim() || null;
  if (!sourceTaskId) {
    throw new Error('Templated song has no suno_task_id');
  }

  const variantIndex = typeof template.selected_variant === 'number' ? template.selected_variant : 0;

  function getAudioIdFromVariant(v: unknown): string | undefined {
    if (!v || typeof v !== 'object') return undefined;
    const o = v as Record<string, unknown>;
    return [o.id, o.music_id, o.audioId].find(
      (x) => typeof x === 'string' && x.length > 0
    ) as string | undefined;
  }

  let variants: unknown[] = Array.isArray(template.song_variants)
    ? template.song_variants
    : template.song_variants && typeof template.song_variants === 'object'
      ? Object.values(template.song_variants as object)
      : [];

  let selected = variants[variantIndex];
  let sourceAudioId = getAudioIdFromVariant(selected);

  if (!sourceAudioId && variants.length === 0) {
    try {
      const api = SunoAPIFactory.getAPI();
      const record = await api.getRecordInfo(sourceTaskId);
      const sunoData = record?.data?.response?.sunoData;
      if (Array.isArray(sunoData) && sunoData.length > 0) {
        variants = sunoData;
        selected = sunoData[variantIndex];
        sourceAudioId = getAudioIdFromVariant(selected);
        await db
          .update(templatedSongsTable)
          .set({
            song_variants: sunoData,
            updated_at: new Date(),
          })
          .where(eq(templatedSongsTable.id, input.templatedSongId));
      }
    } catch (e) {
      console.error('Failed to fetch record info for templated song persona', e);
    }
  } else if (!sourceAudioId && selected) {
    sourceAudioId = getAudioIdFromVariant(selected);
  }

  if (!sourceAudioId) {
    throw new Error(
      'Templated song has no selected variant audio id (ensure generation completed and variants are stored)'
    );
  }

  let sunoPersonaId: string;
  if (isDemoModeEnabled()) {
    sunoPersonaId = `demo-persona-${Date.now()}`;
  } else {
    const resp = await fetch(`${SUNO_API_URL}/generate/generate-persona`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: sourceTaskId,
        audioId: sourceAudioId,
        name: input.name,
        description: input.description,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Suno persona API error: ${text}`);
    }

    const json = await resp.json();
    if (json.code !== 200 || !json.data?.personaId) {
      throw new Error(json.msg || 'Failed to create persona');
    }
    sunoPersonaId = json.data.personaId;
  }

  const [persona] = await db
    .insert(personasTable)
    .values({
      suno_persona_id: sunoPersonaId,
      name: input.name,
      description: input.description,
      source_task_id: sourceTaskId,
      source_audio_id: sourceAudioId,
      variant_index: variantIndex,
    })
    .returning();

  await db
    .update(templatedSongsTable)
    .set({
      persona_id: persona.id,
      updated_at: new Date(),
    })
    .where(eq(templatedSongsTable.id, input.templatedSongId));

  return {
    success: true,
    persona: {
      id: persona.id,
      sunoPersonaId: persona.suno_persona_id,
      name: persona.name,
      description: persona.description,
      variantIndex: persona.variant_index,
    },
  };
}
