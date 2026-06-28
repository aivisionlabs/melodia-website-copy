import { describe, it, expect, vi, beforeEach } from 'vitest';
import { primeHandler } from '@/lib/payments/handlers/prime-handler';
import type { PaymentSuccessContext } from '@/lib/payments/handlers/types';

const mockDb = {
  update: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

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
    songRequest: { id: 42, status: 'pending' } as any,
    packageData: { expert_created: true } as any,
    db: mockDb as any,
    logger: mockLogger as any,
    origin: 'http://localhost:3000',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('primeHandler', () => {
  it('returns isPrimeCustomer: true', async () => {
    mockDb.update.mockReturnValue(makeUpdateChain());

    const result = await primeHandler(makeCtx());

    expect(result.isPrimeCustomer).toBe(true);
    expect(result.message).toContain('Prime');
  });

  it('sets song_request status to pending when current status is pending', async () => {
    const chain = makeUpdateChain();
    mockDb.update.mockReturnValue(chain);

    await primeHandler(makeCtx({ songRequest: { id: 42, status: 'pending' } as any }));

    expect(chain.set).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('does NOT update status when already processing (no regression)', async () => {
    const chain = makeUpdateChain();
    mockDb.update.mockReturnValue(chain);

    const result = await primeHandler(makeCtx({
      songRequest: { id: 42, status: 'processing' } as any,
    }));

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(result.isPrimeCustomer).toBe(true);
  });

  it('does NOT update status when already completed', async () => {
    mockDb.update.mockReturnValue(makeUpdateChain());

    await primeHandler(makeCtx({
      songRequest: { id: 42, status: 'completed' } as any,
    }));

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('does not set a redirectUrl or songId', async () => {
    mockDb.update.mockReturnValue(makeUpdateChain());

    const result = await primeHandler(makeCtx());

    expect(result.redirectUrl).toBeUndefined();
    expect(result.songId).toBeUndefined();
  });
});
