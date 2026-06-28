import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeWhatsAppToDigits,
  sendTryowbotTemplateMessage,
} from '@/lib/whatsapp/tryowbot';

const ENV_CC = 'TRYOWBOT_DEFAULT_COUNTRY_CODE';

describe('normalizeWhatsAppToDigits', () => {
  let previousCc: string | undefined;

  beforeEach(() => {
    previousCc = process.env[ENV_CC];
    delete process.env[ENV_CC];
  });

  afterEach(() => {
    if (previousCc === undefined) delete process.env[ENV_CC];
    else process.env[ENV_CC] = previousCc;
  });

  describe('without TRYOWBOT_DEFAULT_COUNTRY_CODE', () => {
    it('strips formatting and plus from full international number', () => {
      expect(normalizeWhatsAppToDigits('+91 98765 43210')).toBe('919876543210');
    });

    it('accepts 10-digit local as-is (length in TryOWBot range)', () => {
      expect(normalizeWhatsAppToDigits('9876543210')).toBe('9876543210');
    });

    it('returns null for empty or whitespace', () => {
      expect(normalizeWhatsAppToDigits('')).toBeNull();
      expect(normalizeWhatsAppToDigits('   ')).toBeNull();
      expect(normalizeWhatsAppToDigits(null)).toBeNull();
      expect(normalizeWhatsAppToDigits(undefined)).toBeNull();
    });

    it('returns null when too few digits', () => {
      expect(normalizeWhatsAppToDigits('12345')).toBeNull();
    });

    it('returns null for all-zero input', () => {
      expect(normalizeWhatsAppToDigits('000')).toBeNull();
    });
  });

  describe('with TRYOWBOT_DEFAULT_COUNTRY_CODE=91', () => {
    beforeEach(() => {
      process.env[ENV_CC] = '91';
    });

    it('prefixes 10-digit mobile with country code', () => {
      expect(normalizeWhatsAppToDigits('9876543210')).toBe('919876543210');
    });

    it('does not double-prefix when number already includes 91', () => {
      expect(normalizeWhatsAppToDigits('919876543210')).toBe('919876543210');
    });

    it('normalizes national trunk 0 + 10-digit local', () => {
      expect(normalizeWhatsAppToDigits('09876543210')).toBe('919876543210');
    });

    it('normalizes 00 international access prefix before India CC', () => {
      expect(normalizeWhatsAppToDigits('00919876543210')).toBe('919876543210');
    });

    it('normalizes leading 0 before full international (mis-paste)', () => {
      expect(normalizeWhatsAppToDigits('0919876543210')).toBe('919876543210');
    });

    it('removes duplicate country code at start', () => {
      expect(normalizeWhatsAppToDigits('9191876543210')).toBe('91876543210');
    });

    it('strips non-digits from input', () => {
      expect(normalizeWhatsAppToDigits('+91-98765-43210')).toBe('919876543210');
    });
  });

  describe('with TRYOWBOT_DEFAULT_COUNTRY_CODE=+91', () => {
    beforeEach(() => {
      process.env[ENV_CC] = '+91';
    });

    it('reads digits from env and prefixes 10-digit local', () => {
      expect(normalizeWhatsAppToDigits('9876543210')).toBe('919876543210');
    });
  });
});

describe('sendTryowbotTemplateMessage — phone normalization', () => {
  let previousCc: string | undefined;

  beforeEach(() => {
    previousCc = process.env[ENV_CC];
    process.env[ENV_CC] = '91';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousCc === undefined) delete process.env[ENV_CC];
    else process.env[ENV_CC] = previousCc;
  });

  it('does not call fetch when normalized number is invalid', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    const result = await sendTryowbotTemplateMessage({
      to: '123',
      apiname: 'test_campaign',
      parameters: { body: { var1: 'a', var2: 'b' } },
      credentials: { appid: 'app', apikey: 'key' },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid WhatsApp number/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST body uses normalized `to` (TryOWBot format)', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    const result = await sendTryowbotTemplateMessage({
      to: '9876543210',
      apiname: 'test_campaign',
      parameters: {
        header: { type: 'text', text: { var1: 'Vendor' } },
        body: { var1: 'Hi', var2: 'https://example.com/o' },
      },
      credentials: { appid: 'app-id', apikey: 'api-key' },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { to: string; apiname: string };
    expect(body.to).toBe('919876543210');
    expect(body.apiname).toBe('test_campaign');
  });
});
