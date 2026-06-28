/**
 * Partner API JSON body parsing with a repair pass for common client mistakes
 * (e.g. raw newlines inside string values, which RFC 8259 forbids).
 */

import { jsonrepair } from 'jsonrepair';
import type { NextRequest } from 'next/server';

export type PartnerParsedJson = {
  data: unknown;
  /** True when strict JSON.parse failed and jsonrepair recovered the payload */
  repaired: boolean;
};

export async function parsePartnerRequestJson(req: NextRequest): Promise<PartnerParsedJson> {
  const text = await req.text();
  if (text.trim() === '') {
    return { data: null, repaired: false };
  }

  try {
    return { data: JSON.parse(text), repaired: false };
  } catch (first) {
    if (!(first instanceof SyntaxError)) {
      throw first;
    }
    try {
      const repairedText = jsonrepair(text);
      return { data: JSON.parse(repairedText), repaired: true };
    } catch {
      throw first;
    }
  }
}
