import { db } from '../src/lib/db';
import { applicationLogsTable } from '../src/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

const REQUEST_ID = process.argv[2];
if (!REQUEST_ID) {
  console.error('Usage: npm run trace-request <request-id>');
  process.exit(1);
}

async function main() {
  const logs = await db
    .select()
    .from(applicationLogsTable)
    .where(eq(applicationLogsTable.request_id, REQUEST_ID))
    .orderBy(asc(applicationLogsTable.timestamp));

  if (logs.length === 0) {
    console.log(`No DB logs found for request ID: ${REQUEST_ID}`);
    console.log('');
    console.log('Note: The middleware entry log (request_received event) is written to');
    console.log('stdout only — search Vercel logs or local terminal output for:');
    console.log(`  {"event":"request_received","requestId":"${REQUEST_ID}",...}`);
    process.exit(0);
  }

  console.log(`\nRequest Trace: ${REQUEST_ID}`);
  console.log('='.repeat(70));

  const first = logs[0];
  const last = logs[logs.length - 1];
  const totalMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();

  console.log(`Entries : ${logs.length}`);
  console.log(`Started : ${first.timestamp.toISOString()}`);
  console.log(`Ended   : ${last.timestamp.toISOString()}`);
  console.log(`Duration: ${totalMs}ms`);
  console.log('');

  const levelIcon: Record<string, string> = {
    debug: '🔍',
    info: '✅',
    warn: '⚠️ ',
    error: '❌',
    fatal: '💀',
  };

  for (const log of logs) {
    const icon = levelIcon[log.level] ?? '  ';
    const ts = new Date(log.timestamp).toISOString().replace('T', ' ').replace('Z', '');
    console.log(`${icon} [${ts}] [${log.level.toUpperCase().padEnd(5)}] ${log.message}`);

    const ctx = log.context as Record<string, any> | null;
    if (ctx) {
      const inline: string[] = [];
      if (ctx.route) inline.push(`route=${ctx.route}`);
      if (ctx.method) inline.push(`method=${ctx.method}`);
      if (ctx.status) inline.push(`status=${ctx.status}`);
      if (ctx.duration_ms) inline.push(`duration=${ctx.duration_ms}ms`);
      if (ctx.userId) inline.push(`userId=${ctx.userId}`);
      if (inline.length) console.log(`   ${inline.join(' | ')}`);

      if (ctx.body && typeof ctx.body === 'object') {
        console.log(`   body: ${JSON.stringify(ctx.body).slice(0, 300)}`);
      }

      if (ctx.error) {
        const err = ctx.error;
        console.log(`   error: ${err.message || JSON.stringify(err).slice(0, 200)}`);
        if (err.stack) console.log(`   stack: ${err.stack.split('\n').slice(0, 3).join(' | ')}`);
      }
    }
  }

  console.log('');
  console.log('─'.repeat(70));

  const errors = logs.filter(l => l.level === 'error' || l.level === 'fatal');
  const warns = logs.filter(l => l.level === 'warn');
  if (errors.length) {
    console.log(`ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e.message}`));
  }
  if (warns.length) {
    console.log(`WARNINGS (${warns.length}):`);
    warns.forEach(w => console.log(`  - ${w.message}`));
  }
  if (!errors.length && !warns.length) {
    console.log('No errors or warnings — request completed cleanly.');
  }

  console.log('');
  console.log('Tip: The very first event (middleware entry) is stdout-only.');
  console.log(`Search Vercel logs or local terminal for: "requestId":"${REQUEST_ID}"`);
}

main().catch(err => {
  console.error('Trace failed:', err);
  process.exit(1);
});
