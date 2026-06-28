import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wizardHandler } from '@/lib/payments/handlers/wizard-handler';
import { HandlerError } from '@/lib/payments/handlers/types';
import type { PaymentSuccessContext } from '@/lib/payments/handlers/types';

const mockDb = {
  select: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function makeSelectChain(finalValue: any) {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

vi.mock('@/lib/lyrics-display-actions', () => ({
  approveLyricsAction: vi.fn(),
}));

function makeCtx(overrides?: Partial<PaymentSuccessContext>): PaymentSuccessContext {
  return {
    paymentId: 100,
    requestId: '42',
    payment: {} as any,
    songRequest: { id: 42, request_source: 'create_song_wizard' } as any,
    packageData: { slug: 'package_2' } as any,
    db: mockDb as any,
    logger: mockLogger as any,
    origin: 'http://localhost:3000',
    ...overrides,
  };
}

/**
 * Set up sequential select mocks. First call is always the idempotency check
 * (userSongsTable lookup). Subsequent calls are for lyricsDrafts.
 */
function setupSelectMocks(responses: any[]) {
  let callCount = 0;
  mockDb.select.mockImplementation(() => {
    const value = responses[callCount] ?? [];
    callCount++;
    return makeSelectChain(value);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wizardHandler — idempotency', () => {
  it('returns existing songId without any generation when song already exists', async () => {
    // First select (idempotency): existing song found
    setupSelectMocks([[{ id: 55 }]]);

    const result = await wizardHandler(makeCtx());

    expect(result).not.toBeNull();
    expect(result?.songId).toBe(55);
    expect(result?.redirectUrl).toBe('/song-options/55');

    const { approveLyricsAction } = await import('@/lib/lyrics-display-actions');
    expect(approveLyricsAction).not.toHaveBeenCalled();
  });
});

describe('wizardHandler — approval flows', () => {
  // The wizard-handler makes these db.select() calls in order:
  //   [0] idempotency check (userSongsTable, with .limit)
  //   [1] existingDrafts (lyricsDraftsTable, with .orderBy but NO .limit — mock chain ignored)
  //   [2] latestDraftRows (lyricsDraftsTable, with .limit)
  // So responses[1] is consumed but effectively ignored; responses[2] drives latestDraft.

  it('returns null when draft is already approved (falls through to standard)', async () => {
    setupSelectMocks([
      [],                              // [0] idempotency: no existing song
      [],                              // [1] existingDrafts (ignored by mock, no .limit)
      [{ id: 10, status: 'approved' }] // [2] latestDraftRows
    ]);

    const result = await wizardHandler(makeCtx());

    expect(result).toBeNull();
  });

  it('returns HandlerResult with songId when approveLyricsAction creates a song', async () => {
    const { approveLyricsAction } = await import('@/lib/lyrics-display-actions');
    (approveLyricsAction as any).mockResolvedValue({ success: true, songId: 99 });

    setupSelectMocks([
      [],                             // [0] idempotency: no existing song
      [],                             // [1] existingDrafts
      [{ id: 10, status: 'draft' }]   // [2] latestDraftRows
    ]);

    const result = await wizardHandler(makeCtx());

    expect(result).not.toBeNull();
    expect(result?.songId).toBe(99);
    expect(result?.redirectUrl).toBe('/song-options/99');
  });

  it('returns null when approveLyricsAction succeeds but no songId (falls through to standard)', async () => {
    const { approveLyricsAction } = await import('@/lib/lyrics-display-actions');
    (approveLyricsAction as any).mockResolvedValue({ success: true, songId: undefined });

    setupSelectMocks([
      [],
      [],
      [{ id: 10, status: 'draft' }]
    ]);

    const result = await wizardHandler(makeCtx());

    expect(result).toBeNull();
  });

  it('throws HandlerError(500) when approveLyricsAction fails', async () => {
    const { approveLyricsAction } = await import('@/lib/lyrics-display-actions');
    (approveLyricsAction as any).mockResolvedValue({ success: false, error: 'approval failed' });

    setupSelectMocks([[], [], [{ id: 10, status: 'draft' }]]);

    await expect(wizardHandler(makeCtx())).rejects.toThrow(HandlerError);
  });
});

describe('wizardHandler — lyrics generation fallback', () => {
  it('propagates error when generate-lyrics fetch throws (network failure)', async () => {
    // idempotency: no existing song | existingDrafts: empty → triggers generate-lyrics
    setupSelectMocks([[]]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('LLM service unavailable')));

    await expect(wizardHandler(makeCtx())).rejects.toThrow();
  });

  it('throws HandlerError(400) when no draft exists after fallback generation', async () => {
    // idempotency: no existing song | existingDrafts: empty | latestDraftRows: empty
    setupSelectMocks([[], []]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));

    await expect(wizardHandler(makeCtx())).rejects.toThrow(HandlerError);
  });
});
