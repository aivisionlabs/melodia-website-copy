/**
 * Validates that migration files and drizzle meta journal are in sync.
 * - Checks database state to see if migrations are already applied
 * - Only blocks if migration files exist that aren't in journal AND aren't applied in DB
 * - Warns about migrations applied in DB but missing from journal (safe to proceed)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Load environment variables if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    require("dotenv").config({ path: ".env.local" });
  } catch (e) {
    // dotenv not available or .env.local not found, that's okay
  }
}

async function checkDatabaseMigrations() {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Check if migrations table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      )
    `);

    if (!tableExists.rows[0].exists) {
      await client.end();
      return new Set(); // No migrations table = no applied migrations
    }

    // Get all applied migrations
    const result = await client.query(`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id
    `);

    await client.end();
    return new Set(result.rows.map((r) => r.hash));
  } catch (error) {
    // If we can't connect, assume no migrations are applied (safer to be strict)
    console.warn("⚠️  Could not check database state:", error.message);
    console.warn("   Proceeding with file-based validation only.");
    return null;
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, "..", "drizzle", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    console.error("❌ Drizzle meta journal not found at", journalPath);
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const journalTags = new Set(journal.entries.map((e) => e.tag));
  const journalMaxIdx =
    journal.entries.length > 0
      ? Math.max(...journal.entries.map((e) => e.idx))
      : -1;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f));

  const fileTags = files.map((f) => f.replace(/\.sql$/, ""));
  const fileIdxs = fileTags.map((t) => parseInt(t.slice(0, 4), 10));
  const fileMaxIdx = fileIdxs.length ? Math.max(...fileIdxs) : -1;

  // Check database state
  const appliedInDb = await checkDatabaseMigrations();

  // 1) Detect files not present in journal
  const missingInJournal = fileTags.filter(
    (t) => !journalTags.has(t) && parseInt(t.slice(0, 4), 10) <= journalMaxIdx
  );

  if (missingInJournal.length > 0) {
    if (appliedInDb === null) {
      // Can't check DB, be strict
      console.error(
        "❌ Found migration files not recorded in meta/_journal.json:"
      );
      missingInJournal.forEach((t) => console.error(`  - ${t}.sql`));
      console.error(
        '\nFix: Regenerate migrations via "npm run db:generate -- --name <desc>" or rename your custom file to the next available tag and add via generate.'
      );
      process.exit(1);
    }

    // Check which ones are applied in DB
    const appliedButMissingFromJournal = missingInJournal.filter((t) =>
      appliedInDb.has(t)
    );
    const notAppliedAndMissing = missingInJournal.filter(
      (t) => !appliedInDb.has(t)
    );

    if (appliedButMissingFromJournal.length > 0) {
      console.warn(
        "⚠️  Found migration files already applied in database but missing from journal:"
      );
      appliedButMissingFromJournal.forEach((t) =>
        console.warn(`  - ${t}.sql (applied in DB)`)
      );
      console.warn(
        "   These are safe to ignore - they're already applied. Consider adding them to journal manually if needed."
      );
    }

    if (notAppliedAndMissing.length > 0) {
      console.error(
        "❌ Found migration files not recorded in meta/_journal.json AND not applied in database:"
      );
      notAppliedAndMissing.forEach((t) => console.error(`  - ${t}.sql`));
      console.error(
        '\nFix: Regenerate migrations via "npm run db:generate -- --name <desc>" or rename your custom file to the next available tag and add via generate.'
      );
      process.exit(1);
    }
  }

  // 2) Sanity: Next tag should be journalMaxIdx + 1; warn if files exceed journal max
  if (fileMaxIdx > journalMaxIdx) {
    console.warn(
      `⚠️  Highest migration file index (${fileMaxIdx}) exceeds journal max idx (${journalMaxIdx}).`
    );
    console.warn(
      '   This usually means a manual migration was added. Prefer "npm run db:generate -- --name <desc>" so the journal stays in sync.'
    );
  }

  console.log("✅ Migrations and journal are consistent.");
}

main().catch((err) => {
  console.error("❌ Validation failed:", err.message);
  process.exit(1);
});
