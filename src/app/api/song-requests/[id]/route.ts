/**
 * Song Request API
 * GET /api/song-requests/[id]
 * Fetches song request data with lyrics and song status
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  songRequestsTable,
  lyricsDraftsTable,
  userSongsTable,
  packagesTable,
  auditLogEventsTable,
  changeRequestsTable,
  templatedSongsTable,
  songsTable,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';

async function getHandler(
  req: NextRequest,
  { params, logger }: { params: Promise<{ id: string }> } & ApiLoggerContext
) {
  try {
    const { id: idParam } = await params;
    const requestId = parseInt(idParam);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Get song request with package info
    const requests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, requestId))
      .limit(1);

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'Song request not found' },
        { status: 404 }
      );
    }

    const { songRequest, package: packageData } = requests[0];

    // Get latest lyrics draft
    const lyricsDrafts = await db
      .select()
      .from(lyricsDraftsTable)
      .where(eq(lyricsDraftsTable.song_request_id, requestId))
      .orderBy(desc(lyricsDraftsTable.version))
      .limit(1);

    const lyricsDraft = lyricsDrafts.length > 0 ? lyricsDrafts[0] : null;

    // Get user song if exists
    const songs = await db
      .select()
      .from(userSongsTable)
      .where(eq(userSongsTable.song_request_id, requestId))
      .limit(1);

    const song = songs.length > 0 ? songs[0] : null;

    // Get change requests for this song request
    const changeRequests = await db
      .select()
      .from(changeRequestsTable)
      .where(eq(changeRequestsTable.song_request_id, requestId))
      .orderBy(desc(changeRequestsTable.created_at));

    // Count all change requests (no status field anymore)
    const changeRequestCount = changeRequests.length;

    let nameDropTemplateTitle: string | null = null;
    if (songRequest.namedrop_template_id) {
      const tplRows = await db
        .select({
          templateTitle: templatedSongsTable.template_title,
          title: templatedSongsTable.title,
        })
        .from(templatedSongsTable)
        .where(eq(templatedSongsTable.id, songRequest.namedrop_template_id))
        .limit(1);
      if (tplRows.length > 0) {
        nameDropTemplateTitle =
          tplRows[0].templateTitle || tplRows[0].title || null;
      }
    }

    let sourceSongTitle: string | null = null;
    if (songRequest.source_song_id) {
      const libRows = await db
        .select({ title: songsTable.title })
        .from(songsTable)
        .where(eq(songsTable.id, songRequest.source_song_id))
        .limit(1);
      sourceSongTitle = libRows[0]?.title ?? null;
    }

    return NextResponse.json({
      success: true,
      data: {
        songRequest: {
          id: songRequest.id,
          recipientDetails: songRequest.recipient_details,
          occasion: songRequest.occasion,
          languages: songRequest.languages,
          mood: songRequest.mood,
          songStory: songRequest.song_story,
          lyricsInputMode: (songRequest as any).lyrics_input_mode || 'story',
          inputLyrics: (songRequest as any).input_lyrics || null,
          mobile_number: songRequest.mobile_number,
          email: songRequest.email,
          status: songRequest.status,
          fulfillmentStatus: songRequest.fulfillment_status,
          priority: songRequest.priority,
          deliveryDate: songRequest.delivery_date?.toString().split('T')[0] || null,
          eventDate: songRequest.event_date?.toString().split('T')[0] || null,
          initialRequirementsText: songRequest.initial_requirements_text,
          assignee: songRequest.assignee,
          createdAt: songRequest.created_at.toISOString(),
          languagePreferences: songRequest.language_preferences,
          musicStyleChips: songRequest.music_style_chips,
          musicStyleNotes: songRequest.music_style_notes,
          sourceSongId: songRequest.source_song_id,
          sourceSongTitle,
          namedropTemplateId: songRequest.namedrop_template_id,
          nameDropTemplateTitle,
          requestSource: songRequest.request_source,
          package: packageData ? {
            id: packageData.id,
            name: packageData.name,
            slug: packageData.slug,
            price: packageData.price,
            expert_created: packageData.expert_created,
          } : null,
          changeRequestCount,
        },
        lyricsDraft: lyricsDraft ? {
          id: lyricsDraft.id,
          title: lyricsDraft.song_title,
          lyrics: lyricsDraft.customer_lyrics || '',
          displayLyrics: lyricsDraft.customer_lyrics || '',
          status: lyricsDraft.status,
          version: lyricsDraft.version,
          createdAt: lyricsDraft.created_at.toISOString(),
        } : null,
        song: song ? {
          id: song.id,
          slug: song.slug,
          status: song.status,
          songVariants: song.song_variants,
          createdAt: song.created_at.toISOString(),
        } : null,
        changeRequests: changeRequests.map((cr) => ({
          id: cr.id,
          songRequestId: cr.song_request_id,
          songId: cr.song_id,
          description: cr.description,
          createdAt: cr.created_at.toISOString(),
          updatedAt: cr.updated_at.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching song request', error as any);
    return NextResponse.json(
      { error: 'Failed to fetch song request' },
      { status: 500 }
    );
  }
}

function getISTNowAsUTCInstant(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const by: any = {};
  for (const p of parts) {
    if (p.type !== 'literal') by[p.type] = p.value;
  }
  const year = Number(by.year);
  const month = Number(by.month);
  const day = Number(by.day);
  const hour = Number(by.hour);
  const minute = Number(by.minute);
  const second = Number(by.second);
  // This constructs a UTC instant corresponding to IST wall time now
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function getTodayISTDateString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const by: any = {};
  for (const p of parts) {
    if (p.type !== 'literal') by[p.type] = p.value;
  }
  // en-CA gives YYYY-MM-DD ordering via parts
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

async function logAuditSongRequest(id: number, action: string, before: any, after: any) {
  await db.insert(auditLogEventsTable).values({
    entity_type: 'song_request',
    entity_id: String(id),
    action,
    before: before ? JSON.stringify(before) as any : null,
    after: after ? JSON.stringify(after) as any : null,
    created_at: new Date(),
  });
}

async function patchHandler(
  req: NextRequest,
  { params, logger }: { params: Promise<{ id: string }> } & ApiLoggerContext
) {
  try {
    const { id: idParam } = await params;
    const requestId = parseInt(idParam);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await req.json();
    const {
      fulfillmentStatus,
      priority,
      deliveryDate, // YYYY-MM-DD string
      eventDate,    // YYYY-MM-DD string
      initialRequirementsText,
      assignee,
    } = body || {};

    const existingRows = await db.select().from(songRequestsTable).where(eq(songRequestsTable.id, requestId)).limit(1);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }
    const before = existingRows[0];

    const updates: any = { updated_at: new Date() };

    if (fulfillmentStatus && ['pending', 'shared', 'change_requested', 'completed'].includes(fulfillmentStatus)) {
      updates.fulfillment_status = fulfillmentStatus;
    }

    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      updates.priority = priority;
    }

    if (typeof initialRequirementsText === 'string') {
      if (initialRequirementsText.length > 5000) {
        return NextResponse.json({ error: 'initialRequirementsText too long (max 5000 chars)' }, { status: 400 });
      }
      updates.initial_requirements_text = initialRequirementsText;
    }

    if (assignee !== undefined) {
      if (assignee === null || assignee === '') {
        updates.assignee = null;
      } else if (typeof assignee === 'string') {
        updates.assignee = assignee.trim() || null;
      }
    }

    // IST validations - no historical entries
    if (deliveryDate !== undefined) {
      if (deliveryDate === null) {
        updates.delivery_date = null;
      } else if (typeof deliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
        const todayIst = getTodayISTDateString();
        if (deliveryDate < todayIst) {
          return NextResponse.json({ error: 'deliveryDate cannot be in the past (IST)' }, { status: 400 });
        }
        // Store as date (db will handle date type)
        updates.delivery_date = deliveryDate as any;
      } else {
        return NextResponse.json({ error: 'Invalid deliveryDate (expected YYYY-MM-DD)' }, { status: 400 });
      }
    }

    if (eventDate !== undefined) {
      if (eventDate === null) {
        updates.event_date = null;
      } else if (typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
        const todayIst = getTodayISTDateString();
        if (eventDate < todayIst) {
          return NextResponse.json({ error: 'eventDate cannot be in the past (IST)' }, { status: 400 });
        }
        // Store as date (db will handle date type)
        updates.event_date = eventDate as any;
      } else {
        return NextResponse.json({ error: 'Invalid eventDate (expected YYYY-MM-DD)' }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ success: true, data: before });
    }

    const [after] = await db.update(songRequestsTable).set(updates).where(eq(songRequestsTable.id, requestId)).returning();
    await logAuditSongRequest(requestId, 'song_request.update', before, after);
    return NextResponse.json({ success: true, data: after });
  } catch (error) {
    logger.error('Error updating song request', error as any);
    return NextResponse.json({ error: 'Failed to update song request' }, { status: 500 });
  }
}

export const GET = withApiLogger('get-song-request', getHandler);
export const PATCH = withApiLogger('update-song-request', patchHandler);
