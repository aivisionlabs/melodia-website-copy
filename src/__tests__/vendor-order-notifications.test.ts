import { describe, it, expect } from 'vitest';
import {
  hasPartnerWebhookTarget,
  buildVendorOrderTryowbotTemplateParameters,
  isOrderCreatedNotificationProductType,
} from '@/lib/vendor-order/notifications';

// ─── Stubs ────────────────────────────────────────────────────────────────────

function makeOrder(
  overrides: Partial<{
    id: number;
    webhook_url: string | null;
    product_type: string;
    customer_mobile: string | null;
    order_token: string | null;
  }> = {},
) {
  return {
    id: 1,
    webhook_url: null,
    product_type: 'customer_templated_song',
    customer_mobile: '+919876543210',
    order_token: 'tok_abc',
    ...overrides,
  } as any;
}

function makeVendor(
  overrides: Partial<{
    id: number;
    slug: string;
    name: string;
    webhook_url: string | null;
  }> = {},
) {
  return {
    id: 42,
    slug: 'acme',
    name: 'Acme Corp',
    webhook_url: null,
    ...overrides,
  } as any;
}

// ─── hasPartnerWebhookTarget ──────────────────────────────────────────────────

describe('hasPartnerWebhookTarget', () => {
  it('returns true when order has webhook_url', () => {
    expect(
      hasPartnerWebhookTarget(
        makeOrder({ webhook_url: 'https://partner.example.com/hook' }),
        makeVendor(),
      ),
    ).toBe(true);
  });

  it('returns true when vendor has webhook_url', () => {
    expect(
      hasPartnerWebhookTarget(
        makeOrder(),
        makeVendor({ webhook_url: 'https://vendor.example.com/hook' }),
      ),
    ).toBe(true);
  });

  it('returns true when both order and vendor have webhook_url (order takes precedence but target still present)', () => {
    expect(
      hasPartnerWebhookTarget(
        makeOrder({ webhook_url: 'https://order.example.com/hook' }),
        makeVendor({ webhook_url: 'https://vendor.example.com/hook' }),
      ),
    ).toBe(true);
  });

  it('returns false when neither order nor vendor has webhook_url', () => {
    expect(hasPartnerWebhookTarget(makeOrder(), makeVendor())).toBe(false);
  });

  it('returns false when order webhook_url is empty string', () => {
    expect(hasPartnerWebhookTarget(makeOrder({ webhook_url: '' }), makeVendor())).toBe(false);
  });

  it('returns false when order webhook_url is whitespace only', () => {
    expect(hasPartnerWebhookTarget(makeOrder({ webhook_url: '   ' }), makeVendor())).toBe(false);
  });

  it('returns false when vendor webhook_url is empty string', () => {
    expect(
      hasPartnerWebhookTarget(makeOrder(), makeVendor({ webhook_url: '' })),
    ).toBe(false);
  });
});

// ─── isOrderCreatedNotificationProductType ────────────────────────────────────

/**
 * Validates the WhatsApp allowlist for order.created.
 * Defaults: ['customer_custom_song', 'customer_templated_song'] (no env override in tests).
 */
describe('isOrderCreatedNotificationProductType', () => {
  it('includes customer_custom_song', () => {
    expect(isOrderCreatedNotificationProductType('customer_custom_song')).toBe(true);
  });

  it('includes customer_templated_song', () => {
    expect(isOrderCreatedNotificationProductType('customer_templated_song')).toBe(true);
  });

  it('excludes rj_show (no WhatsApp on order.created for RJ shows)', () => {
    expect(isOrderCreatedNotificationProductType('rj_show')).toBe(false);
  });

  it('excludes unknown product types', () => {
    expect(isOrderCreatedNotificationProductType('mystery_product')).toBe(false);
  });

  it('excludes empty string', () => {
    expect(isOrderCreatedNotificationProductType('')).toBe(false);
  });
});

// ─── buildVendorOrderTryowbotTemplateParameters ───────────────────────────────

describe('buildVendorOrderTryowbotTemplateParameters', () => {
  const BASE = {
    vendorName: 'Acme Corp',
    customerName: 'Priya',
    orderLink: 'https://melodia-songs.com/vendor/acme/order/tok_xyz',
  };

  it('maps vendor name to header.text.var1', () => {
    const params = buildVendorOrderTryowbotTemplateParameters(BASE);
    expect(params.header).toEqual({ type: 'text', text: { var1: 'Acme Corp' } });
  });

  it('maps customer name to body.var1', () => {
    const params = buildVendorOrderTryowbotTemplateParameters(BASE);
    expect(params.body.var1).toBe('Priya');
  });

  it('maps order link to body.var2', () => {
    const params = buildVendorOrderTryowbotTemplateParameters(BASE);
    expect(params.body.var2).toBe('https://melodia-songs.com/vendor/acme/order/tok_xyz');
  });

  it('header type is always "text"', () => {
    const params = buildVendorOrderTryowbotTemplateParameters({ ...BASE, vendorName: 'X' });
    expect(params.header.type).toBe('text');
  });

  it('does not mix up vendor name and customer name', () => {
    const params = buildVendorOrderTryowbotTemplateParameters({
      vendorName: 'VendorX',
      customerName: 'CustomerY',
      orderLink: 'https://example.com',
    });
    expect(params.header.text.var1).toBe('VendorX');
    expect(params.body.var1).toBe('CustomerY');
    expect(params.header.text.var1).not.toBe('CustomerY');
    expect(params.body.var1).not.toBe('VendorX');
  });
});
