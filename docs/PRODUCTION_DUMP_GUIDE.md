# Production Database Dump Guide

This guide walks you through creating a dump of your production database and importing it into your local development environment.

## Prerequisites

1. **Production Database Access**: You need the production `DATABASE_URL` connection string
2. **Local Database Running**: Your local PostgreSQL should be running via Docker Compose
3. **pg_dump and psql**: These PostgreSQL tools should be installed on your system

## Step-by-Step Instructions

### Step 1: Get Production Database Connection String

Get your production `DATABASE_URL` from:
- **Vercel**: Project Settings → Environment Variables → `DATABASE_URL`
- **Other providers**: Check your hosting platform's database settings

The connection string format:
```
postgresql://user:password@host:port/database
```

**⚠️ Important: Special Characters in Password**

If your password contains special characters (like `@`, `#`, `%`, `&`, etc.), you need to **URL-encode** them in the connection string:

| Character | URL-Encoded |
|-----------|-------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `=` | `%3D` |
| `+` | `%2B` |
| ` ` (space) | `%20` |

**Example:**
- Password: `my@password#123`
- Encoded: `my%40password%23123`
- Connection string: `postgresql://user:my%40password%23123@host:port/database`

**Quick encoding tip:** You can use Python or Node.js to encode:
```bash
# Python
python3 -c "import urllib.parse; print(urllib.parse.quote('my@password#123', safe=''))"

# Node.js
node -e "console.log(encodeURIComponent('my@password#123'))"
```

### Step 2: Ensure Local Database is Running

Check if your local database is running:
```bash
docker-compose ps
```

If not running, start it:
```bash
docker-compose up -d postgres
```

### Step 3: Create Production Database Dump

Create a dump file from production. You can do this in two ways:

#### Option A: Using pg_dump directly (Recommended)

```bash
# Replace with your actual production DATABASE_URL
pg_dump "postgresql://user:password@host:port/database" \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --format=custom \
  --file=prod_dump.dump
```

**Flags explanation:**
- `--verbose`: Shows progress
- `--clean`: Includes DROP statements (removes existing objects)
- `--no-acl`: Excludes access privileges (avoids permission issues)
- `--no-owner`: Excludes ownership commands (avoids user mismatch)
- `--format=custom`: Creates a compressed custom format dump (recommended)
- `--file=prod_dump.dump`: Output filename

#### Option B: Using pg_dump with plain SQL format

```bash
pg_dump "postgresql://user:password@host:port/database" \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --format=plain \
  --file=prod_dump.sql
```

**Note:** Plain SQL format is larger but easier to inspect and modify if needed.

### Step 4: Drop and Recreate Local Database (Optional but Recommended)

To ensure a clean import, you may want to drop and recreate your local database:

```bash
# Connect to local database
docker exec -it melodia-postgres psql -U postgres -d postgres

# Drop and recreate database
DROP DATABASE IF EXISTS melodia;
CREATE DATABASE melodia;

# Exit psql
\q
```

Or using a single command:
```bash
docker exec -i melodia-postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS melodia;
CREATE DATABASE melodia;
EOF
```

**Note:** If you encounter a collation version mismatch error, fix it first:
```bash
# Fix collation version mismatch
docker exec -i melodia-postgres psql -U postgres -d postgres -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;"
docker exec -i melodia-postgres psql -U postgres -d postgres -c "ALTER DATABASE postgres REFRESH COLLATION VERSION;"

# Then create the database
docker exec -i melodia-postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS melodia;
CREATE DATABASE melodia;
EOF
```

### Step 5: Import Dump to Local Database

#### If you used custom format (Option A):

```bash
# Import custom format dump
pg_restore \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --dbname=postgresql://postgres:melodia2024@localhost:5433/melodia \
  prod_dump.dump
```

#### If you used plain SQL format (Option B):

```bash
# Import SQL dump
psql postgresql://postgres:melodia2024@localhost:5433/melodia < prod_dump.sql
```

Or using Docker:
```bash
docker exec -i melodia-postgres psql -U postgres -d melodia < prod_dump.sql
```

### Step 6: Verify the Import

Verify that data was imported correctly:

```bash
# Connect to local database
docker exec -it melodia-postgres psql -U postgres -d melodia

# Check some tables
\dt                    # List all tables
SELECT COUNT(*) FROM songs;
SELECT COUNT(*) FROM song_requests;
SELECT COUNT(*) FROM users;

# Exit
\q
```

### Step 7: Update Migration State (Important!)

After importing production data, you need to sync your migration state:

```bash
npm run db:sync-migrations
```

This ensures that Drizzle knows which migrations have already been applied.

## Complete Example Script

Here's a complete script you can use (save as `import-prod-dump.sh`):

