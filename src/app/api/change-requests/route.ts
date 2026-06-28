import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { changeRequestsTable, auditLogEventsTable } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

function nowIso(): string {
  return new Date().toISOString();
}

async function logAudit(entityType: 'change_request', entityId: string, action: string, before: any, after: any) {
  await db.insert(auditLogEventsTable).values({
    entity_type: 'change_request',
    entity_id: String(entityId),
    action,
    before: before ? JSON.stringify(before) as any : null,
    after: after ? JSON.stringify(after) as any : null,
    created_at: new Date(),
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestIdParam = searchParams.get('requestId');

    const whereClauses: any[] = [];
    if (requestIdParam) {
      const idNum = Number(requestIdParam);
      if (!Number.isFinite(idNum)) {
        return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 });
      }
      whereClauses.push(eq(changeRequestsTable.song_request_id, idNum));
    }

    const rows = await db
      .select()
      .from(changeRequestsTable)
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined);

    return NextResponse.json({
      success: true,
      changeRequests: rows.map((cr) => ({
        id: cr.id,
        songRequestId: cr.song_request_id,
        songId: cr.song_id,
        description: cr.description,
        createdAt: cr.created_at.toISOString(),
        updatedAt: cr.updated_at.toISOString(),
      }))
    });
  } catch (error) {
    console.error('List change requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch change requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      songRequestId,
      description,
      songId,
    } = body || {};

    if (!songRequestId || !Number.isFinite(Number(songRequestId))) {
      return NextResponse.json({ error: 'songRequestId is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    if (description.length > 5000) {
      return NextResponse.json({ error: 'description too long (max 5000 chars)' }, { status: 400 });
    }

    const insertData: any = {
      song_request_id: Number(songRequestId),
      description: description.trim(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (songId !== undefined && songId !== null) {
      if (Number.isFinite(Number(songId))) {
        insertData.song_id = Number(songId);
      } else {
        return NextResponse.json({ error: 'Invalid songId' }, { status: 400 });
      }
    }

    const [created] = await db.insert(changeRequestsTable).values(insertData).returning();

    await logAudit('change_request', created.id, 'change_request.create', null, created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create change request error:', error);
    return NextResponse.json({ error: 'Failed to create change request' }, { status: 500 });
  }
}

