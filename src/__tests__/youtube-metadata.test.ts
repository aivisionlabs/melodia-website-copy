import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractYouTubeVideoId,
  getYouTubeVideoInfo,
  normalizeYouTubeUrl,
  validateYouTubeUrl,
} from '@/lib/youtube/metadata';

function mockOEmbed(status: number, body?: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      statusText: String(status),
      json: async () => body ?? {},
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('extractYouTubeVideoId', () => {
  it('parses watch, youtu.be, embed, and shorts URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URLs', () => {
    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
    expect(extractYouTubeVideoId('https://example.com/no-video')).toBeNull();
  });
});

describe('normalizeYouTubeUrl', () => {
  it('strips playlist and radio query params', () => {
    expect(
      normalizeYouTubeUrl(
        'https://www.youtube.com/watch?v=1LPtNHJckpw&list=RD1LPtNHJckpw&start_radio=1',
      ),
    ).toBe('https://www.youtube.com/watch?v=1LPtNHJckpw');
  });
});

describe('getYouTubeVideoInfo', () => {
  it('returns title from oEmbed on 200', async () => {
    mockOEmbed(200, { title: 'Test Song', author_name: 'Artist' });
    const info = await getYouTubeVideoInfo('https://www.youtube.com/watch?v=abc12345678');
    expect(info).toMatchObject({
      videoId: 'abc12345678',
      title: 'Test Song',
      author: 'Artist',
      isAvailable: true,
    });
  });

  it('accepts embed-disabled videos (oEmbed 401) by video id', async () => {
    mockOEmbed(401);
    const info = await getYouTubeVideoInfo(
      'https://www.youtube.com/watch?v=1LPtNHJckpw&list=RD1LPtNHJckpw',
    );
    expect(info).toMatchObject({
      videoId: '1LPtNHJckpw',
      title: 'Unknown title',
      isAvailable: true,
    });
  });

  it('rejects removed videos (oEmbed 404)', async () => {
    mockOEmbed(404);
    const info = await getYouTubeVideoInfo('https://www.youtube.com/watch?v=removedvid1');
    expect(info.isAvailable).toBe(false);
  });
});

describe('validateYouTubeUrl', () => {
  it('is valid when oEmbed returns 401 (embed disabled)', async () => {
    mockOEmbed(401);
    const result = await validateYouTubeUrl('https://www.youtube.com/watch?v=1LPtNHJckpw');
    expect(result).toEqual({ valid: true });
  });

  it('is invalid when oEmbed returns 404', async () => {
    mockOEmbed(404);
    const result = await validateYouTubeUrl('https://www.youtube.com/watch?v=removedvid1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private or unavailable');
  });
});
