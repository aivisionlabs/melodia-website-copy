import { createHash, randomBytes } from 'crypto';
import { resolve as dnsResolve } from 'dns/promises';

const API_KEY_PREFIX = 'mel_pk_';

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function generatePartnerApiKey(): { apiKey: string; keyPrefix: string; keyHash: string } {
  const secret = randomBytes(32).toString('hex');
  const apiKey = `${API_KEY_PREFIX}${secret}`;
  const keyPrefix = apiKey.slice(0, 14);
  const keyHash = hashSecret(apiKey);

  return { apiKey, keyPrefix, keyHash };
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

// ─── Webhook URL SSRF protection ─────────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
]);

/**
 * Check whether an IP address falls within a private, loopback, or
 * link-local range that should never be reached by outbound webhooks.
 */
function isPrivateIP(ip: string): boolean {
  // IPv4
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => n >= 0 && n <= 255)) {
    // 127.0.0.0/8 — loopback
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 — private
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 — private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 — private
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 — link-local (AWS/GCP metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts.every((n) => n === 0)) return true;
    return false;
  }

  // IPv6 — normalise and check common dangerous addresses
  const normalized = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // IPv4-mapped IPv6 (::ffff:A.B.C.D)
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIP(v4Mapped[1]);
  // fe80::/10 — link-local
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe80')) return true;
  // fc00::/7 — unique local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  return false;
}

export interface WebhookUrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a webhook URL for SSRF safety.
 * - Must be HTTPS
 * - Hostname must not be on the blocklist
 * - Resolved IPs must not be private/loopback/link-local
 */
export async function validateWebhookUrl(url: string): Promise<WebhookUrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Webhook URL must use HTTPS.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'Webhook URL hostname is not allowed.' };
  }

  // If the hostname is already an IP literal, check it directly
  if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || hostname.startsWith('[')) {
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'Webhook URL must not point to a private or internal address.' };
    }
    return { valid: true };
  }

  // Resolve DNS and check all returned addresses
  try {
    const addresses = await dnsResolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return { valid: false, error: 'Webhook URL must not resolve to a private or internal address.' };
      }
    }
  } catch {
    return { valid: false, error: 'Webhook URL hostname could not be resolved.' };
  }

  return { valid: true };
}
