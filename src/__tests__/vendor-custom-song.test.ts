import { describe, it, expect } from 'vitest';
import { checkSubmitFormAllowed } from '@/lib/vendor-order/submit-guards';
import {
  checkApproveLyricsAllowed,
  validateApproveLyricsBody,
} from '@/lib/vendor-order/approve-lyrics-guards';
import {
  checkReviseLyricsAllowed,
  checkRevisionLimit,
  DEFAULT_ALLOWED_LYRICS_EDITS,
} from '@/lib/vendor-order/revise-lyrics-guards';
import { getEffectiveVendorOrderStatusForResponse } from '@/lib/vendor-order/effective-order-status';

// ─── C3: Submit form — double-submit guard ────────────────────────────────────

describe('checkSubmitFormAllowed (C3, C4 variants)', () => {
  it('C3: allows pending customer_custom_song with no song_request_id', () => {
    expect(
      checkSubmitFormAllowed({ product_type: 'customer_custom_song', status: 'pending', song_request_id: null }),
    ).toEqual({ ok: true });
  });

  it('C3: rejects when song_request_id is already set → 409', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_custom_song',
      status: 'pending',
      song_request_id: 55,
    });
    expect(r).toMatchObject({ ok: false, httpStatus: 409 });
    expect((r as any).error).toMatch(/already been submitted/);
  });

  it('C3: rejects non-pending status → 409', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_custom_song',
      status: 'form_submitted',
      song_request_id: null,
    });
    expect(r).toMatchObject({ ok: false, httpStatus: 409 });
  });

  const nonPendingStatuses = [
    'form_submitted',
    'lyrics_generation_inprogress',
    'lyrics_ready_for_review',
    'lyrics_revision_requested',
    'lyrics_approved',
    'song_generation_inprogress',
    'completed',
    'failed',
  ];

  for (const status of nonPendingStatuses) {
    it(`rejects status="${status}" → 409`, () => {
      const r = checkSubmitFormAllowed({
        product_type: 'customer_custom_song',
        status,
        song_request_id: null,
      });
      expect(r).toMatchObject({ ok: false, httpStatus: 409 });
    });
  }

  it('T2 crosscheck: rejects customer_templated_song → 400', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'customer_templated_song',
      status: 'pending',
      song_request_id: null,
    });
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
    expect((r as any).error).toMatch(/customer_custom_song/);
  });

  it('rejects rj_show → 400', () => {
    const r = checkSubmitFormAllowed({
      product_type: 'rj_show',
      status: 'pending',
      song_request_id: null,
    });
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
  });
});

// ─── C4: Approve lyrics — status guard ───────────────────────────────────────

describe('checkApproveLyricsAllowed (C4)', () => {
  it('allows lyrics_ready_for_review with song_request_id set', () => {
    const r = checkApproveLyricsAllowed({ status: 'lyrics_ready_for_review', song_request_id: 10 });
    expect(r).toEqual({ ok: true });
  });

  const wrongStatuses = [
    'pending',
    'form_submitted',
    'lyrics_generation_inprogress',
    'lyrics_revision_requested',
    'lyrics_approved',
    'song_generation_inprogress',
    'completed',
    'failed',
  ];

  for (const status of wrongStatuses) {
    it(`rejects status="${status}" → 409`, () => {
      const r = checkApproveLyricsAllowed({ status, song_request_id: 1 });
      expect(r).toMatchObject({ ok: false, httpStatus: 409 });
      expect((r as any).error).toMatch(/cannot be approved/);
    });
  }

  it('rejects missing song_request_id → 400', () => {
    const r = checkApproveLyricsAllowed({ status: 'lyrics_ready_for_review', song_request_id: null });
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
    expect((r as any).error).toMatch(/No song request/);
  });
});

// ─── Approve lyrics body validation ──────────────────────────────────────────

describe('validateApproveLyricsBody', () => {
  it('accepts valid lyricsDraftId with no edits', () => {
    const r = validateApproveLyricsBody({ lyricsDraftId: 7 });
    expect(r).toEqual({ ok: true, lyricsDraftId: 7, customerLyrics: null });
  });

  it('accepts valid lyricsDraftId with customerLyrics string', () => {
    const r = validateApproveLyricsBody({ lyricsDraftId: 3, customerLyrics: 'My edited lyrics' });
    expect(r).toEqual({ ok: true, lyricsDraftId: 3, customerLyrics: 'My edited lyrics' });
  });

  it('treats null customerLyrics as no edits', () => {
    const r = validateApproveLyricsBody({ lyricsDraftId: 3, customerLyrics: null });
    expect(r).toMatchObject({ ok: true, customerLyrics: null });
  });

  it('rejects zero lyricsDraftId → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: 0 })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it('rejects negative lyricsDraftId → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: -1 })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it('rejects float lyricsDraftId → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: 1.5 })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it('rejects string lyricsDraftId → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: '5' })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it('rejects missing lyricsDraftId → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: undefined })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it('rejects numeric customerLyrics → 400', () => {
    expect(validateApproveLyricsBody({ lyricsDraftId: 1, customerLyrics: 42 })).toMatchObject({
      ok: false,
      httpStatus: 400,
    });
  });
});

