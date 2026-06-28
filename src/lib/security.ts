/**
 * Security utilities for input validation, sanitization, and security headers
 */

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove HTML tags and dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
}

// Email validation
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

// Phone number validation (international format)
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Must start with + and have 7-15 digits
  const phoneRegex = /^\+[1-9]\d{6,14}$/
  return phoneRegex.test(cleaned)
}

// Password strength validation
export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false
  }
  
  // At least 8 characters, contains both letters and numbers
  const minLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  
  return minLength && hasLetter && hasNumber
}

// Name validation
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false
  }
  
  // 2-50 characters, letters, spaces, and hyphens only
  const nameRegex = /^[a-zA-Z\s\-]{2,50}$/
  return nameRegex.test(name.trim())
}

// URL validation
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

// Rate limiting utilities
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { 
      count: 1, 
      resetTime: now + windowMs 
    })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length > 0
}

// Security headers
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.suno.ai",
    "frame-ancestors 'none'"
  ].join('; ')
}

// Input length validation
export function validateInputLength(
  input: string, 
  minLength: number, 
  maxLength: number
): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }
  
  const length = input.trim().length
  return length >= minLength && length <= maxLength
}

// File type validation
export function validateFileType(
  fileName: string, 
  allowedTypes: string[]
): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false
  }
  
  const extension = fileName.toLowerCase().split('.').pop()
  return extension ? allowedTypes.includes(extension) : false
}

// SQL injection prevention (basic)
export function containsSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(WAITFOR|DELAY)\b)/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

// XSS prevention (basic)
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

// Comprehensive input validation
export function validateAndSanitizeInput(
  input: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    allowHtml?: boolean
    checkSQL?: boolean
    checkXSS?: boolean
  } = {}
): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = []
  let sanitized = input

  // Check if required
  if (options.required && (!input || input.trim().length === 0)) {
    errors.push('This field is required')
    return { isValid: false, sanitized: '', errors }
  }

  // Check length
  if (options.minLength && input.length < options.minLength) {
    errors.push(`Minimum length is ${options.minLength} characters`)
  }

  if (options.maxLength && input.length > options.maxLength) {
    errors.push(`Maximum length is ${options.maxLength} characters`)
  }

  // Check pattern
  if (options.pattern && !options.pattern.test(input)) {
    errors.push('Invalid format')
  }

  // Sanitize if HTML is not allowed
  if (!options.allowHtml) {
    sanitized = sanitizeInput(input)
  }

  // Check for SQL injection
  if (options.checkSQL && containsSQLInjection(input)) {
    errors.push('Invalid input detected')
  }

  // Check for XSS
  if (options.checkXSS && containsXSS(input)) {
    errors.push('Invalid input detected')
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  }
}
