import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songRequestsTable } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all song requests sorted by created_at descending
    const requests = await db
      .select({
        id: songRequestsTable.id,
        recipient_details: songRequestsTable.recipient_details,
        occasion: songRequestsTable.occasion,
        created_at: songRequestsTable.created_at,
      })
      .from(songRequestsTable)
      .orderBy(desc(songRequestsTable.created_at));

    // Format for dropdown
    const formattedRequests = requests.map(req => ({
      id: req.id,
      label: `Request #${req.id} - ${req.recipient_details}${req.occasion ? ` (${req.occasion})` : ''} - ${new Date(req.created_at).toLocaleDateString()}`,
      recipientDetails: req.recipient_details,
      occasion: req.occasion,
      createdAt: req.created_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Error fetching song requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch song requests' },
      { status: 500 }
    );
  }
}