// ─── C2: Revise lyrics — status guard ────────────────────────────────────────

describe('checkReviseLyricsAllowed (C2)', () => {
  it('allows lyrics_ready_for_review', () => {
    const r = checkReviseLyricsAllowed({ status: 'lyrics_ready_for_review', song_request_id: 1 });
    expect(r).toEqual({ ok: true });
  });

  it('allows lyrics_revision_requested (revision already in-flight)', () => {
    const r = checkReviseLyricsAllowed({ status: 'lyrics_revision_requested', song_request_id: 1 });
    expect(r).toEqual({ ok: true });
  });

  const invalidStatuses = [
    'pending',
    'form_submitted',
    'lyrics_generation_inprogress',
    'lyrics_approved',
    'song_generation_inprogress',
    'completed',
    'failed',
  ];

  for (const status of invalidStatuses) {
    it(`rejects status="${status}" → 409`, () => {
      const r = checkReviseLyricsAllowed({ status, song_request_id: 1 });
      expect(r).toMatchObject({ ok: false, httpStatus: 409 });
      expect((r as any).error).toMatch(/cannot be revised/);
    });
  }

  it('rejects missing song_request_id → 400', () => {
    const r = checkReviseLyricsAllowed({ status: 'lyrics_ready_for_review', song_request_id: null });
    expect(r).toMatchObject({ ok: false, httpStatus: 400 });
    expect((r as any).error).toMatch(/No song request/);
  });
});

// ─── C2: Revision limit enforcement ──────────────────────────────────────────

describe('checkRevisionLimit (C2)', () => {
  it('allows when no edits have been used', () => {
    expect(checkRevisionLimit(0, 2)).toEqual({ ok: true });
  });

  it('allows when edits used is below the limit', () => {
    expect(checkRevisionLimit(1, 2)).toEqual({ ok: true });
  });

  it('blocks when edits used equals the limit → 429', () => {
    const r = checkRevisionLimit(2, 2);
    expect(r).toMatchObject({ ok: false, httpStatus: 429 });
    expect((r as any).error).toMatch(/revision limit reached/);
    expect((r as any).error).toMatch(/2 revisions allowed/);
  });

  it('blocks when edits used exceeds the limit → 429', () => {
    expect(checkRevisionLimit(5, 2)).toMatchObject({ ok: false, httpStatus: 429 });
  });

  it('treats null edits_used as 0 — allows first revision', () => {
    expect(checkRevisionLimit(null, 2)).toEqual({ ok: true });
  });

  it('treats undefined edits_used as 0 — allows first revision', () => {
    expect(checkRevisionLimit(undefined, 2)).toEqual({ ok: true });
  });

  it('error message includes the configured allowed count', () => {
    const r = checkRevisionLimit(5, 3) as { ok: false; error: string };
    expect(r.error).toMatch(/3 revisions allowed/);
  });

  it('DEFAULT_ALLOWED_LYRICS_EDITS is 2', () => {
    expect(DEFAULT_ALLOWED_LYRICS_EDITS).toBe(2);
  });

  it('respects a custom higher limit (premium package)', () => {
    expect(checkRevisionLimit(4, 5)).toEqual({ ok: true });
    expect(checkRevisionLimit(5, 5)).toMatchObject({ ok: false, httpStatus: 429 });
  });

  it('respects a limit of 0 (no revisions package)', () => {
    expect(checkRevisionLimit(0, 0)).toMatchObject({ ok: false, httpStatus: 429 });
  });
});

// ─── C6: Effective status — custom song ──────────────────────────────────────

describe('getEffectiveVendorOrderStatusForResponse — customer_custom_song (C6)', () => {
  it('C6: maps song_generation_inprogress + user_song completed → completed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'completed',
      }),
    ).toBe('completed');
  });

  it('C6: maps song_generation_inprogress + user_song failed → failed', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'failed',
      }),
    ).toBe('failed');
  });

  it('returns song_generation_inprogress while user_song is still processing', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: 'processing',
      }),
    ).toBe('song_generation_inprogress');
  });

  it('returns song_generation_inprogress when user_song is null (not yet created)', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: null,
        userSongStatus: null,
      }),
    ).toBe('song_generation_inprogress');
  });

  it('passes through all pre-generation statuses unchanged', () => {
    const preGenStatuses = [
      'pending',
      'form_submitted',
      'lyrics_generation_inprogress',
      'lyrics_ready_for_review',
      'lyrics_revision_requested',
      'lyrics_approved',
    ];
    for (const status of preGenStatuses) {
      expect(
        getEffectiveVendorOrderStatusForResponse({
          orderStatus: status,
          productType: 'customer_custom_song',
          templatedInstanceStatus: null,
          userSongStatus: 'completed',
        }),
      ).toBe(status);
    }
  });

  it('does not use templatedInstanceStatus for customer_custom_song', () => {
    expect(
      getEffectiveVendorOrderStatusForResponse({
        orderStatus: 'song_generation_inprogress',
        productType: 'customer_custom_song',
        templatedInstanceStatus: 'completed',
        userSongStatus: 'processing',
      }),
    ).toBe('song_generation_inprogress');
  });
});
