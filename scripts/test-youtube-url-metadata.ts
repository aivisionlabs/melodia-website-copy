/**
 * YouTube URL metadata / ID extraction smoke test
 *
 * Validates that a URL (including youtu.be/...?si=...) can be processed the same
 * way as order creation: video id extraction + oEmbed metadata.
 *
 * Usage:
 *   npm run test:youtube-metadata
 *   npm run test:youtube-metadata -- --url "https://youtu.be/PAW_Gd3QVww?si=UgyOrNwo34Dt8zv6"
 *   npm run test:youtube-metadata -- --with-download   # also hits RapidAPI (full MP3 path)
 *   npx tsx scripts/test-youtube-url-metadata.ts "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 */

import { getYouTubeVideoInfo, validateYouTubeUrl } from '../src/lib/youtube/metadata';
import { downloadYouTubeAudio } from '../src/lib/youtube/download';

const DEFAULT_URL = 'https://youtu.be/PAW_Gd3QVww?si=UgyOrNwo34Dt8zv6';

function parseArgs(argv: string[]): { url: string; withDownload: boolean } {
  const args = argv.slice(2);
  let url = DEFAULT_URL;
  let withDownload = false;
  const positional: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1].trim();
      i += 1;
      continue;
    }
    if (args[i] === '--with-download') {
      withDownload = true;
      continue;
    }
    if (!args[i].startsWith('-')) positional.push(args[i]);
  }
  if (positional.length > 0) url = positional[0].trim();

  return { url, withDownload };
}

async function main() {
  const { url, withDownload } = parseArgs(process.argv);

  console.log('YouTube URL metadata test');
  console.log(`  input URL: ${url}\n`);

  const validation = await validateYouTubeUrl(url);
  console.log('validateYouTubeUrl:', validation);

  const info = await getYouTubeVideoInfo(url);
  console.log('\ngetYouTubeVideoInfo:', {
    videoId: info.videoId,
    title: info.title,
    author: info.author,
    isAvailable: info.isAvailable,
    durationSeconds: info.durationSeconds,
  });

  if (withDownload) {
    console.log('\n--with-download: exercising RapidAPI MP3 path...');
    const dl = await downloadYouTubeAudio(url);
    const dlId = dl.videoInfo.videoId;
    if (dlId !== info.videoId) {
      throw new Error(`ID mismatch: metadata=${info.videoId} download=${dlId}`);
    }
    console.log(`  download path videoId: ${dlId} (ok, matches oEmbed id)`);
    console.log(`  audio buffer bytes: ${dl.audioBuffer.length}`);
  } else {
    console.log('\n(skipping full download; pass --with-download to test RapidAPI + MP3)');
  }

  console.log('\nOK — URL works for partner-order metadata (oEmbed + video id).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
