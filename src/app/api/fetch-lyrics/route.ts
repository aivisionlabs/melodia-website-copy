import { NextRequest, NextResponse } from 'next/server';
import { getLyricsDisplayData } from '@/lib/lyrics-display-actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestIdParam = searchParams.get('requestId');

    console.log('🔍 fetch-lyrics API called with requestId param:', requestIdParam);

    if (!requestIdParam) {
      console.error('❌ Missing requestId parameter');
      return NextResponse.json(
        { error: true, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requestId = parseInt(requestIdParam, 10);
    console.log('🔢 Parsed requestId:', requestId, '(from param:', requestIdParam + ')');

    if (isNaN(requestId) || requestId <= 0) {
      console.error('❌ Invalid requestId:', requestIdParam);
      return NextResponse.json(
        { error: true, message: `Invalid request ID: ${requestIdParam}` },
        { status: 400 }
      );
    }

    console.log('📡 Fetching lyrics display data for requestId:', requestId);
    // Get lyrics display data
    const data = await getLyricsDisplayData(requestId);

    console.log('📊 getLyricsDisplayData result:', data ? 'Found data' : 'No data');

    if (!data) {
      console.log('❌ Lyrics data not found for requestId:', requestId);
      return NextResponse.json(
        { error: true, message: 'Lyrics data not found' },
        { status: 404 }
      );
    }

    // Verify the returned data matches the requested ID
    if (data.songRequest && data.songRequest.id !== requestId) {
      console.error('🚨 CRITICAL: ID mismatch!', {
        requested: requestId,
        received: data.songRequest.id,
      });
      return NextResponse.json(
        { error: true, message: `Database returned wrong record! Requested ID ${requestId}, got ${data.songRequest.id}` },
        { status: 500 }
      );
    }

    console.log('✅ Verified song request ID matches:', data.songRequest?.id || 'N/A');
    console.log('✅ Returning lyrics data for requestId:', requestId);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching lyrics display data:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to fetch lyrics data' },
      { status: 500 }
    );
  }
}
