/**
 * Script to check migration status in database
 * Usage: node scripts/check-migrations.js
 */

const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log("✅ Connected to database\n");

    // Check if migrations table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log("❌ Migration tracking table does not exist");
      return;
    }

    // Get all applied migrations
    const migrations = await client.query(`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY id
    `);

    console.log(`📊 Found ${migrations.rows.length} migrations in tracking table:\n`);
    migrations.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.hash} (created: ${new Date(Number(m.created_at)).toISOString()})`);
    });

    // Check specifically for our migration
    const ourMigration = migrations.rows.find(m => m.hash === '0015_add_user_song_id_to_songs');
    if (ourMigration) {
      console.log(`\n✅ Migration 0015_add_user_song_id_to_songs is marked as applied`);
    } else {
      console.log(`\n❌ Migration 0015_add_user_song_id_to_songs is NOT in tracking table`);
    }

    // Check if the column actually exists
    const columnExists = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'songs'
      AND column_name = 'user_song_id'
      AND table_schema = 'public'
    `);

    if (columnExists.rows.length > 0) {
      console.log(`✅ Column 'user_song_id' EXISTS in songs table`);
    } else {
      console.log(`❌ Column 'user_song_id' DOES NOT EXIST in songs table`);
      console.log(`\n⚠️  Migration may be marked as applied but SQL was never executed!`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

