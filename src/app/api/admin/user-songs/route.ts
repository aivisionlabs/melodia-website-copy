import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  userSongsTable,
  songRequestsTable,
  lyricsDraftsTable,
  usersTable,
  songsTable
} from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user songs with related data
    const userSongsWithData = await db
      .select({
        song: userSongsTable,
        request: {
          id: songRequestsTable.id,
          user_id: songRequestsTable.user_id,
          anonymous_user_id: songRequestsTable.anonymous_user_id,
          recipient_details: songRequestsTable.recipient_details,
          occasion: songRequestsTable.occasion,
          languages: songRequestsTable.languages,
          status: songRequestsTable.status,
          created_at: songRequestsTable.created_at,
        },
        user: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        },
        lyricsDraft: {
          song_title: lyricsDraftsTable.song_title,
          music_style: lyricsDraftsTable.music_style,
        },
        librarySong: {
          id: songsTable.id,
        },
      })
      .from(userSongsTable)
      .innerJoin(
        songRequestsTable,
        eq(userSongsTable.song_request_id, songRequestsTable.id)
      )
      .leftJoin(
        usersTable,
        eq(songRequestsTable.user_id, usersTable.id)
      )
      .leftJoin(
        lyricsDraftsTable,
        eq(userSongsTable.approved_lyrics_id, lyricsDraftsTable.id)
      )
      // LEFT JOIN to check if this user_song has been converted to library
      // Join condition: songs.user_song_id = user_songs.id
      // If a match exists, librarySong.id will be populated; otherwise it will be null
      .leftJoin(
        songsTable,
        eq(songsTable.user_song_id, userSongsTable.id)
      )
      .where(sql`${userSongsTable.is_deleted} = false OR ${userSongsTable.is_deleted} IS NULL`)
      .orderBy(desc(userSongsTable.created_at));

    // Format the response
    const formattedSongs = userSongsWithData.map(({ song, request, user, lyricsDraft, librarySong }) => {
      // Get title from metadata, lyrics draft, or fallback
      const title = (song.metadata as any)?.title ||
        lyricsDraft?.song_title ||
        `Song for ${request.recipient_details}` ||
        'Untitled Song';

      // Get variant count
      const variants = (song.song_variants as any) || {};
      const variantArray = Array.isArray(variants)
        ? variants
        : variants && typeof variants === 'object'
          ? Object.values(variants).filter(Boolean)
          : [];
      const variantCount = Array.isArray(variantArray) ? variantArray.length : 0;

      // Compute lightweight array of audio URLs for variants (for client to avoid extra API calls)
      const variantAudioUrls: Array<string | null> = (variantArray as any[]).map((v: any) => {
        return v?.audioUrl || v?.streamAudioUrl || v?.sourceAudioUrl || null;
      });

      // Check if song has been converted to library
      // Logic: If a row exists in songs table where songs.user_song_id = user_songs.id,
      // then librarySong.id will be populated (not null), meaning the song is in the library
      const is_converted_to_library = !!librarySong?.id;

      return {
        id: song.id,
        slug: song.slug,
        title,
        status: song.status || 'processing',
        created_at: song.created_at,
        request_id: song.song_request_id,
        recipient_details: request.recipient_details,
        occasion: request.occasion,
        languages: request.languages,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
        } : null,
        is_anonymous: !user && !!request.anonymous_user_id,
        variant_count: variantCount,
        music_style: lyricsDraft?.music_style || null,
        selected_variant: 0,
        is_converted_to_library,
        // Provide audio URLs (or nulls) for each variant so the UI can render players without per-card API calls
        variant_audio_urls: variantAudioUrls,
      };
    });

    return NextResponse.json({
      success: true,
      songs: formattedSongs,
      total: formattedSongs.length,
    });
  } catch (error) {
    console.error('Error fetching admin user songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user songs' },
      { status: 500 }
    );
  }
}

