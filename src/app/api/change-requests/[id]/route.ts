import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { changeRequestsTable, auditLogEventsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function logAudit(entityId: string, action: string, before: any, after: any) {
  await db.insert(auditLogEventsTable).values({
    entity_type: 'change_request',
    entity_id: String(entityId),
    action,
    before: before ? JSON.stringify(before) as any : null,
    after: after ? JSON.stringify(after) as any : null,
    created_at: new Date(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existingRows = await db.select().from(changeRequestsTable).where(eq(changeRequestsTable.id, id)).limit(1);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }
    const before = existingRows[0];

    const body = await req.json();
    const {
      description,
      songId,
    } = body || {};

    const updates: any = { updated_at: new Date() };

    if (typeof description === 'string') {
      if (description.trim().length === 0) {
        return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 });
      }
      if (description.length > 5000) {
        return NextResponse.json({ error: 'description too long (max 5000 chars)' }, { status: 400 });
      }
      updates.description = description.trim();
    }

    if (songId !== undefined) {
      if (songId === null) {
        updates.song_id = null;
      } else if (Number.isFinite(Number(songId))) {
        updates.song_id = Number(songId);
      } else {
        return NextResponse.json({ error: 'Invalid songId' }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 1) {
      // Only updated_at present
      return NextResponse.json({ success: true, data: before });
    }

    const [after] = await db.update(changeRequestsTable).set(updates).where(eq(changeRequestsTable.id, id)).returning();
    await logAudit(id, 'change_request.update', before, after);
    return NextResponse.json({ success: true, data: after });
  } catch (error) {
    console.error('Update change request error:', error);
    return NextResponse.json({ error: 'Failed to update change request' }, { status: 500 });
  }
}



