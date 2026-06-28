import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentsTable, songRequestsTable, packagesTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: true, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Check if payment exists and is completed for this request
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.song_request_id, parseInt(requestId)),
          eq(paymentsTable.status, 'completed')
        )
      )
      .limit(1);

    if (payments.length === 0) {
      return NextResponse.json({
        success: true,
        isCompleted: false,
      });
    }

    // Get package info to check if Prime customer
    const songRequests = await db
      .select({
        songRequest: songRequestsTable,
        package: packagesTable,
      })
      .from(songRequestsTable)
      .leftJoin(packagesTable, eq(packagesTable.id, songRequestsTable.package_id))
      .where(eq(songRequestsTable.id, parseInt(requestId)))
      .limit(1);


    console.log("🔍 Song request package:", songRequests[0]?.package);
    const isPrime = songRequests[0]?.package?.expert_created === true;

    return NextResponse.json({
      success: true,
      isCompleted: true,
      isPrime,
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

