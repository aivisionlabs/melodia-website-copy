/**
 * Guard logic for POST /api/vendor-order/{token}/revise-lyrics.
 * Kept pure for unit tests.
 */

const REVISE_VALID_STATUSES = ['lyrics_ready_for_review', 'lyrics_revision_requested'] as const;
export const DEFAULT_ALLOWED_LYRICS_EDITS = 2;

export interface ReviseLyricsGuardOrder {
  status: string;
  song_request_id: number | null;
}

export type ReviseLyricsGuardError =
  | { ok: false; httpStatus: 400; error: string }
  | { ok: false; httpStatus: 409; error: string }
  | { ok: false; httpStatus: 429; error: string };

export function checkReviseLyricsAllowed(
  order: ReviseLyricsGuardOrder,
): { ok: true } | ReviseLyricsGuardError {
  if (!(REVISE_VALID_STATUSES as readonly string[]).includes(order.status)) {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Lyrics cannot be revised in the current order state.',
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

export function checkRevisionLimit(
  editsUsed: number | null | undefined,
  allowedEdits: number,
): { ok: true } | { ok: false; httpStatus: 429; error: string } {
  if ((editsUsed ?? 0) >= allowedEdits) {
    return {
      ok: false,
      httpStatus: 429,
      error: `Lyrics revision limit reached (${allowedEdits} revisions allowed).`,
    };
  }
  return { ok: true };
}
