/**
 * Suno credit check and low-balance email alert.
 * After song creation, we check remaining Suno credit; if < 100 we email info@melodia-songs.com.
 * On credit API failure we log and send a failure alert email.
 */

import { isDemoModeEnabled } from './demo-mode';
import { logger } from '@/lib/logger';
import { EmailFactory } from '@/lib/services/email/email-factory';

const SUNO_API_URL = process.env.SUNO_API_URL || 'https://api.sunoapi.org/api/v1';
const SUNO_API_KEY = process.env.SUNO_API_KEY || process.env.SUNO_API_TOKEN || '';

const LOW_BALANCE_THRESHOLD = 100;
const ALERT_EMAIL_TO = 'info@melodia-songs.com';

export type GetSunoCreditResult =
  | { success: true; credit: number }
  | { success: false; error: string }
  | null;

/**
 * Fetches remaining Suno credit from the API.
 * - Returns null if demo mode is enabled (check skipped).
 * - Returns { success: true, credit } on success.
 * - Returns { success: false, error } on any API/network/parse error.
 */
export async function getSunoCredit(): Promise<GetSunoCreditResult> {
  if (isDemoModeEnabled()) {
    logger.debug('Suno credit check skipped (demo mode)');
    return null;
  }

  try {
    const response = await fetch(`${SUNO_API_URL}/generate/credit`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      logger.warn('Suno credit API non-OK response', {
        status: response.status,
        body: text?.slice(0, 500),
      });
      return {
        success: false,
        error: `HTTP ${response.status}: ${text?.slice(0, 200) || response.statusText}`,
      };
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      logger.warn('Suno credit API invalid JSON', { bodyPreview: text?.slice(0, 200) });
      return { success: false, error: 'Invalid JSON response from credit API' };
    }

    const code = (body as { code?: number }).code;
    const data = (body as { data?: unknown }).data;

    if (code !== 200) {
      const msg = (body as { msg?: string }).msg;
      logger.warn('Suno credit API error response', { code, msg });
      return {
        success: false,
        error: `API code ${code}: ${msg ?? 'unknown'}`,
      };
    }

    if (typeof data !== 'number') {
      logger.warn('Suno credit API data not a number', { data });
      return {
        success: false,
        error: `Credit value is not a number: ${typeof data}`,
      };
    }

    return { success: true, credit: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Suno credit API request failed', { error: message, err });
    return {
      success: false,
      error: `Network or request error: ${message}`,
    };
  }
}

/**
 * Checks Suno credit after song creation and sends alert emails if needed.
 * - If credit < 100: sends "LOW SUNO balance" email to info@melodia-songs.com.
 * - If credit API failed: logs and sends "Suno credit check failed" email.
 * Intended to be called fire-and-forget (callers need not await).
 * Email send failures are logged only and do not throw.
 */
export async function checkSunoCreditAndNotify(): Promise<void> {
  try {
    const result = await getSunoCredit();

    if (result === null) {
      return;
    }

    if (result.success === false) {
      logger.error('Suno credit check failed', { error: result.error });
      try {
        const provider = EmailFactory.getProvider();
        const emailResult = await provider.sendInternalNotification(
          ALERT_EMAIL_TO,
          'Suno credit check failed',
          `<p>Suno credit API could not be checked.</p><p><strong>Reason:</strong> ${escapeHtml(result.error)}</p><p>Please verify the Suno API and credit endpoint.</p>`
        );
        if (!emailResult.success) {
          logger.error('Failed to send Suno credit check failure alert email', {
            error: emailResult.error,
          });
        }
      } catch (emailErr) {
        logger.error('Exception sending Suno credit check failure alert email', {
          error: emailErr,
        });
      }
      return;
    }

    if (result.credit < LOW_BALANCE_THRESHOLD) {
      logger.warn('Suno credit below threshold', {
        credit: result.credit,
        threshold: LOW_BALANCE_THRESHOLD,
      });
      try {
        const provider = EmailFactory.getProvider();
        const bodyHtml = `<p>Urgent the SUNO balance is ${result.credit} please recharge for uninterrupted service.</p>`;
        const emailResult = await provider.sendInternalNotification(
          ALERT_EMAIL_TO,
          'LOW SUNO balance',
          bodyHtml
        );
        if (!emailResult.success) {
          logger.error('Failed to send low Suno balance alert email', {
            error: emailResult.error,
          });
        }
      } catch (emailErr) {
        logger.error('Exception sending low Suno balance alert email', {
          error: emailErr,
        });
      }
    }
  } catch (err) {
    logger.error('Unexpected error in checkSunoCreditAndNotify', { error: err });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
