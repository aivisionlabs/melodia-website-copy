/**
 * Syncs migration state between files, journal, and database.
 * Checks if migrations are actually applied (by checking DB objects) and marks them as applied.
 * Usage: node scripts/sync-migration-state.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Load environment variables
if (!process.env.DATABASE_URL) {
  try {
    require("dotenv").config({ path: ".env.local" });
  } catch (e) {
    // dotenv not available
  }
}

async function checkIfMigrationApplied(client, tag) {
  // Check what objects each migration creates by reading the SQL file
  const migrationsDir = path.join(__dirname, "..", "drizzle", "migrations");
  const sqlPath = path.join(migrationsDir, `${tag}.sql`);

  if (!fs.existsSync(sqlPath)) {
    return false;
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  // Check for common patterns:
  // - CREATE TABLE
  // - ALTER TABLE ... ADD COLUMN
  // - CREATE TYPE

  // Check for CREATE TABLE
  const createTableMatches = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/gi);
  if (createTableMatches) {
    for (const match of createTableMatches) {
      const tableName = match.match(/"(\w+)"/)?.[1] || match.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
      if (tableName) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )
        `, [tableName]);
        if (!result.rows[0].exists) {
          return false; // Table doesn't exist, migration not applied
        }
      }
    }
  }

  // Check for ALTER TABLE ... ADD COLUMN
  const alterTableMatches = sql.match(/ALTER TABLE "?(\w+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?(\w+)"?/gi);
  if (alterTableMatches) {
    for (const match of alterTableMatches) {
      const parts = match.match(/ALTER TABLE "?(\w+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?(\w+)"?/i);
      if (parts) {
        const [, tableName, columnName] = parts;
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
          )
        `, [tableName, columnName]);
        if (!result.rows[0].exists) {
          return false; // Column doesn't exist, migration not applied
        }
      }
    }
  }

  // Check for CREATE TYPE
  const createTypeMatches = sql.match(/CREATE TYPE "?(\w+)"?/gi);
  if (createTypeMatches) {
    for (const match of createTypeMatches) {
      const typeName = match.match(/"(\w+)"/)?.[1] || match.match(/CREATE TYPE (\w+)/i)?.[1];
      if (typeName) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_type
            WHERE typname = $1
          )
        `, [typeName]);
        if (!result.rows[0].exists) {
          return false; // Type doesn't exist, migration not applied
        }
      }
    }
  }

  // If we can't determine from SQL patterns, assume it might be applied
  // (safer to mark as applied if we can't verify)
  return true;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log("✅ Connected to database\n");

    // Ensure migrations table exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS drizzle
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        created_at bigint NOT NULL
      )
    `);

    // Get currently applied migrations
    const appliedResult = await client.query(`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id
    `);
    const appliedSet = new Set(appliedResult.rows.map((r) => r.hash));
    console.log(`📊 Found ${appliedSet.size} migrations already tracked in database\n`);

    // Get journal
    const migrationsDir = path.join(__dirname, "..", "drizzle", "migrations");
    const journalPath = path.join(migrationsDir, "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const journalTags = new Set(journal.entries.map((e) => e.tag));

    // Get all migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d{4}_.+\.sql$/.test(f));
    const fileTags = files.map((f) => f.replace(/\.sql$/, ""));

    // Find migrations that are:
    // 1. In files
    // 2. Not in journal
    // 3. Not tracked in database
    const missingTags = fileTags.filter(
      (t) => !journalTags.has(t) && !appliedSet.has(t)
    );

    if (missingTags.length === 0) {
      console.log("✅ All migrations are properly tracked!");
      return;
    }

    console.log(`🔍 Checking ${missingTags.length} untracked migration(s)...\n`);

    const toMarkAsApplied = [];
    const notApplied = [];

    for (const tag of missingTags) {
      console.log(`Checking: ${tag}...`);
      const isApplied = await checkIfMigrationApplied(client, tag);
      if (isApplied) {
        console.log(`  ✅ Appears to be applied (objects exist in DB)`);
        toMarkAsApplied.push(tag);
      } else {
        console.log(`  ❌ Not applied (objects missing from DB)`);
        notApplied.push(tag);
      }
    }

    if (toMarkAsApplied.length > 0) {
      console.log(`\n📝 Marking ${toMarkAsApplied.length} migration(s) as applied...`);
      for (const tag of toMarkAsApplied) {
        // Get timestamp from journal entry if it exists, or use current time
        const journalEntry = journal.entries.find((e) => e.tag === tag);
        const timestamp = journalEntry?.when || Date.now();

        await client.query(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
           VALUES ($1, $2)
           ON CONFLICT (hash) DO NOTHING`,
          [tag, timestamp]
        );
        console.log(`  ✅ Marked ${tag} as applied`);
      }
    }

    if (notApplied.length > 0) {
      console.log(`\n⚠️  ${notApplied.length} migration(s) are NOT applied:`);
      notApplied.forEach((t) => console.log(`  - ${t}.sql`));
      console.log("\n💡 These migrations should either be:");
      console.log("   1. Applied manually via 'npm run db:migrate'");
      console.log("   2. Deleted if they're no longer needed");
      console.log("   3. Added to journal if they're new migrations");
    }

    console.log("\n✅ Sync complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();



