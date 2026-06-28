/**
 * Resolve reference lyrics for a persona (for structure matching in lyrics generation).
 * Uses persona_associations: song_id -> songs.lyrics, or user_song_id -> lyrics_drafts for that request.
 */

import { db } from '@/lib/db';
import {
  personaAssociationsTable,
  songsTable,
  userSongsTable,
  lyricsDraftsTable,
  templatedSongsTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Returns reference lyrics for the given persona (from its linked song or user_song), or null.
 * Used to pass as sourceSongLyrics when generating lyrics so the LLM matches structure/rhyme/tone.
 */
export async function getReferenceLyricsForPersona(
  personaId: number
): Promise<string | null> {
  const assocs = await db
    .select({
      songId: personaAssociationsTable.song_id,
      userSongId: personaAssociationsTable.user_song_id,
    })
    .from(personaAssociationsTable)
    .where(eq(personaAssociationsTable.persona_id, personaId))
    .limit(1);

  if (assocs.length === 0) {
    logger.debug('Persona has no association', { personaId });
    return null;
  }

  const a = assocs[0];

  if (a.songId != null) {
    const rows = await db
      .select({ customerLyrics: songsTable.customer_lyrics, lyrics: songsTable.lyrics })
      .from(songsTable)
      .where(eq(songsTable.id, a.songId))
      .limit(1);
    // Prefer customer_lyrics (romanized, LLM-readable) over lyrics (native script for audio model)
    const lyrics = (rows[0]?.customerLyrics?.trim() || rows[0]?.lyrics?.trim());
    if (lyrics) {
      logger.info('Persona reference lyrics from song', {
        personaId,
        songId: a.songId,
        lyricsLength: lyrics.length,
      });
      return lyrics;
    }
    logger.debug('Persona linked song has no lyrics', {
      personaId,
      songId: a.songId,
    });
    return null;
  }

  if (a.userSongId != null) {
    const userSongs = await db
      .select({ songRequestId: userSongsTable.song_request_id })
      .from(userSongsTable)
      .where(eq(userSongsTable.id, a.userSongId))
      .limit(1);
    const requestId = userSongs[0]?.songRequestId;
    if (requestId == null) {
      logger.debug('Persona linked user_song has no song_request_id', {
        personaId,
        userSongId: a.userSongId,
      });
      return null;
    }
    const drafts = await db
      .select({
        customerLyrics: lyricsDraftsTable.customer_lyrics,
      })
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, requestId))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);
    const text = drafts[0]?.customerLyrics?.trim();
    if (text) {
      logger.info('Persona reference lyrics from user_song lyrics_draft', {
        personaId,
        userSongId: a.userSongId,
        songRequestId: requestId,
        lyricsLength: text.length,
      });
      return text;
    }
    logger.debug('Persona linked user_song has no lyrics draft', {
      personaId,
      userSongId: a.userSongId,
      songRequestId: requestId,
    });
    return null;
  }

  logger.debug('Persona association has neither song_id nor user_song_id', {
    personaId,
  });
  return null;
}

/**
 * Reference lyrics for a library song id (songs table or request-linked draft).
 * Used when the admin/customer flow picks a specific style template (source song).
 */
export async function getReferenceLyricsForLibrarySongId(
  songId: number
): Promise<string | null> {
  const rows = await db
    .select({
      customerLyrics: songsTable.customer_lyrics,
      lyrics: songsTable.lyrics,
      songRequestId: songsTable.song_request_id,
    })
    .from(songsTable)
    .where(eq(songsTable.id, songId))
    .limit(1);
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  // Prefer customer_lyrics (romanized, LLM-readable) over lyrics (native script for audio model)
  const fromSong = (row.customerLyrics?.trim() || row.lyrics?.trim());
  if (fromSong) {
    logger.info('Reference lyrics from library song row', { songId, length: fromSong.length });
    return fromSong;
  }
  if (row.songRequestId != null) {
    const drafts = await db
      .select({ customerLyrics: lyricsDraftsTable.customer_lyrics })
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, row.songRequestId))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);
    const text = drafts[0]?.customerLyrics?.trim() ?? null;
    if (text) {
      logger.info('Reference lyrics from draft for song request', {
        songId,
        songRequestId: row.songRequestId,
        length: text.length,
      });
      return text;
    }
  }
  logger.debug('Library song has no usable reference lyrics', { songId });
  return null;
}

/**
 * Reference lyrics for a catalog templated song (create-song wizard style match).
 */
export async function getReferenceLyricsForTemplatedSongId(
  templateId: number,
): Promise<string | null> {
  const rows = await db
    .select({
      templateLyrics: templatedSongsTable.template_lyrics,
      draftLyrics: templatedSongsTable.draft_lyrics,
    })
    .from(templatedSongsTable)
    .where(eq(templatedSongsTable.id, templateId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const lyrics =
    rows[0].templateLyrics?.trim() || rows[0].draftLyrics?.trim() || null;

  if (lyrics) {
    logger.info('Reference lyrics from templated song', {
      templateId,
      length: lyrics.length,
    });
  } else {
    logger.debug('Templated song has no usable reference lyrics', { templateId });
  }

  return lyrics;
}
