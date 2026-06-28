import { describe, it, expect } from 'vitest';
import { checkSubmitFormAllowed } from '@/lib/vendor-order/submit-guards';

describe('checkSubmitFormAllowed', () => {
  it('allows pending customer_custom_song with no song_request_id', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_custom_song',
      status: 'pending',
      song_request_id: null,
    });
    expect(r).toEqual({ ok: true });
  });

  it('rejects non customer_custom_song with 400', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_templated_song',
      status: 'pending',
      song_request_id: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(400);
    }
  });

  it('rejects non-pending with 409', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_custom_song',
      status: 'lyrics_ready_for_review',
      song_request_id: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(409);
    }
  });

  it('rejects when song_request_id already set (409)', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_custom_song',
      status: 'pending',
      song_request_id: 99,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.httpStatus).toBe(409);
    }
  });
});