```bash
#!/bin/bash

# Configuration
# ⚠️ If password contains special characters, URL-encode them:
# @ = %40, # = %23, % = %25, etc.
PROD_DATABASE_URL="postgresql://user:password@host:port/database"
LOCAL_DATABASE_URL="postgresql://postgres:melodia2024@localhost:5433/melodia"
DUMP_FILE="prod_dump.dump"

echo "Step 1: Creating production dump..."
pg_dump "$PROD_DATABASE_URL" \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --format=custom \
  --file="$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "Error: Failed to create dump"
  exit 1
fi

echo "Step 2: Dropping local database..."
docker exec -i melodia-postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS melodia;
CREATE DATABASE melodia;
EOF

echo "Step 3: Importing dump to local database..."
pg_restore \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --dbname="$LOCAL_DATABASE_URL" \
  "$DUMP_FILE"

if [ $? -ne 0 ]; then
  echo "Error: Failed to import dump"
  exit 1
fi

echo "Step 4: Syncing migration state..."
npm run db:sync-migrations

echo "Done! Production data imported successfully."
```

Make it executable:
```bash
chmod +x import-prod-dump.sh
```

## Troubleshooting

### Issue: Connection refused
**Solution**: Make sure your local database is running:
```bash
docker-compose up -d postgres
```

### Issue: Permission denied
**Solution**: Use `--no-acl` and `--no-owner` flags (already included in examples above)

### Issue: Database already exists
**Solution**: Drop and recreate the database (see Step 4)

### Issue: Collation version mismatch error
**Error message:**
```
ERROR: template database "template1" has a collation version mismatch
DETAIL: The template database was created using collation version 2.36, but the operating system provides version 2.41.
```

**Solution**: Refresh the collation version before creating the database:
```bash
# Fix collation version mismatch
docker exec -i melodia-postgres psql -U postgres -d postgres -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;"
docker exec -i melodia-postgres psql -U postgres -d postgres -c "ALTER DATABASE postgres REFRESH COLLATION VERSION;"

# Then create the database
docker exec -i melodia-postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS melodia;
CREATE DATABASE melodia;
EOF
```

### Issue: Migration state mismatch
**Solution**: Run `npm run db:sync-migrations` after import

### Issue: SSL connection required
**Solution**: Add SSL parameters to connection string:
```
postgresql://user:password@host:port/database?sslmode=require
```

### Issue: Password contains special characters (like @, #, %, etc.)
**Solution**: URL-encode the special characters in your password:
- `@` becomes `%40`
- `#` becomes `%23`
- `%` becomes `%25`
- etc.

**Example:**
```bash
# If password is "pass@word#123"
# Use: "pass%40word%23123"
pg_dump "postgresql://user:pass%40word%23123@host:port/database" \
  --format=custom \
  --file=prod_dump.dump
```

**Quick encoding:**
```bash
# Encode your password
node -e "console.log(encodeURIComponent('your-password-here'))"
```

### Issue: Large database takes too long
**Solution**:
- Use custom format (`--format=custom`) for compression
- Consider dumping only specific tables if you don't need everything
- Use `--jobs=4` with `pg_restore` for parallel restoration

### Issue: pg_stat_statements extension error
**Error message:**
```
error: pg_stat_statements must be loaded via shared_preload_libraries
```

**Solution**: This happens when importing Supabase dumps that include the `pg_stat_statements` extension. You have two options:

**Option 1: Drop the extension (Quick fix, recommended for local dev)**
```bash
docker exec -i melodia-postgres psql -U postgres -d melodia -c "DROP EXTENSION IF EXISTS pg_stat_statements CASCADE;"
```

**Option 2: Enable the extension properly (For full Supabase compatibility)**
1. The `docker-compose.yml` has been updated to enable `pg_stat_statements` via command-line argument
2. Restart the PostgreSQL container:
   ```bash
   docker-compose restart postgres
   ```
3. After restart, create the extension:
   ```bash
   docker exec -i melodia-postgres psql -U postgres -d melodia -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
   ```

**Note:** Option 1 is recommended for local development as `pg_stat_statements` is mainly used for query performance monitoring, which isn't needed locally.

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit dump files**: Add `*.dump` and `*.sql` to `.gitignore`
2. **Delete dumps after use**: Production data may contain sensitive information
3. **Secure connection strings**: Don't expose production credentials
4. **Use environment variables**: Store connection strings in `.env.local` (not committed)

## Alternative: Using pgAdmin

If you prefer a GUI:

1. Open pgAdmin (available at `http://localhost:8080`)
2. Connect to production database
3. Right-click database → Backup
4. Save the backup file
5. Connect to local database
6. Right-click database → Restore
7. Select the backup file

## Next Steps

After importing:
1. ✅ Verify data integrity
2. ✅ Sync migration state (`npm run db:sync-migrations`)
3. ✅ Test your application locally
4. ✅ Delete the dump file (contains production data)
5. ✅ Update `.gitignore` to exclude dump files if not already done

