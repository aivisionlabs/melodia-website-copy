/*
  Baseline Drizzle migrations table by marking existing migrations as applied.

  Usage:
    node -r dotenv/config scripts/db-baseline.js

  Notes:
    - Reads drizzle/migrations/meta/_journal.json
    - Creates schema drizzle and table drizzle.__drizzle_migrations if missing
    - Inserts rows for 0000–0003 (skip newest) if not present
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const journalPath = path.join(process.cwd(), 'drizzle', 'migrations', 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  const entries = journal.entries || [];
  // Mark all entries prior to the latest as applied (baseline up to 0003)
  const toApply = entries.filter((e) => e.idx <= 3); // 0..3

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint NOT NULL
      )
    `);

    const { rows: existing } = await client.query('SELECT hash FROM drizzle.__drizzle_migrations');
    const existingHashes = new Set(existing.map((r) => r.hash));

    for (const e of toApply) {
      const hash = e.tag; // use tag as hash key
      const createdAt = Number(e.when) || Date.now();
      if (!existingHashes.has(hash)) {
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [hash, createdAt]
        );
        console.log(`✔ Baseline applied: ${hash}`);
      } else {
        console.log(`↪ Already baseline: ${hash}`);
      }
    }
    console.log('✅ Baseline complete. Future drizzle-kit migrate will not replay 0000–0003.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Baseline failed:', err);
  process.exit(1);
});


