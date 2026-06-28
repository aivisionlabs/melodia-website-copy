/**
 * Guard logic for POST /api/vendor-order/{token}/approve-lyrics.
 * Kept pure for unit tests.
 */

export interface ApproveLyricsGuardOrder {
  status: string;
  song_request_id: number | null;
}

export type ApproveLyricsGuardError =
  | { ok: false; httpStatus: 400; error: string }
  | { ok: false; httpStatus: 409; error: string };

export function checkApproveLyricsAllowed(
  order: ApproveLyricsGuardOrder,
): { ok: true } | ApproveLyricsGuardError {
  if (order.status !== 'lyrics_ready_for_review') {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Lyrics cannot be approved in the current order state.',
    };
  }
  if (!order.song_request_id) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'No song request linked to this order.',
    };
  }
  return { ok: true };
}

export interface ApproveLyricsBody {
  lyricsDraftId: unknown;
  customerLyrics?: unknown;
}

export function validateApproveLyricsBody(body: ApproveLyricsBody):
  | { ok: true; lyricsDraftId: number; customerLyrics: string | null }
  | { ok: false; httpStatus: 400; error: string } {
  const { lyricsDraftId, customerLyrics } = body;

  if (
    typeof lyricsDraftId !== 'number' ||
    !Number.isInteger(lyricsDraftId) ||
    lyricsDraftId <= 0
  ) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Validation error',
    };
  }

  if (
    customerLyrics !== undefined &&
    customerLyrics !== null &&
    typeof customerLyrics !== 'string'
  ) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'Validation error',
    };
  }

  return {
    ok: true,
    lyricsDraftId,
    customerLyrics: typeof customerLyrics === 'string' ? customerLyrics : null,
  };
}
