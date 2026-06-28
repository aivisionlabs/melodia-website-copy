/**
 * TryOWBot WhatsApp Business API client for approved template campaigns.
 *
 * Required env:
 * - TRYOWBOT_APP_ID
 * - TRYOWBOT_API_KEY
 *
 * Optional env:
 * - TRYOWBOT_SEND_URL (defaults to https://web.tryowbot.com/api/v1/send)
 * - TRYOWBOT_DEFAULT_COUNTRY_CODE — e.g. `91` or `+91` for India. If set, a **10-digit** local
 *   subscriber number is prefixed with this code before send. Do not set in multi-country
 *   deployments; US 10-digit numbers would be wrong if you set `91`.
 * - TRYOWBOT_DEMO_TEST_SEND — set to `true` to allow `POST /api/admin/partner-api/test-whatsapp`
 *   (sends a template without a real order). Also allowed when `DEMO_MODE=true`.
 * - TRYOWBOT_DEMO_TEST_APINAME — default campaign name for that test route (overridable in request body).
 */

import { isDemoModeEnabled } from '@/lib/demo-mode';

export const TRYOWBOT_DEFAULT_SEND_URL = 'https://web.tryowbot.com/api/v1/send';

export interface TryowbotCredentials {
  appid: string;
  apikey: string;
}

/**
 * Matches TryOWBot send payload (`parameters` object).
 * Text headers must use `type` + `text` — see https://web.tryowbot.com/whatsapp/apidoc
 */
export interface TryowbotTemplateParameters {
  header?: {
    type: 'text';
    text: Record<string, string>;
  };
  body?: Record<string, string>;
  button?: Record<string, string>;
}

export interface SendTryowbotTemplateMessageOptions {
  /** Digits only, including country code, without a leading plus. */
  to: string;
  /** API campaign name from TryOWBot. */
  apiname: string;
  parameters: TryowbotTemplateParameters;
  credentials?: TryowbotCredentials;
}

export interface TryowbotSendResult {
  ok: boolean;
  error?: string;
  /** Truncated response body from TryOWBot (for debugging; may be empty). */
  responseBodyPreview?: string;
}

/**
 * Normalize to TryOWBot `to`: digits only, E.164-style country code, no leading `+`.
 * @see https://web.tryowbot.com/whatsapp/apidoc — country code without +
 */
export function normalizeWhatsAppToDigits(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const defaultCc = process.env.TRYOWBOT_DEFAULT_COUNTRY_CODE?.replace(/\D/g, '') ?? '';

  // International access prefix (e.g. 00 from EU) — strip before further rules
  if (digits.startsWith('00')) {
    digits = digits.replace(/^0+/, '');
    if (!digits) return null;
  }

  // Mis-paste: leading 0 then full international (e.g. 0919876543210 → 919876543210)
  if (
    defaultCc &&
    digits.startsWith('0' + defaultCc) &&
    digits.length === 1 + defaultCc.length + 10
  ) {
    digits = defaultCc + digits.slice(1 + defaultCc.length);
  }

  // National trunk 0 + 10-digit local (common in IN)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Duplicate country code at start (e.g. 9191876543210)
  if (defaultCc.length >= 1 && digits.startsWith(defaultCc)) {
    const afterCc = digits.slice(defaultCc.length);
    if (afterCc.startsWith(defaultCc)) {
      digits = defaultCc + afterCc.slice(defaultCc.length);
    }
  }

  if (defaultCc && digits.length === 10 && !digits.startsWith(defaultCc)) {
    digits = defaultCc + digits;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  if (/^0+$/.test(digits)) return null;
  return digits;
}

export function getTryowbotCredentialsFromEnv(): TryowbotCredentials | null {
  const appid = process.env.TRYOWBOT_APP_ID?.trim();
  const apikey = process.env.TRYOWBOT_API_KEY?.trim();
  if (!appid || !apikey) return null;
  return { appid, apikey };
}

export function isTryowbotConfigured(): boolean {
  return getTryowbotCredentialsFromEnv() !== null;
}

/** True when admin test WhatsApp send is allowed (no real order / song). */
export function isTryowbotDemoTestSendEnabled(): boolean {
  if (process.env.TRYOWBOT_DEMO_TEST_SEND === 'true') return true;
  return isDemoModeEnabled();
}

function resolveSendUrl(): string {
  return process.env.TRYOWBOT_SEND_URL?.trim() || TRYOWBOT_DEFAULT_SEND_URL;
}

type TryowbotPayloadJson = {
  error?: boolean | string;
  message?: string;
  /** Some responses nest status here while HTTP stays 200 */
  data?: { error?: boolean | string; message?: string };
};

/** Some 200 responses use string `"false"` / `"0"` for the `error` field; that is not a failure. */
function tryowbotErrorFieldMeansFailure(value: unknown): value is string | true {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === '' || s === 'false' || s === '0' || s === 'no') return false;
    return true;
  }
  return false;
}

/** Non-null when JSON indicates failure (top-level or nested `data`). */
function tryowbotFailureMessage(parsed: TryowbotPayloadJson, rawBody: string): string | null {
  if (parsed.error === false) return null;

  const d = parsed.data;
  if (d && typeof d === 'object' && d.error !== undefined) {
    if (!tryowbotErrorFieldMeansFailure(d.error)) return null;
    if (d.error === true) return d.message?.trim() || 'TryOWBot send failed';
    if (typeof d.error === 'string') return d.message?.trim() || d.error;
  }

  if (tryowbotErrorFieldMeansFailure(parsed.error)) {
    if (parsed.error === true) return parsed.message?.trim() || rawBody.slice(0, 200);
    if (typeof parsed.error === 'string') return parsed.message?.trim() || parsed.error;
  }

  return null;
}

export async function sendTryowbotTemplateMessage(
  options: SendTryowbotTemplateMessageOptions,
): Promise<TryowbotSendResult> {
  const credentials = options.credentials ?? getTryowbotCredentialsFromEnv();
  if (!credentials) {
    return { ok: false, error: 'TryOWBot credentials are not configured' };
  }

  const apiname = options.apiname.trim();
  if (!apiname) {
    return { ok: false, error: 'TryOWBot apiname is required' };
  }

  const to = normalizeWhatsAppToDigits(options.to);
  if (!to) {
    return {
      ok: false,
      error:
        'Invalid WhatsApp number for TryOWBot (digits only, country code without +; set TRYOWBOT_DEFAULT_COUNTRY_CODE for 10-digit local numbers).',
    };
  }

  try {
    const response = await fetch(resolveSendUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: credentials.appid,
        apikey: credentials.apikey,
        apiname,
        to,
        parameters: options.parameters,
      }),
    });

    const text = await response.text();
    let parsed: TryowbotPayloadJson = {};
    try {
      parsed = JSON.parse(text) as TryowbotPayloadJson;
    } catch {
      parsed = {};
    }

    const failMsg = tryowbotFailureMessage(parsed, text);

    if (!response.ok) {
      return { ok: false, error: (failMsg ?? text).slice(0, 500) };
    }

    if (failMsg) {
      return { ok: false, error: failMsg.slice(0, 500) };
    }

    return { ok: true, responseBodyPreview: text.slice(0, 300) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown TryOWBot send error',
    };
  }
}
