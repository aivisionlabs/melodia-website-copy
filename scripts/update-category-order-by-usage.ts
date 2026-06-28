/**
 * Update templated_song_categories.display_order based on how many times each
 * song was used in templated_song_instances (most-used first, display_order 0).
 *
 * Ranking is PER CATEGORY: a song's position is recomputed independently for
 * every category it belongs to. Ties (equal usage) fall back to the song's
 * current display_order, then id, so ordering is stable run-to-run.
 *
 * Usage:
 *   # Preview only (no writes):
 *   npx tsx scripts/update-category-order-by-usage.ts
 *   # Apply the changes:
 *   npx tsx scripts/update-category-order-by-usage.ts --apply
 *   # Limit to specific categories (repeatable):
 *   npx tsx scripts/update-category-order-by-usage.ts --category=fathers-day --category=birthday
 *   # Count only completed instances (default: count all instances):
 *   npx tsx scripts/update-category-order-by-usage.ts --status=completed
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import {
  templatedSongsTable,
  templatedSongCategoriesTable,
  categoriesTable,
  templatedSongInstancesTable,
} from '../src/lib/db/schema';
import { eq, sql, count, inArray } from 'drizzle-orm';

interface JunctionRow {
  junction_id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  song_id: number;
  title: string;
  current_order: number;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const statusArg = argv.find((a) => a.startsWith('--status='))?.split('=')[1] || null;
  const categoryFilters = argv
    .filter((a) => a.startsWith('--category='))
    .map((a) => a.split('=')[1])
    .filter(Boolean);

  // 1) Usage counts per template_id
  const usageRows = await db
    .select({
      template_id: templatedSongInstancesTable.template_id,
      uses: count(),
    })
    .from(templatedSongInstancesTable)
    .where(statusArg ? eq(templatedSongInstancesTable.status, statusArg) : sql`true`)
    .groupBy(templatedSongInstancesTable.template_id);

  const usageByTemplate = new Map<number, number>();
  for (const r of usageRows) usageByTemplate.set(r.template_id, Number(r.uses));

  // 2) All junction rows (optionally filtered by category slug)
  const junctionRows: JunctionRow[] = await db
    .select({
      junction_id: templatedSongCategoriesTable.id,
      category_id: templatedSongCategoriesTable.category_id,
      category_name: categoriesTable.name,
      category_slug: categoriesTable.slug,
      song_id: templatedSongCategoriesTable.templated_song_id,
      title: templatedSongsTable.title,
      current_order: templatedSongCategoriesTable.display_order,
    })
    .from(templatedSongCategoriesTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, templatedSongCategoriesTable.category_id))
    .innerJoin(templatedSongsTable, eq(templatedSongsTable.id, templatedSongCategoriesTable.templated_song_id))
    .where(
      categoryFilters.length > 0
        ? inArray(categoriesTable.slug, categoryFilters)
        : sql`true`
    );

  // 3) Group by category and compute new order
  const byCategory = new Map<number, JunctionRow[]>();
  for (const row of junctionRows) {
    const list = byCategory.get(row.category_id) ?? [];
    list.push(row);
    byCategory.set(row.category_id, list);
  }

  const updates: Array<{ junction_id: number; new_order: number }> = [];
  let changedCategories = 0;

  // Stable category iteration order (by name)
  const categories = [...byCategory.entries()].sort((a, b) =>
    (a[1][0]?.category_name ?? '').localeCompare(b[1][0]?.category_name ?? '')
  );

  for (const [, songs] of categories) {
    const ranked = [...songs].sort((a, b) => {
      const ua = usageByTemplate.get(a.song_id) ?? 0;
      const ub = usageByTemplate.get(b.song_id) ?? 0;
      if (ua !== ub) return ub - ua; // most used first
      if (a.current_order !== b.current_order) return a.current_order - b.current_order;
      return a.song_id - b.song_id;
    });

    const catChanged = ranked.some((row, i) => row.current_order !== i);
    if (catChanged) changedCategories++;

    const cat = ranked[0];
    console.log(
      `\n=== ${cat.category_name} (${cat.category_slug}) — ${ranked.length} songs ${
        catChanged ? '' : '(no change)'
      } ===`
    );
    console.table(
      ranked.map((row, i) => ({
        new_order: i,
        old_order: row.current_order,
        changed: row.current_order === i ? '' : '←',
        uses: usageByTemplate.get(row.song_id) ?? 0,
        song_id: row.song_id,
        title: row.title.slice(0, 30),
      }))
    );

    ranked.forEach((row, i) => {
      if (row.current_order !== i) updates.push({ junction_id: row.junction_id, new_order: i });
    });
  }

  console.log(
    `\nSummary: ${junctionRows.length} junction rows across ${byCategory.size} categories; ` +
      `${updates.length} rows need updating in ${changedCategories} categories.` +
      (statusArg ? ` (counting only status='${statusArg}' instances)` : ' (counting all instances)')
  );

  if (!apply) {
    console.log('\nDRY RUN — no changes written. Re-run with --apply to persist.');
    process.exit(0);
  }

  if (updates.length === 0) {
    console.log('\nNothing to update.');
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx
        .update(templatedSongCategoriesTable)
        .set({ display_order: u.new_order })
        .where(eq(templatedSongCategoriesTable.id, u.junction_id));
    }
  });

  console.log(`\n✅ Applied ${updates.length} display_order updates.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
