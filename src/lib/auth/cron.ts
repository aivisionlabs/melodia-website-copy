import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

export function rejectUnauthorizedCronRequest(
  req: NextRequest,
  route: string,
): NextResponse | null {
  const cronSecret = getCronSecret();
  const authHeader = req.headers.get('authorization');
  const bearerToken = getBearerToken(authHeader);

  if (!cronSecret) {
    logger.warn('cron auth rejected: CRON_SECRET is not configured', { route });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!bearerToken) {
    logger.warn('cron auth rejected: missing or invalid Authorization header', {
      route,
      hasAuthorizationHeader: Boolean(authHeader),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (bearerToken !== cronSecret) {
    logger.warn('cron auth rejected: Authorization bearer token mismatch', { route });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
