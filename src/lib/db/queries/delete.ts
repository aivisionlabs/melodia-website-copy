import { eq } from 'drizzle-orm';
import { db } from '../index';
import { songCategoriesTable } from '../schema';

export async function clearSongCategoriesForSong(songId: number) {
  await db.delete(songCategoriesTable).where(eq(songCategoriesTable.song_id, songId));
}

export async function clearAllSongCategoryMappings() {
  await db.delete(songCategoriesTable).where(eq(songCategoriesTable.song_id, songCategoriesTable.song_id));
}

export async function deleteOrphanCategories() {
  // Remove categories that are not referenced by any songCategories row (safety optional)
  await db.execute(`
    DELETE FROM categories c
    WHERE NOT EXISTS (
      SELECT 1 FROM song_categories sc WHERE sc.category_id = c.id
    );
  ` as unknown as any);
}


