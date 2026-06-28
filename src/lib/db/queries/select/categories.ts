/**
 * Category queries - For managing song categories
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../index';
import { SelectCategory, categoriesTable, songsTable, songCategoriesTable, templatedSongCategoriesTable } from '../../schema';

/**
 * Get categories with counts of active, non-deleted songs
 * Only returns categories with 1+ songs
 * Optimized with better query performance
 */
export async function getCategoriesWithCounts(): Promise<Array<{
  id: number;
  name: string;
  slug: string;
  sequence: number | null;
  count: number
}>> {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      sequence: categoriesTable.sequence,
      count: sql<number>`count(${songsTable.id})`,
    })
    .from(categoriesTable)
    .innerJoin(songCategoriesTable, eq(songCategoriesTable.category_id, categoriesTable.id))
    .innerJoin(songsTable, and(
      eq(songCategoriesTable.song_id, songsTable.id),
      eq(songsTable.add_to_library, true),
      eq(songsTable.is_deleted, false)
    ))
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.slug, categoriesTable.sequence)
    .orderBy(categoriesTable.sequence, categoriesTable.name);

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sequence: r.sequence ?? 0,
    count: Number(r.count ?? 0),
  }));
}

/**
 * Get all categories with counts of associated active templated songs (LEFT JOIN).
 * Always returns every category, even those with zero templates.
 */
export async function getCategoriesWithTemplateCounts(): Promise<Array<{
  id: number;
  name: string;
  slug: string;
  sequence: number;
  template_count: number;
}>> {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      sequence: categoriesTable.sequence,
      template_count: sql<number>`count(${templatedSongCategoriesTable.templated_song_id})`,
    })
    .from(categoriesTable)
    .leftJoin(
      templatedSongCategoriesTable,
      eq(templatedSongCategoriesTable.category_id, categoriesTable.id),
    )
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.slug, categoriesTable.sequence)
    .orderBy(categoriesTable.sequence, categoriesTable.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sequence: r.sequence ?? 0,
    template_count: Number(r.template_count ?? 0),
  }));
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<SelectCategory | undefined> {
  const result = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);
  return result[0];
}

/**
 * List all categories (ordered by sequence, then name)
 */
export async function listAllCategories(): Promise<SelectCategory[]> {
  return db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.sequence, categoriesTable.name);
}

