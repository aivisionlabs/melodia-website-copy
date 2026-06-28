import { NextRequest, NextResponse } from 'next/server';
import { markSongRequestAsCompleted } from '@/lib/db/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id, 10);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const result = await markSongRequestAsCompleted(requestId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to mark request as completed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking song request as completed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

