import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path } = await params;

    if (!path) {
      return NextResponse.json(
        { error: 'Audio path is required' },
        { status: 400 }
      );
    }

    // Construct the full URL to the media server
    // Handle paths with or without .mp3 extension
    const cleanPath = path.endsWith('.mp3') ? path : `${path}.mp3`;
    const mediaUrl = `https://media.melodia-songs.com/christmas-audio/${cleanPath}`;

    // Fetch the audio file from the media server
    const response = await fetch(mediaUrl, {
      headers: {
        'Accept': 'audio/mpeg, audio/*, */*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: response.status }
      );
    }

    // Get the audio data as a stream
    const audioBuffer = await response.arrayBuffer();

    // Return the audio with proper CORS headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error proxying Christmas audio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

