/**
 * One-time migration: create templated_songs rows (is_namedrop_eligible=false) for each
 * persona that was previously linked to a library song via persona_associations.song_id.
 *
 * Idempotent: skips personas that already have a templated_songs row.
 *
 * Usage:
 *   DRY_RUN=true npx tsx -r dotenv/config scripts/migrate-personas-to-templated-songs.ts dotenv_config_path=.env.local
 *   npx tsx -r dotenv/config scripts/migrate-personas-to-templated-songs.ts dotenv_config_path=.env.local
 *   LIMIT=5 npx tsx -r dotenv/config scripts/migrate-personas-to-templated-songs.ts dotenv_config_path=.env.local
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import {
  personasTable,
  personaAssociationsTable,
  songsTable,
  songCategoriesTable,
  templatedSongsTable,
  templatedSongCategoriesTable,
} from '../src/lib/db/schema';
import { eq, isNotNull, inArray } from 'drizzle-orm';
import { generateBaseSlug } from '../src/lib/utils/slug';

// =============================================================================
// Config
// =============================================================================

const DRY_RUN = process.env.DRY_RUN === 'true';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;

// =============================================================================
// Helpers
// =============================================================================

async function generateUniqueSlug(name: string): Promise<string> {
  const base = generateBaseSlug(name || 'voice-template');
  let slug = base;
  let counter = 1;
  while (counter <= 1000) {
    const existing = await db
      .select({ id: templatedSongsTable.id })
      .from(templatedSongsTable)
      .where(eq(templatedSongsTable.slug, slug))
      .limit(1);
    if (existing.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
  return `${base}-${Date.now()}`;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log(`Starting persona → templated_songs migration${DRY_RUN ? ' [DRY RUN]' : ''}`);

  // 1. Fetch all persona_associations for library songs
  const associations = await db
    .select({
      persona_id: personaAssociationsTable.persona_id,
      song_id: personaAssociationsTable.song_id,
    })
    .from(personaAssociationsTable)
    .where(isNotNull(personaAssociationsTable.song_id));

  console.log(`Found ${associations.length} persona→song associations`);

  if (associations.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  // 2. Find personas already migrated (have a templated_songs row)
  const allPersonaIds = associations.map((a) => a.persona_id);
  const existingRows = await db
    .select({ persona_id: templatedSongsTable.persona_id })
    .from(templatedSongsTable)
    .where(
      inArray(
        templatedSongsTable.persona_id,
        allPersonaIds
      )
    );
  const migratedPersonaIds = new Set(existingRows.map((r) => r.persona_id).filter(Boolean) as number[]);

  const toMigrate = associations.filter((a) => !migratedPersonaIds.has(a.persona_id));
  console.log(`Already migrated: ${migratedPersonaIds.size}, remaining: ${toMigrate.length}`);

  const batch = LIMIT != null ? toMigrate.slice(0, LIMIT) : toMigrate;
  if (batch.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // 3. Batch-fetch all required personas and songs
  const batchPersonaIds = batch.map((a) => a.persona_id);
  const batchSongIds = batch.map((a) => a.song_id).filter(Boolean) as number[];

  const [personas, songs, songCategories] = await Promise.all([
    db
      .select({
        id: personasTable.id,
        name: personasTable.name,
      })
      .from(personasTable)
      .where(inArray(personasTable.id, batchPersonaIds)),

    db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        lyrics: songsTable.lyrics,
        music_style: songsTable.music_style,
        language: songsTable.language,
        suno_variants: songsTable.suno_variants,
        selected_variant: songsTable.selected_variant,
      })
      .from(songsTable)
      .where(inArray(songsTable.id, batchSongIds)),

    db
      .select({
        song_id: songCategoriesTable.song_id,
        category_id: songCategoriesTable.category_id,
      })
      .from(songCategoriesTable)
      .where(inArray(songCategoriesTable.song_id, batchSongIds)),
  ]);

  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const songMap = new Map(songs.map((s) => [s.id, s]));
  const songCatMap = new Map<number, number[]>();
  for (const sc of songCategories) {
    const list = songCatMap.get(sc.song_id) ?? [];
    list.push(sc.category_id);
    songCatMap.set(sc.song_id, list);
  }

  // 4. Process each association
  let created = 0;
  let skipped = 0;
  let errored = 0;

  for (const assoc of batch) {
    const persona = personaMap.get(assoc.persona_id);
    const song = songMap.get(assoc.song_id!);

    if (!persona || !song) {
      console.warn(`  SKIP: persona ${assoc.persona_id} or song ${assoc.song_id} not found`);
      skipped++;
      continue;
    }

    const slug = await generateUniqueSlug(persona.name);
    const catIds = songCatMap.get(song.id) ?? [];

    console.log(
      `  ${DRY_RUN ? '[DRY]' : ''} persona ${persona.id} (${persona.name}) + song ${song.id} (${song.title}) → slug=${slug}, categories=[${catIds.join(',')}]`
    );

    if (!DRY_RUN) {
      try {
        const [template] = await db
          .insert(templatedSongsTable)
          .values({
            title: song.title,
            draft_lyrics: song.lyrics ?? null,
            template_lyrics: null,
            music_style: (song as any).music_style ?? null,
            persona_id: persona.id,
            language: (song as any).language ?? 'English',
            slug,
            is_active: false,
            is_namedrop_eligible: false,
            song_variants: (song as any).suno_variants ?? {},
            selected_variant: (song as any).selected_variant ?? 0,
          })
          .returning();

        if (catIds.length > 0) {
          await db.insert(templatedSongCategoriesTable).values(
            catIds.map((categoryId, i) => ({
              templated_song_id: template.id,
              category_id: categoryId,
              display_order: i,
            }))
          );
        }

        created++;
      } catch (err: any) {
        console.error(`  ERROR for persona ${persona.id}: ${err?.message}`);
        errored++;
      }
    } else {
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errored}`);
  if (DRY_RUN) console.log('(dry run — no DB writes)');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
