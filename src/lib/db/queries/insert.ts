import { db } from '../index';
import { InsertSong, categoriesTable, songCategoriesTable, songsTable } from '../schema';

export async function createSong(data: InsertSong) {
  try {
    const result = await db.insert(songsTable).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Database insert error:', error);
    throw new Error(`Failed query: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
}

export async function upsertCategoryBySlug(category: { name: string; slug: string; sequence?: number }) {
  // Try insert; on conflict slug, update name/sequence
  const inserted = await db.insert(categoriesTable).values({
    name: category.name,
    slug: category.slug,
    sequence: category.sequence ?? 0,
  }).onConflictDoUpdate({
    target: categoriesTable.slug,
    set: { name: category.name, sequence: category.sequence ?? 0 },
  }).returning();
  return inserted[0];
}

export async function addSongCategory(songId: number, categoryId: number) {
  // Avoid duplicates via unique constraint in DB (to be added later if needed)
  await db.insert(songCategoriesTable).values({ song_id: songId, category_id: categoryId }).onConflictDoNothing();
}