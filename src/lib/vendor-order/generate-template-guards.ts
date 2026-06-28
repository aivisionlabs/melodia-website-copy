/**
 * Guard logic for POST /api/vendor-order/{token}/generate-template.
 * Kept pure for unit tests.
 */

export interface GenerateTemplateGuardOrder {
  product_type: string;
  status: string;
}

export interface GenerateTemplateGuardBody {
  templateId: unknown;
  recipientName: unknown;
}

export type GenerateTemplateGuardError =
  | { ok: false; httpStatus: 400; error: string }
  | { ok: false; httpStatus: 409; error: string };

export function checkGenerateTemplateAllowed(
  order: GenerateTemplateGuardOrder,
): { ok: true } | GenerateTemplateGuardError {
  if (order.product_type !== 'customer_templated_song') {
    return {
      ok: false,
      httpStatus: 400,
      error: 'This endpoint is only for customer_templated_song orders.',
    };
  }
  if (order.status !== 'pending') {
    return {
      ok: false,
      httpStatus: 409,
      error: 'Song generation has already been started for this order.',
    };
  }
  return { ok: true };
}

export function validateGenerateTemplateBody(body: GenerateTemplateGuardBody): {
  ok: true;
  templateId: number;
  recipientName: string;
} | { ok: false; httpStatus: 400; error: string } {
  const { templateId, recipientName } = body;

  if (
    typeof templateId !== 'number' ||
    !Number.isInteger(templateId) ||
    templateId <= 0
  ) {
    return { ok: false, httpStatus: 400, error: 'Invalid request body.' };
  }

  if (
    typeof recipientName !== 'string' ||
    recipientName.trim().length === 0 ||
    recipientName.trim().length > 200
  ) {
    return { ok: false, httpStatus: 400, error: 'Invalid request body.' };
  }

  return { ok: true, templateId, recipientName: recipientName.trim() };
}
