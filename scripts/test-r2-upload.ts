/**
 * R2 Upload Smoke Test
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-r2-upload.ts dotenv_config_path=.env.local
 */

import crypto from 'crypto';
import { downloadFromR2, uploadToR2 } from '../src/lib/storage/upload';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function printConfigSummary() {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKey = requireEnv('R2_ACCESS_KEY_ID');
  const bucket = process.env.R2_BUCKET_NAME ?? 'melodia-media';
  const publicUrl = process.env.R2_PUBLIC_URL ?? 'https://media.melodia-songs.com';

  console.log('R2 config summary:');
  console.log(`  account: ${accountId}`);
  console.log(`  bucket: ${bucket}`);
  console.log(`  public url: ${publicUrl}`);
  console.log(`  key id suffix: ...${accessKey.slice(-6)}`);
}

async function main() {
  printConfigSummary();

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `health/r2-upload-smoke-${now}.txt`;
  const payload = `R2 smoke test @ ${new Date().toISOString()}\nnonce=${crypto.randomUUID()}\n`;
  const payloadBuffer = Buffer.from(payload, 'utf8');

  console.log(`\nUploading object: ${key}`);
  const publicUrl = await uploadToR2(payloadBuffer, key, 'text/plain; charset=utf-8');
  console.log(`Upload successful. URL: ${publicUrl}`);

  console.log('Downloading uploaded object for verification...');
  const downloaded = await downloadFromR2(key);

  if (!downloaded.equals(payloadBuffer)) {
    throw new Error('Round-trip validation failed: downloaded bytes do not match uploaded bytes.');
  }

  console.log('Round-trip validation passed.');
  console.log('\nR2 write/read test passed.');
}

main().catch((error: unknown) => {
  const err = error as { name?: string; message?: string; stack?: string };
  console.error('\nR2 test failed.');
  console.error(`Error: ${err?.name ?? 'UnknownError'} - ${err?.message ?? 'Unknown error'}`);

  if (err?.message?.includes('Access Denied')) {
    console.error('\nLikely causes:');
    console.error('  - Token does not have Object Write for this bucket');
    console.error('  - R2_ACCOUNT_ID does not match token account');
    console.error('  - R2_BUCKET_NAME is wrong');
  }

  if (err?.stack) {
    console.error('\nStack:');
    console.error(err.stack);
  }

  process.exit(1);
});
