import { describe, it, expect, vi, beforeEach } from 'vitest';
import { namedropHandler } from '@/lib/payments/handlers/namedrop-handler';
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

const baseSongRequest = {
  id: 42,
  request_source: 'namedrop_template',
  namedrop_template_id: 7,
  recipient_details: 'Alice, friend',
  user_id: 1,
  anonymous_user_id: null,
  recipient_name_in_script: null,
} as any;

function makeCtx(overrides?: Partial<PaymentSuccessContext>): PaymentSuccessContext {
  return {
    paymentId: 100,
    requestId: '42',
    payment: {} as any,
    songRequest: baseSongRequest,
    packageData: null,
    db: mockDb as any,
    logger: mockLogger as any,
    origin: 'http://localhost:3000',
    ...overrides,
  };
}

function makeChain(finalValue: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(finalValue);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  return chain;
}

vi.mock('@/lib/services/templated-song-generation-service', () => ({
  generateTemplatedInstanceForIdentity: vi.fn().mockResolvedValue({ slug: 'new-slug-abc' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('namedropHandler', () => {
  it('returns existing slug without generating when instance already exists', async () => {
    const selectChain = makeChain([{ slug: 'existing-slug', status: 'processing' }]);
    const updateChain = makeChain(undefined);
    mockDb.select.mockReturnValue(selectChain);
    mockDb.update.mockReturnValue(updateChain);

    const result = await namedropHandler(makeCtx());

    expect(result.redirectUrl).toBe('/song-template/song/existing-slug');
    expect(result.templatedInstanceSlug).toBe('existing-slug');
    expect(result.message).toBe('NameDrop song already in progress');
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('generates a new instance and updates status when none exists', async () => {
    const { generateTemplatedInstanceForIdentity } = await import(
      '@/lib/services/templated-song-generation-service'
    );

    const selectChain = makeChain([]);
    const updateChain = makeChain(undefined);
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(selectChain);
    mockDb.update.mockReturnValue(updateChain);

    const result = await namedropHandler(makeCtx());

    expect(generateTemplatedInstanceForIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 7,
        name: 'Alice',
        songRequestId: 42,
      })
    );
    expect(result.redirectUrl).toBe('/song-template/song/new-slug-abc');
    expect(result.templatedInstanceSlug).toBe('new-slug-abc');
    expect(result.message).toBe('NameDrop song generation started');
  });

  it('uses "Friend" as fallback recipient name when recipient_details is empty', async () => {
    const { generateTemplatedInstanceForIdentity } = await import(
      '@/lib/services/templated-song-generation-service'
    );

    const selectChain = makeChain([]);
    const updateChain = makeChain(undefined);
    updateChain.set = vi.fn().mockReturnValue(updateChain);
    updateChain.where = vi.fn().mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(selectChain);
    mockDb.update.mockReturnValue(updateChain);

    const ctx = makeCtx({
      songRequest: { ...baseSongRequest, recipient_details: '' },
    });
    await namedropHandler(ctx);

    expect(generateTemplatedInstanceForIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Friend' })
    );
  });
});
