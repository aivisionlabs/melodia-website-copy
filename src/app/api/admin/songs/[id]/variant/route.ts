import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const songId = parseInt(id);
    if (isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    const body = await request.json();
    const { variantIndex } = body;

    if (variantIndex === undefined || variantIndex === null) {
      return NextResponse.json(
        { error: 'Variant index is required' },
        { status: 400 }
      );
    }

    const variantIndexNum = parseInt(variantIndex);
    if (isNaN(variantIndexNum) || variantIndexNum < 0) {
      return NextResponse.json(
        { error: 'Invalid variant index' },
        { status: 400 }
      );
    }

    // Fetch the song to get variants
    const song = await db
      .select({
        id: songsTable.id,
        suno_variants: songsTable.suno_variants,
        selected_variant: songsTable.selected_variant,
      })
      .from(songsTable)
      .where(eq(songsTable.id, songId))
      .limit(1);

    if (!song || song.length === 0) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const songData = song[0];

    // Get variants array
    const rawVariants = songData.suno_variants;
    const variantsArray: any[] = Array.isArray(rawVariants)
      ? rawVariants
      : rawVariants && typeof rawVariants === "object"
        ? Object.values(rawVariants as any)
        : [];

    // Validate variant index
    if (variantIndexNum >= variantsArray.length) {
      return NextResponse.json(
        { error: `Variant index ${variantIndexNum} is out of range. Song has ${variantsArray.length} variant(s)` },
        { status: 400 }
      );
    }

    // Get the selected variant data
    const selectedVariant = variantsArray[variantIndexNum];
    if (!selectedVariant) {
      return NextResponse.json(
        { error: 'Selected variant data not found' },
        { status: 400 }
      );
    }

    // Update the song with the new selected variant
    const updateData: any = {
      selected_variant: variantIndexNum,
    };

    // Update song_url and duration from the selected variant
    if (selectedVariant.sourceAudioUrl || selectedVariant.audioUrl || selectedVariant.streamAudioUrl) {
      updateData.song_url = selectedVariant.sourceAudioUrl || selectedVariant.audioUrl || selectedVariant.streamAudioUrl;
    }

    if (selectedVariant.duration) {
      updateData.duration = selectedVariant.duration.toString();
    }

    await db
      .update(songsTable)
      .set(updateData)
      .where(eq(songsTable.id, songId));

    return NextResponse.json({
      success: true,
      songId,
      selected_variant: variantIndexNum,
      message: `Variant ${variantIndexNum + 1} selected successfully`,
    });
  } catch (error) {
    console.error('Error updating song variant:', error);
    return NextResponse.json(
      { error: 'Failed to update song variant' },
      { status: 500 }
    );
  }
}

