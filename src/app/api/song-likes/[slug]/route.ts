import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { incrementSongLike } = await import('@/lib/db/services')
    const { libraryCache } = await import('@/lib/cache')
    const { slug } = await params
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid slug' }, { status: 400 })
    }

    await incrementSongLike(slug)

    // Invalidate cache to ensure fresh data on next fetch
    libraryCache.invalidateLikes()

    // Revalidate Next.js cache tags for song data
    revalidateTag('songs', {})
    revalidateTag('library', {})
    revalidateTag(`song-${slug}`, {})

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error in like route:', error)
    return NextResponse.json({ success: false, error: 'Failed to like song' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { decrementSongLike } = await import('@/lib/db/services')
    const { libraryCache } = await import('@/lib/cache')
    const { slug } = await params
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid slug' }, { status: 400 })
    }

    await decrementSongLike(slug)

    // Invalidate cache to ensure fresh data on next fetch
    libraryCache.invalidateLikes()

    // Revalidate Next.js cache tags for song data
    revalidateTag('songs', {})
    revalidateTag('library', {})
    revalidateTag(`song-${slug}`, {})

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error in unlike route:', error)
    return NextResponse.json({ success: false, error: 'Failed to unlike song' }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { getSongBySlug } = await import('@/lib/db/services')
    const { slug } = await params
    const song = await getSongBySlug(slug)
    if (!song) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, likes: song.likes_count ?? 0 })
  } catch (error) {
    console.error('Error fetching likes:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch likes' }, { status: 500 })
  }
}


