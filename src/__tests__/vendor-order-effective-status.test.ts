import { describe, it, expect } from 'vitest';
import { getEffectiveVendorOrderStatusForResponse } from '@/lib/vendor-order/effective-order-status';

describe('getEffectiveVendorOrderStatusForResponse', () => {
  it('returns order status unchanged when not song_generation_inprogress', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'pending',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'completed',
      }),
    ).toBe('pending');
  });

  it('maps to completed for custom song when user_song is completed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'completed',
      }),
    ).toBe('completed');
  });

  it('maps to failed for custom song when user_song is failed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'failed',
      }),
    ).toBe('failed');
  });

  it('maps to completed for customer_templated_song when instance is completed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_templated_song',
        templatedInstanceStatus: 'completed',
        userSongStatus: null,
      }),
    ).toBe('completed');
  });

  it('maps to failed for customer_templated_song when instance is failed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_templated_song',
        templatedInstanceStatus: 'failed',
        userSongStatus: null,
      }),
    ).toBe('failed');
  });

  it('does not map rj_show product type', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'rj_show',
        templatedInstanceStatus: 'completed',
        userSongStatus: 'completed',
      }),
    ).toBe('song_generation_inprogress');
  });
});
