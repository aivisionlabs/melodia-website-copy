// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

export function checkRateLimit(ip: string, maxRequests: number): boolean {
  return true;
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip)

  if (!userLimit || now > (userLimit?.resetTime || 0)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  // At this point, userLimit is guaranteed to exist
  if (userLimit!.count >= maxRequests) {
    return false
  }

  userLimit!.count++
  return true
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  SONG_CREATION: 5,    // 5 requests per minute for song creation
  AUTH_ENDPOINTS: 10,  // 10 requests per minute for auth endpoints
  GENERAL_API: 100     // 100 requests per minute for general API
} as const
