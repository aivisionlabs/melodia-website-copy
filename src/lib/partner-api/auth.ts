/**
 * Partner API Authentication
 *
 * Resolves API key from Authorization header, hashes it, looks up in partner_api_credentials,
 * and attaches vendor context. Enforces vendor isolation on all partner API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import {
  partnerApiCredentialsTable,
  partnerApiVendorsTable,
  type SelectPartnerApiVendor,
} from '@/lib/db/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';

export interface PartnerAuthContext {
  vendor: SelectPartnerApiVendor;
  credentialId: number;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
) {
  return NextResponse.json(
    { error: { code, message, request_id: requestId } },
    { status },
  );
}

/**
 * Authenticate a partner API request.
 * Extracts Bearer token, hashes it, finds the credential + vendor.
 * Returns PartnerAuthContext or a NextResponse error.
 */
export async function authenticatePartner(
  req: NextRequest,
): Promise<PartnerAuthContext | NextResponse> {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header.', requestId);
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return errorResponse(401, 'UNAUTHORIZED', 'API key is required.', requestId);
  }

  const keyHash = hashApiKey(apiKey);
  const now = new Date();

  const rows = await db
    .select({
      credentialId: partnerApiCredentialsTable.id,
      vendorId: partnerApiCredentialsTable.vendor_id,
      active: partnerApiCredentialsTable.active,
      expiresAt: partnerApiCredentialsTable.expires_at,
    })
    .from(partnerApiCredentialsTable)
    .where(eq(partnerApiCredentialsTable.key_hash, keyHash))
    .limit(1);

  if (rows.length === 0) {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid API key.', requestId);
  }

  const cred = rows[0];

  if (!cred.active) {
    return errorResponse(401, 'UNAUTHORIZED', 'API key has been deactivated.', requestId);
  }

  if (cred.expiresAt && cred.expiresAt < now) {
    return errorResponse(401, 'UNAUTHORIZED', 'API key has expired.', requestId);
  }

  const vendors = await db
    .select()
    .from(partnerApiVendorsTable)
    .where(
      and(
        eq(partnerApiVendorsTable.id, cred.vendorId),
        eq(partnerApiVendorsTable.active, true),
      ),
    )
    .limit(1);

  if (vendors.length === 0) {
    return errorResponse(401, 'UNAUTHORIZED', 'Vendor account is inactive.', requestId);
  }

  // Fire-and-forget: update last_used_at
  db.update(partnerApiCredentialsTable)
    .set({ last_used_at: now })
    .where(eq(partnerApiCredentialsTable.id, cred.credentialId))
    .then(() => {})
    .catch(() => {});

  return {
    vendor: vendors[0],
    credentialId: cred.credentialId,
  };
}

/**
 * HOF that wraps a partner API handler with authentication.
 * If auth fails, returns the error response. Otherwise calls handler with auth context.
 */
export function withPartnerAuth(
  handler: (
    req: NextRequest,
    auth: PartnerAuthContext,
    context: any,
  ) => Promise<Response>,
) {
  return async (req: NextRequest, context: any): Promise<Response> => {
    const authResult = await authenticatePartner(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    return handler(req, authResult, context);
  };
}
