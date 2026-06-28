import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Mirror of the schema in process-custom-lyrics/route.ts so tests stay in-process
// and don't require spinning up the Next.js server.
const processCustomLyricsSchema = z.object({
  songRequestId: z.number(),
  customLyrics: z
    .string()
    .min(50, 'Custom lyrics must be at least 50 characters long')
    .max(2500, 'Lyrics must be under 2500 characters so the song can be generated correctly'),
});

const VALID_LYRICS = 'पहली नज़र में जो देखा था तुझको, दिल ने कहा था यही है वो किस्सा । '.repeat(3); // well within limits

describe('process-custom-lyrics schema validation', () => {
  it('accepts valid lyrics within bounds', () => {
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: VALID_LYRICS,
    });
    expect(result.success).toBe(true);
  });

  it('rejects lyrics shorter than 50 characters', () => {
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: 'too short',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/50 characters/);
  });

  it('rejects lyrics exceeding 2500 characters', () => {
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: 'a'.repeat(2501),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/2500 characters/);
  });

  it('accepts lyrics at exactly 50 characters', () => {
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: 'a'.repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it('accepts lyrics at exactly 2500 characters', () => {
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: 'a'.repeat(2500),
    });
    expect(result.success).toBe(true);
  });

  it('accepts lyrics at 2500 chars that contain Devanagari (multibyte but JS counts codepoints)', () => {
    // Each Devanagari char is one JS codepoint despite being 3 UTF-8 bytes
    const devanagari = 'क'.repeat(2500);
    const result = processCustomLyricsSchema.safeParse({
      songRequestId: 1,
      customLyrics: devanagari,
    });
    expect(result.success).toBe(true);
  });
});
