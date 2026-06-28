import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { songCategoriesTable, categoriesTable } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
    const { categories } = body;

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Categories must be an array' }, { status: 400 });
    }

    // Start a transaction to update categories
    await db.transaction(async (tx) => {
      // First, remove all existing categories for this song
      await tx
        .delete(songCategoriesTable)
        .where(eq(songCategoriesTable.song_id, songId));

      // If there are categories to add, insert them
      if (categories.length > 0) {
        // Get category IDs for the provided category names
        const categoryRecords = await tx
          .select({ id: categoriesTable.id, name: categoriesTable.name })
          .from(categoriesTable)
          .where(inArray(categoriesTable.name, categories));

        // Create song-category relationships
        const songCategoryInserts = categoryRecords.map(category => ({
          song_id: songId,
          category_id: category.id,
        }));

        if (songCategoryInserts.length > 0) {
          await tx.insert(songCategoriesTable).values(songCategoryInserts);
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Categories updated successfully'
    });
  } catch (error) {
    console.error('Error updating song categories:', error);
    return NextResponse.json(
      { error: 'Failed to update categories' },
      { status: 500 }
    );
  }
}
