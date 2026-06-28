/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitConfig } from './config';
import { incrementRateLimit, isIPBlocked } from './redis';
import { db } from '@/lib/db';
import { rateLimitViolationsTable, blockedIpsTable } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Get client IP address
 */
export function getClientIP(req: NextRequest): string {
  // Try different headers in order of preference
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnecting = req.headers.get('cf-connecting-ip');
  if (cfConnecting) {
    return cfConnecting;
  }

  return 'unknown';
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  req: NextRequest,
  endpoint: string
): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const ip = getClientIP(req);

  // Check if IP is blocked in database — fail-open on DB connectivity errors
  try {
    const blockedIps = await db
      .select()
      .from(blockedIpsTable)
      .where(
        and(
          eq(blockedIpsTable.ip_address, ip),
          eq(blockedIpsTable.block_type, 'permanent')
        )
      )
      .limit(1);

    if (blockedIps.length > 0) {
      return {
        allowed: false,
        error: 'Your IP address has been blocked due to excessive violations.',
      };
    }

    // Check temporary blocks
    const tempBlockedIps = await db
      .select()
      .from(blockedIpsTable)
      .where(eq(blockedIpsTable.ip_address, ip))
      .limit(1);

    if (tempBlockedIps.length > 0) {
      const block = tempBlockedIps[0];
      if (block.blocked_until && block.blocked_until > new Date()) {
        const retryAfterSeconds = Math.ceil(
          (block.blocked_until.getTime() - Date.now()) / 1000
        );
        return {
          allowed: false,
          error: 'Your IP address is temporarily blocked.',
          retryAfter: retryAfterSeconds,
        };
      }
    }
  } catch (dbError) {
    // DB unreachable — skip block check and continue (fail-open)
    console.warn('Rate limit DB check unavailable, skipping block check:', (dbError as Error).message);
  }

  // Check Redis rate limit
  const blocked = await isIPBlocked(ip);
  if (blocked) {
    return {
      allowed: false,
      error: 'Your IP address is temporarily blocked.',
    };
  }

  // Get rate limit config
  const config = getRateLimitConfig(endpoint);
  const key = `ratelimit:${endpoint}:${ip}`;

  // Increment and check
  const count = await incrementRateLimit(key, config.windowSeconds);

  if (count > config.requests) {
    // Log violation
    await logRateLimitViolation(ip, endpoint, config.tier);

    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${config.requests} requests per ${config.windowSeconds} seconds.`,
      retryAfter: config.windowSeconds,
    };
  }

  return { allowed: true };
}

/**
 * Log rate limit violation
 */
async function logRateLimitViolation(
  ip: string,
  endpoint: string,
  tier: string
) {
  try {
    // Check if violation exists
    const existing = await db
      .select()
      .from(rateLimitViolationsTable)
      .where(
        and(
          eq(rateLimitViolationsTable.ip_address, ip),
          eq(rateLimitViolationsTable.endpoint, endpoint)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Increment violation count
      await db
        .update(rateLimitViolationsTable)
        .set({
          violation_count: sql`${rateLimitViolationsTable.violation_count} + 1`,
          updated_at: new Date(),
        })
        .where(eq(rateLimitViolationsTable.id, existing[0].id));

      // Check if should be blocked
      const updated = await db
        .select()
        .from(rateLimitViolationsTable)
        .where(eq(rateLimitViolationsTable.id, existing[0].id))
        .limit(1);

      if (updated.length > 0 && updated[0].violation_count !== null && updated[0].violation_count >= 5) {
        await blockIPInDatabase(ip, updated[0].violation_count);
      }
    } else {
      // Create new violation record
      await db.insert(rateLimitViolationsTable).values({
        ip_address: ip,
        endpoint,
        tier,
        violation_count: 1,
      });
    }
  } catch (error) {
    console.error('Error logging rate limit violation:', error);
  }
}

/**
 * Block IP in database
 */
async function blockIPInDatabase(ip: string, violationCount: number) {
  try {
    const blockType = violationCount >= 10 ? 'permanent' : 'temporary';
    const blockedUntil =
      blockType === 'temporary'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        : undefined;

    await db
      .insert(blockedIpsTable)
      .values({
        ip_address: ip,
        reason: `Exceeded rate limit ${violationCount} times`,
        block_type: blockType,
        blocked_until: blockedUntil,
        violation_count: violationCount,
      })
      .onConflictDoUpdate({
        target: blockedIpsTable.ip_address,
        set: {
          violation_count: violationCount,
          block_type: blockType,
          blocked_until: blockedUntil,
          last_attempt_at: new Date(),
        },
      });

    console.log(`IP ${ip} blocked (${blockType}) after ${violationCount} violations`);
  } catch (error) {
    console.error('Error blocking IP:', error);
  }
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(
  endpoint: string,
  handler: (...args: any[]) => Promise<Response>
) {
  return async (...args: any[]) => {
    const req = args[0] as NextRequest;
    const rateLimitCheck = await checkRateLimit(req, endpoint);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.error,
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: rateLimitCheck.retryAfter
            ? { 'Retry-After': rateLimitCheck.retryAfter.toString() }
            : {},
        }
      );
    }

    return handler(...args);
  };
}

