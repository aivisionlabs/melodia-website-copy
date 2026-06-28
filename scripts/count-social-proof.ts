/**
 * One-time read-only script to get real social-proof counts.
 * Run: npx tsx -r dotenv/config scripts/count-social-proof.ts dotenv_config_path=.env.local
 */
import { sql } from 'drizzle-orm';
import { db } from '../src/lib/db';
import {
  songsTable,
  userSongsTable,
  templatedSongInstancesTable,
  usersTable,
  anonymousUsersTable,
} from '../src/lib/db/schema';

async function count(label: string, query: Promise<{ c: number }[]>) {
  try {
    const rows = await query;
    console.log(`${label}: ${rows[0]?.c ?? 0}`);
    return Number(rows[0]?.c ?? 0);
  } catch (e) {
    console.log(`${label}: ERROR ${(e as Error).message}`);
    return 0;
  }
}

async function main() {
  const libSongs = await count(
    'Library songs (songs, not deleted)',
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(songsTable)
      .where(sql`${songsTable.is_deleted} = false`)
  );

  const userSongsCompleted = await count(
    "User songs completed",
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(userSongsTable)
      .where(sql`${userSongsTable.status} = 'completed' and ${userSongsTable.is_deleted} = false`)
  );

  const userSongsAll = await count(
    'User songs (all, not deleted)',
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(userSongsTable)
      .where(sql`${userSongsTable.is_deleted} = false`)
  );

  const templatedCompleted = await count(
    'Templated song instances completed',
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(templatedSongInstancesTable)
      .where(sql`${templatedSongInstancesTable.status} = 'completed'`)
  );

  const templatedAll = await count(
    'Templated song instances (all)',
    db.select({ c: sql<number>`count(*)::int` }).from(templatedSongInstancesTable)
  );

  const registeredUsers = await count(
    'Registered users',
    db.select({ c: sql<number>`count(*)::int` }).from(usersTable)
  );

  const anonUsers = await count(
    'Anonymous users',
    db.select({ c: sql<number>`count(*)::int` }).from(anonymousUsersTable)
  );

  console.log('\n--- DERIVED ---');
  console.log('Songs created (lib + userCompleted + templatedCompleted):', libSongs + userSongsCompleted + templatedCompleted);
  console.log('Songs created (lib + userAll + templatedAll):', libSongs + userSongsAll + templatedAll);
  console.log('Total users (registered + anonymous):', registeredUsers + anonUsers);

  process.exit(0);
}

main();
