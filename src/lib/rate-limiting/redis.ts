/**
 * Redis Client for Rate Limiting
 * Uses Upstash Redis
 */

import { Redis } from '@upstash/redis';

import { isDemoModeEnabled } from '@/lib/demo-mode';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

let redis: Redis | null = null;

/**
 * Get Redis client
 */
export function getRedis(): Redis | null {
  if (isDemoModeEnabled()) {
    return null; // No Redis in demo mode
  }

  if (!redis && REDIS_URL && REDIS_TOKEN) {
    redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    });
  }

  return redis;
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  const client = getRedis();

  if (!client) {
    // Demo mode or Redis not configured - always allow
    return 1;
  }

  try {
    const count = await client.incr(key);

    // Set expiry on first increment
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }

    return count;
  } catch (error) {
    console.error('Redis increment error:', error);
    // On error, allow the request
    return 1;
  }
}

/**
 * Get current rate limit count
 */
export async function getRateLimitCount(key: string): Promise<number> {
  const client = getRedis();

  if (!client) {
    return 0;
  }

  try {
    const count = await client.get<number>(key);
    return count || 0;
  } catch (error) {
    console.error('Redis get error:', error);
    return 0;
  }
}

/**
 * Reset rate limit counter
 */
export async function resetRateLimit(key: string): Promise<void> {
  const client = getRedis();

  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/**
 * Check if IP is blocked
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  const client = getRedis();

  if (!client) {
    return false;
  }

  try {
    const blocked = await client.get(`blocked:${ip}`);
    return blocked === 'true';
  } catch (error) {
    console.error('Redis blocked check error:', error);
    return false;
  }
}

/**
 * Block an IP address
 */
export async function blockIP(
  ip: string,
  durationSeconds?: number
): Promise<void> {
  const client = getRedis();

  if (!client) {
    return;
  }

  try {
    await client.set(`blocked:${ip}`, 'true');

    if (durationSeconds) {
      await client.expire(`blocked:${ip}`, durationSeconds);
    }
  } catch (error) {
    console.error('Redis block IP error:', error);
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<void> {
  const client = getRedis();

  if (!client) {
    return;
  }

  try {
    await client.del(`blocked:${ip}`);
  } catch (error) {
    console.error('Redis unblock IP error:', error);
  }
}

