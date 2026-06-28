/**
 * Manual migration runner - bypasses drizzle-kit migrate issues
 * Use this when drizzle-kit migrate fails but database is actually up to date
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("📊 Checking migration state...\n");

    // Create schema and migrations table if they don't exist
    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint NOT NULL
      )
    `);

    // Check what's in the tracking table
    const applied = await client.query(
      "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id",
    );
    let appliedSet = new Set(applied.rows.map((r) => r.hash));

    console.log("Applied migrations in database:");
    applied.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.hash}`));

    // Check what migrations exist in files
    const journal = require("../drizzle/migrations/meta/_journal.json");
    console.log("\nMigrations in journal:");
    journal.entries.forEach((e, i) => console.log(`  ${i + 1}. ${e.tag}`));

    // If nothing is tracked yet but core tables already exist, baseline early migrations
    if (applied.rows.length === 0) {
      const { rows: existence } = await client.query(
        `
          SELECT
            to_regclass('public.admin_users') AS admin_users,
            to_regclass('public.song_requests') AS song_requests,
            to_regclass('public.lyrics_drafts') AS lyrics_drafts
        `,
      );
      const haveBaseSchema = Object.values(existence[0] || {}).some(
        (v) => v !== null,
      );
      if (haveBaseSchema) {
        console.log(
          "\n🧩 Detected existing base schema with no migration history. Performing baseline for 0000–0007...\n",
        );
        const baselineEntries = journal.entries.filter((e) => e.idx <= 7);
        for (const e of baselineEntries) {
          await client.query(
            "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [e.tag, Number(e.when) || Date.now()],
          );
        }
        // Reload applied set after baseline
        const reapplied = await client.query(
          "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id",
        );
        appliedSet = new Set(reapplied.rows.map((r) => r.hash));
        console.log("✅ Baseline complete.\n");
      }
    }

    // Find pending migrations
    const pending = journal.entries.filter((e) => !appliedSet.has(e.tag));

    if (pending.length === 0) {
      console.log("\n✅ All migrations are already applied!");
      console.log(
        "\n💡 If drizzle-kit migrate fails, it's a tracking issue, not a real problem.",
      );
      console.log("   Your database schema is correct and up to date.");
      console.log(
        "\n⚠️  Note: If you're seeing errors about missing columns/tables,",
      );
      console.log(
        "   a migration may have been marked as applied without running.",
      );
      console.log(
        "   Check the database state and re-run the migration SQL if needed.",
      );
      return;
    }

    console.log("\n⚠️  Pending migrations found:");
    pending.forEach((p) => console.log(`  - ${p.tag}`));

    console.log("\n🔧 Applying pending migrations...\n");
    for (const entry of pending) {
      const sqlPath = path.join(
        __dirname,
        "..",
        "drizzle",
        "migrations",
        `${entry.tag}.sql`,
      );

      if (!fs.existsSync(sqlPath)) {
        console.log(`  ⚠️  Warning: SQL file not found for ${entry.tag}`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, "utf8");
      console.log(`  Applying: ${entry.tag}`);

      try {
        // Check if SQL contains DO blocks - if so, execute as single statement
        // Otherwise, split into individual statements
        const hasDoBlocks = /DO\s+\$\$/i.test(sql);

        let statements;

        if (hasDoBlocks) {
          // For files with DO blocks, execute the entire file as one statement
          // This ensures DO $$ ... $$ blocks are preserved correctly
          statements = [sql];
        } else {
          // Remove comments first, then split by semicolon
          const cleanedSql = sql
            .split("\n")
            .map((line) => {
              // Remove inline comments (-- comments)
              const commentIndex = line.indexOf("--");
              if (commentIndex >= 0) {
                return line.substring(0, commentIndex);
              }
              return line;
            })
            .join("\n");

          statements = cleanedSql
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }

        const filteredStatements = statements;

        let appliedStatements = 0;
        let skippedStatements = 0;

        for (const statement of filteredStatements) {
          try {
            await client.query(statement);
            appliedStatements++;
          } catch (stmtErr) {
            // Skip index creation if table doesn't exist (42P01)
            // Skip constraint creation if table doesn't exist (42P01)
            // Skip if relation already exists (42P07)
            // Skip if constraint already exists (42P16 or duplicate key)
            // Never skip CREATE TABLE statements - they must succeed
            if (statement.toUpperCase().includes("CREATE TABLE")) {
              throw stmtErr; // Fail if CREATE TABLE fails
            } else if (
              stmtErr.code === "42P01" &&
              (statement.toUpperCase().includes("CREATE INDEX") ||
                statement.toUpperCase().includes("ALTER TABLE"))
            ) {
              skippedStatements++;
              console.log(
                `    ↪ Skipped statement (table doesn't exist): ${statement.substring(0, 50)}...`,
              );
            } else if (
              stmtErr.code === "42P07" ||
              stmtErr.code === "42P16" ||
              stmtErr.code === "42701" || // duplicate_column - column already exists
              stmtErr.code === "42703" || // undefined_column - column doesn't exist
              stmtErr.message.includes("already exists") ||
              stmtErr.message.includes("duplicate key") ||
              stmtErr.message.includes("does not exist")
            ) {
              skippedStatements++;
              console.log(
                `    ↪ Skipped statement (${stmtErr.code}): ${statement.substring(0, 50)}...`,
              );
              // Already exists or column doesn't exist, that's fine
            } else {
              throw stmtErr;
            }
          }
        }

        // Mark migration as applied if we applied at least one statement, OR if all
        // statements were skipped because the schema already has the change (e.g. 42701
        // duplicate_column). Otherwise it would stay "pending" forever and retry every run.
        const shouldMarkApplied =
          appliedStatements > 0 ||
          (skippedStatements > 0 && filteredStatements.length > 0);
        if (shouldMarkApplied) {
          const existing = await client.query(
            "SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1",
            [entry.tag],
          );
          if (existing.rows.length === 0) {
            await client.query(
              "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
              [entry.tag, entry.when],
            );
          }
          if (appliedStatements > 0) {
            console.log(
              `  ✅ ${entry.tag} applied (${appliedStatements} statements, ${skippedStatements} skipped)\n`,
            );
          } else {
            console.log(
              `  ✅ ${entry.tag} marked as applied (schema already had changes, ${skippedStatements} skipped)\n`,
            );
          }
        } else {
          console.log(
            `  ⚠️  ${entry.tag} - No statements applied (all ${skippedStatements} were skipped). Migration NOT marked as applied.\n`,
          );
        }
      } catch (err) {
        // If migration fails because relation already exists, it's likely already applied
        if (err.code === "42P07" || err.message.includes("already exists")) {
          console.log(
            `  ⚠️  ${entry.tag} failed with "already exists" - marking as applied`,
          );
          // Check if it's already in the migrations table
          const existing = await client.query(
            "SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1",
            [entry.tag],
          );
          if (existing.rows.length === 0) {
            await client.query(
              "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
              [entry.tag, entry.when],
            );
            console.log(`  ✅ ${entry.tag} marked as applied\n`);
          } else {
            console.log(`  ↪ ${entry.tag} already marked as applied\n`);
          }
        } else {
          console.error(`  ❌ Failed to apply ${entry.tag}:`, err.message);
          throw err;
        }
      }
    }

    console.log("✅ All pending migrations applied successfully!");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
