import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { songFeedbackReasonsTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(songFeedbackReasonsTable)
      .where(eq(songFeedbackReasonsTable.active, true))
      .orderBy(songFeedbackReasonsTable.sequence)

    const reasons = rows.map(r => ({ id: r.id, code: r.code, label: r.label }))
    return NextResponse.json({ success: true, reasons })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load reasons' }, { status: 500 })
  }
}


