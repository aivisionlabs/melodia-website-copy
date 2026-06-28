/**
 * Validation utilities for anonymous users and UUIDs
 */

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_V4_REGEX.test(uuid)
}

/**
 * Validate anonymous user ID format
 */
export function isValidAnonymousUserId(anonymousUserId: string): boolean {
  if (!anonymousUserId || typeof anonymousUserId !== 'string') {
    return false
  }

  return isValidUUID(anonymousUserId)
}

/**
 * Validate that either user_id or anonymous_user_id is provided, but not both
 */
export function validateUserOwnership(userId?: number | null, anonymousUserId?: string | null): {
  isValid: boolean
  error?: string
} {
  // At least one must be provided
  if (!userId && !anonymousUserId) {
    return {
      isValid: false,
      error: 'Either user_id or anonymous_user_id must be provided'
    }
  }

  // Both cannot be provided
  if (userId && anonymousUserId) {
    return {
      isValid: false,
      error: 'Cannot provide both user_id and anonymous_user_id'
    }
  }

  // If anonymous_user_id is provided, validate format
  if (anonymousUserId && !isValidAnonymousUserId(anonymousUserId)) {
    return {
      isValid: false,
      error: 'Invalid anonymous_user_id format'
    }
  }

  return { isValid: true }
}

/**
 * Sanitize anonymous user ID input
 */
export function sanitizeAnonymousUserId(anonymousUserId: string | null | undefined): string | null {
  if (!anonymousUserId || typeof anonymousUserId !== 'string') {
    return null
  }

  const trimmed = anonymousUserId.trim()

  if (!isValidAnonymousUserId(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * Validate payment request data
 */
export function validatePaymentRequest(data: {
  songRequestId?: number
  planId?: number
  userId?: number | null
  anonymousUserId?: string | null
}): {
  isValid: boolean
  error?: string
} {
  // Validate required fields
  if (!data.songRequestId || !data.planId) {
    return {
      isValid: false,
      error: 'Missing required fields: songRequestId and planId'
    }
  }

  // Validate user ownership
  const ownershipValidation = validateUserOwnership(data.userId, data.anonymousUserId)
  if (!ownershipValidation.isValid) {
    return ownershipValidation
  }

  return { isValid: true }
}