import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { signWebhookPayload } from '@/lib/partner-api/outbound-webhook';

describe('signWebhookPayload', () => {
  it('produces sha256= prefix and verifies with same secret', () => {
    const secret = 'whsec_test_32byte_minimum_length_ok';
    const body = JSON.stringify({ event: 'order.completed', order_id: 1 });
    const sig = signWebhookPayload(body, secret);
    expect(sig.startsWith('sha256=')).toBe(true);
    const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(sig).toBe(expected);
  });

  it('changes when body is tampered', () => {
    const secret = 'whsec_test_32byte_minimum_length_ok';
    const body = JSON.stringify({ a: 1 });
    const sig = signWebhookPayload(body, secret);
    const other = signWebhookPayload(body + 'x', secret);
    expect(sig).not.toBe(other);
  });
});
