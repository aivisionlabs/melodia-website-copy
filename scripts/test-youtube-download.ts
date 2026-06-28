/**
 * YouTube Download Smoke Test
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/test-youtube-download.ts --url "https://www.youtube.com/watch?v=..." dotenv_config_path=.env.local
 *   npx tsx -r dotenv/config scripts/test-youtube-download.ts "https://youtu.be/..." --out ./tmp/audio.mp3 dotenv_config_path=.env.local
 */

import path from 'path';
import fs from 'fs/promises';
import { downloadYouTubeAudio } from '../src/lib/youtube/download';

interface CliOptions {
  url?: string;
  outPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url' && argv[i + 1]) {
      options.url = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--out' && argv[i + 1]) {
      options.outPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage:');
      console.log('  scripts/test-youtube-download.ts --url "https://www.youtube.com/watch?v=..." [--out <file>]');
      console.log('  scripts/test-youtube-download.ts "https://youtu.be/..." [--out <file>]');
      process.exit(0);
    }
    positional.push(arg);
  }

  if (!options.url && positional.length > 0) {
    options.url = positional[0];
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = options.url?.trim();
  if (!url) {
    throw new Error('Missing YouTube URL. Pass --url "..." or positional URL.');
  }

  console.log('Running YouTube download smoke test...');
  console.log(`  url: ${url}`);

  const result = await downloadYouTubeAudio(url);

  const outputDir = path.join(process.cwd(), 'tmp', 'smoke-tests');
  await fs.mkdir(outputDir, { recursive: true });

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = result.format || 'webm';
  const outputPath = options.outPath
    ? path.resolve(options.outPath)
    : path.join(outputDir, `youtube-audio-${now}.${extension}`);

  await fs.writeFile(outputPath, result.audioBuffer);

  console.log('\nYouTube download test passed.');
  console.log(`  output: ${outputPath}`);
  console.log(`  bytes: ${result.audioBuffer.length}`);
  console.log(`  format: ${result.format}`);
  console.log(`  videoId: ${result.videoInfo.videoId}`);
  console.log(`  title: ${result.videoInfo.title}`);
  console.log(`  durationSeconds: ${result.videoInfo.durationSeconds}`);
  console.log(`  author: ${result.videoInfo.author}`);
}

main().catch((error: unknown) => {
  const err = error as { name?: string; message?: string; stack?: string };
  console.error('\nYouTube download test failed.');
  console.error(`Error: ${err?.name ?? 'UnknownError'} - ${err?.message ?? 'Unknown error'}`);
  if (err?.stack) {
    console.error('\nStack:');
    console.error(err.stack);
  }
  process.exit(1);
});
