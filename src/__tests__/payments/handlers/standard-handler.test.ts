import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { standardHandler } from '@/lib/payments/handlers/standard-handler';
import { HandlerError } from '@/lib/payments/handlers/types';
import type { PaymentSuccessContext } from '@/lib/payments/handlers/types';

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const approvedDraft = {
  id: 55,
  status: 'approved',
  customer_lyrics: 'Happy birthday lyrics',
  model_ready_lyrics: 'model ready lyrics',
  song_request_id: 42,
} as any;

function makeSelectChain(finalValue: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

function makeUpdateChain() {
  const chain: any = {};
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function makeCtx(overrides?: Partial<PaymentSuccessContext>): PaymentSuccessContext {
  return {
    paymentId: 100,
    requestId: '42',
    payment: {} as any,
    songRequest: { id: 42, languages: 'English', recipient_details: 'Bob' } as any,
    packageData: null,
    db: mockDb as any,
    logger: mockLogger as any,
    origin: 'http://localhost:3000',
    ...overrides,
  };
}

vi.mock('@/lib/services/llm/llm-audio-model-lyrics-crafter', () => ({
  craftAudioModelLyrics: vi.fn().mockResolvedValue('crafted model lyrics'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * standard-handler calls: select(approvedLyrics) then shared.ts calls select(existingSongs).
 * We need to sequence mocks: call 1 = approvedLyrics, call 2 = existingSongs idempotency check.
 */
function setupSelectSequence(responses: any[]) {
  let callCount = 0;
  mockDb.select.mockImplementation(() => {
    const value = responses[callCount] ?? [];
    callCount++;
    return makeSelectChain(value);
  });
}

describe('standardHandler', () => {
  it('throws HandlerError(400) when no approved lyrics found', async () => {
    // First select (approvedLyrics): empty
    setupSelectSequence([[]]);

    await expect(standardHandler(makeCtx())).rejects.toThrow(HandlerError);
    setupSelectSequence([[]]);
    await expect(standardHandler(makeCtx())).rejects.toMatchObject({ status: 400 });
  });

  it('returns existing songId without generation when song already exists (idempotency)', async () => {
    // First select (approvedLyrics): found | second select (idempotency in shared): existing song
    setupSelectSequence([[approvedDraft], [{ id: 66 }]]);
    mockDb.update.mockReturnValue(makeUpdateChain());

    const result = await standardHandler(makeCtx());

    expect(result.songId).toBe(66);
    expect(result.redirectUrl).toBe('/song-options/66');
    // No fetch/update calls because we returned early
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('calls generate-song and returns songId + redirectUrl', async () => {
    // First select (approvedLyrics): found | second select (idempotency): no existing song
    setupSelectSequence([[approvedDraft], []]);
    mockDb.update.mockReturnValue(makeUpdateChain());

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, songId: 77 }),
    }));

    const result = await standardHandler(makeCtx());

    expect(result.songId).toBe(77);
    expect(result.redirectUrl).toBe('/song-options/77');
    expect(result.message).toBe('Song created successfully');
  });

  it('crafts model_ready_lyrics when missing', async () => {
    const { craftAudioModelLyrics } = await import('@/lib/services/llm/llm-audio-model-lyrics-crafter');
    const draftWithoutModelReady = { ...approvedDraft, model_ready_lyrics: null };

    setupSelectSequence([[draftWithoutModelReady], []]);
    mockDb.update.mockReturnValue(makeUpdateChain());

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, songId: 78 }),
    }));

    await standardHandler(makeCtx());

    expect(craftAudioModelLyrics).toHaveBeenCalledWith(
      expect.objectContaining({ displayLyrics: 'Happy birthday lyrics' })
    );
  });

  it('skips craftAudioModelLyrics when model_ready_lyrics already present', async () => {
    const { craftAudioModelLyrics } = await import('@/lib/services/llm/llm-audio-model-lyrics-crafter');

    setupSelectSequence([[approvedDraft], []]);
    mockDb.update.mockReturnValue(makeUpdateChain());

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, songId: 79 }),
    }));

    await standardHandler(makeCtx());

    expect(craftAudioModelLyrics).not.toHaveBeenCalled();
  });

  it('throws when generate-song returns non-ok', async () => {
    setupSelectSequence([[approvedDraft], []]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Suno quota exceeded' }),
    }));

    await expect(standardHandler(makeCtx())).rejects.toThrow('Suno quota exceeded');
  });
});
