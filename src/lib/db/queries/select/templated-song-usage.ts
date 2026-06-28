/**
 * Templated song usage analytics — instance counts per template.
 */

import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../index';
import {
  categoriesTable,
  templatedSongCategoriesTable,
  templatedSongInstancesTable,
  templatedSongsTable,
} from '../../schema';

export type TemplatedSongUsageCategory = {
  id: number;
  name: string;
  slug: string;
};

export type TemplatedSongUsageStat = {
  template_id: number;
  title: string;
  slug: string;
  is_active: boolean;
  instance_count: number;
  completed_count: number;
  partner_count: number;
  consumer_count: number;
  last_used_at: string | null;
  categories: TemplatedSongUsageCategory[];
};

export type TemplatedSongUsageSummary = {
  total_instances: number;
  total_completed: number;
  templates_with_usage: number;
  total_templates: number;
};

/**
 * Per-template counts of generated songs (templated_song_instances).
 * Includes templates with zero usage. Sorted by instance_count descending.
 */
export async function getTemplatedSongUsageStats(): Promise<{
  summary: TemplatedSongUsageSummary;
  templates: TemplatedSongUsageStat[];
}> {
  const rows = await db
    .select({
      template_id: templatedSongsTable.id,
      title: templatedSongsTable.title,
      slug: templatedSongsTable.slug,
      is_active: templatedSongsTable.is_active,
      instance_count: sql<number>`count(${templatedSongInstancesTable.id})::int`,
      completed_count: sql<number>`coalesce(sum(case when ${templatedSongInstancesTable.status} = 'completed' then 1 else 0 end), 0)::int`,
      partner_count: sql<number>`coalesce(sum(case when ${templatedSongInstancesTable.partner_api_order_id} is not null then 1 else 0 end), 0)::int`,
      last_used_at: sql<string | null>`max(${templatedSongInstancesTable.created_at})`,
    })
    .from(templatedSongsTable)
    .leftJoin(
      templatedSongInstancesTable,
      eq(templatedSongInstancesTable.template_id, templatedSongsTable.id),
    )
    .groupBy(
      templatedSongsTable.id,
      templatedSongsTable.title,
      templatedSongsTable.slug,
      templatedSongsTable.is_active,
    )
    .orderBy(
      desc(sql`count(${templatedSongInstancesTable.id})`),
      asc(templatedSongsTable.title),
    );

  // Categories per template (many-to-many) — fetched separately to avoid
  // multiplying rows inside the aggregate count query above.
  const templateIds = rows.map((r) => r.template_id);
  const categoriesByTemplate = new Map<number, TemplatedSongUsageCategory[]>();
  if (templateIds.length > 0) {
    const categoryRows = await db
      .select({
        templated_song_id: templatedSongCategoriesTable.templated_song_id,
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
      })
      .from(templatedSongCategoriesTable)
      .innerJoin(
        categoriesTable,
        eq(categoriesTable.id, templatedSongCategoriesTable.category_id),
      )
      .where(inArray(templatedSongCategoriesTable.templated_song_id, templateIds));

    for (const row of categoryRows) {
      const list = categoriesByTemplate.get(row.templated_song_id) ?? [];
      list.push({ id: row.id, name: row.name, slug: row.slug });
      categoriesByTemplate.set(row.templated_song_id, list);
    }
  }

  const templates: TemplatedSongUsageStat[] = rows.map((r) => {
    const instance_count = Number(r.instance_count ?? 0);
    const partner_count = Number(r.partner_count ?? 0);
    return {
      template_id: r.template_id,
      title: r.title,
      slug: r.slug,
      is_active: r.is_active ?? true,
      instance_count,
      completed_count: Number(r.completed_count ?? 0),
      partner_count,
      consumer_count: instance_count - partner_count,
      last_used_at: r.last_used_at ?? null,
      categories: categoriesByTemplate.get(r.template_id) ?? [],
    };
  });

  const summary: TemplatedSongUsageSummary = {
    total_instances: templates.reduce((sum, t) => sum + t.instance_count, 0),
    total_completed: templates.reduce((sum, t) => sum + t.completed_count, 0),
    templates_with_usage: templates.filter((t) => t.instance_count > 0).length,
    total_templates: templates.length,
  };

  return { summary, templates };
}
