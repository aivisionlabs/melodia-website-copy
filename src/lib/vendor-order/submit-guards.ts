/**
 * Guard logic for POST /api/vendor-order/{token}/submit (customer custom song form).
 * Kept pure for unit tests.
 */

export interface SubmitFormGuardOrder {
  product_type: string;
  status: string;
  song_request_id: number | null;
}

export type SubmitFormGuardError =
  | { ok: false; httpStatus: 400; error: string }
  | { ok: false; httpStatus: 409; error: string };

export function checkSubmitFormAllowed(
  order: SubmitFormGuardOrder,
): { ok: true } | SubmitFormGuardError {
  if (order.product_type !== 'customer_custom_song') {
    return {
      ok: false,
      httpStatus: 400,
      error: 'This endpoint is only for customer_custom_song orders.',
    };
  }
  if (order.status !== 'pending') {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Song details have already been submitted for this order.',
    };
  }
  if (order.song_request_id) {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Song details have already been submitted for this order.',
    };
  }
  return { ok: true };
}
