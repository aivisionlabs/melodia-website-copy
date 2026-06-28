/**
 * Centralized Security Layer for Prompt Validation
 *
 * This module implements multiple security measures to prevent:
 * - Prompt injection attacks
 * - Malicious content
 * - Gibberish or irrelevant inputs
 * - System manipulation attempts
 */

import { SongFormData } from './llm-lyrics-operation';

// Security configuration
const SECURITY_CONFIG = {
  // Maximum allowed lengths for inputs
  maxLengths: {
    recipientDetails: 500,
    songStory: 2000,
    occasion: 200,
    refineText: 1000,
    languages: 100,
  },
  // Minimum content requirements
  minLengths: {
    recipientDetails: 2,
    songStory: 0,
    refineText: 3,
  },
  // Pattern matching thresholds
  thresholds: {
    maxSpecialCharRatio: 0.3, // Max 30% special characters
    maxRepetitionRatio: 0.5, // Max 50% repetitive content
    maxCapitalRatio: 0.7, // Max 70% capital letters
    minWordCount: 1, // Minimum words for meaningful content
  },
};

export class PromptSecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'PromptSecurityError';
  }
}

/**
 * Detects potential prompt injection patterns
 */
function detectPromptInjection(text: string): { detected: boolean; reason?: string } {
  const injectionPatterns = [
    // System instruction override attempts
    /ignore\s+(previous|above|all)\s+(instruction|prompt|direction|command)/i,
    /forget\s+(previous|everything|all)\s+(instruction|prompt|direction)/i,
    /disregard\s+(previous|all)\s+(instruction|prompt|rule)/i,

    // Role manipulation attempts (scoped to AI/model context to avoid false positives on personal stories)
    /you\s+are\s+(now|actually)\s+(an?\s+)?(ai|bot|assistant|chatgpt|gpt|claude|llm|language\s+model)/i,
    /act\s+as\s+(an?\s+)?(ai|bot|assistant|chatgpt|gpt|claude|llm|language\s+model)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(ai|bot|assistant|chatgpt|gpt|claude|llm)/i,
    /your\s+role\s+is\s+(now|to)\s+(be\s+)?(an?\s+)?(ai|bot|assistant|chatgpt|gpt|claude|llm)/i,

    // System prompt extraction attempts
    /show\s+(me\s+)?your\s+(system\s+)?(prompt|instruction|rule)/i,
    /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instruction|rule)/i,
    /print\s+your\s+(system\s+)?(prompt|instruction|configuration)/i,
    /reveal\s+your\s+(system\s+)?(prompt|instruction)/i,

    // Output format manipulation
    /output\s+(json|xml|html|code|format)/i,
    /return\s+(json|xml|code|only)/i,
    /respond\s+(in|with|only)\s+(json|xml|code)/i,

    // Delimiter/escape attempts
    /```[\w]*\s*\{/,  // Code block with JSON
    /\[SYSTEM\]/i,
    /\[INSTRUCTION\]/i,
    /\[OVERRIDE\]/i,
    /<\|.*?\|>/,  // Special tokens

    // Direct command injection
    /execute\s+code/i,
    /run\s+(this\s+)?code/i,
    /eval\(/i,

    // Multi-language "translate" words — low-risk standalone signal, kept as a lightweight tripwire
    /traducir|übersetzen|翻訳|traduire/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        reason: `Potential prompt injection detected: pattern matches ${pattern.source}`,
      };
    }
  }

  // Check for suspicious character sequences that might be encoding attempts
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    return {
      detected: true,
      reason: 'Suspicious control characters detected',
    };
  }

  // Check for excessive use of special characters (possible obfuscation)
  const specialCharCount = (text.match(/[^a-zA-Z0-9\s\p{L}\p{N}\p{M}]/gu) || []).length;
  const specialCharRatio = specialCharCount / text.length;

  if (specialCharRatio > SECURITY_CONFIG.thresholds.maxSpecialCharRatio) {
    return {
      detected: true,
      reason: `Excessive special characters (${(specialCharRatio * 100).toFixed(1)}%)`,
    };
  }

  return { detected: false };
}

/**
 * Detects gibberish or meaningless content
 */
function detectGibberish(text: string): { detected: boolean; reason?: string } {
  // Remove extra whitespace for analysis
  const normalized = text.trim().replace(/\s+/g, ' ');

  if (normalized.length === 0) {
    return { detected: true, reason: 'Empty or whitespace-only content' };
  }

  // Check for minimum word count
  const words = normalized.split(/\s+/);
  if (words.length < SECURITY_CONFIG.thresholds.minWordCount) {
    return {
      detected: true,
      reason: `Insufficient content (minimum ${SECURITY_CONFIG.thresholds.minWordCount} words required)`,
    };
  }

  // Check for excessive repetition (e.g., "aaaaaaa", "lalala", "123123123")
  const repetitionPattern = /(.{2,})\1{3,}/;
  if (repetitionPattern.test(normalized)) {
    return {
      detected: true,
      reason: 'Excessive character/pattern repetition detected',
    };
  }

  // Check for meaningless character sequences
  const meaninglessPatterns = [
    /^[a-z]{40,}$/i,  // Very long unbroken ASCII letter sequences (raised from 20 to avoid blocking long Indian names in romanised form)
    /^[0-9]{15,}$/,   // Long sequences of numbers
    /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{10,}$/,  // Long sequences of special chars
  ];

  for (const pattern of meaninglessPatterns) {
    if (pattern.test(normalized)) {
      return {
        detected: true,
        reason: 'Meaningless character sequence detected',
      };
    }
  }

  return { detected: false };
}

/**
 * Validates input length constraints
 */
function validateLength(
  text: string,
  fieldName: string,
  maxLength: number,
  minLength: number = 0
): void {
  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    console.log(`    ❌ Length validation failed: too short (${trimmed.length} < ${minLength})`);
    throw new PromptSecurityError(
      `${fieldName} is too short`,
      'VALIDATION_MIN_LENGTH',
      `Minimum length: ${minLength} characters`
    );
  }

  if (trimmed.length > maxLength) {
    console.log(`    ❌ Length validation failed: too long (${trimmed.length} > ${maxLength})`);
    throw new PromptSecurityError(
      `${fieldName} exceeds maximum allowed length`,
      'VALIDATION_MAX_LENGTH',
      `Maximum length: ${maxLength} characters, received: ${trimmed.length}`
    );
  }
}

/**
 * Sanitizes and validates a single text input
 */
function validateAndSanitizeText(
  text: string,
  fieldName: string,
  options: {
    maxLength: number;
    minLength?: number;
    required?: boolean;
    checkInjection?: boolean;
    checkGibberish?: boolean;
  }
): string {
  const {
    maxLength,
    minLength = 0,
    required = false,
    checkInjection = true,
    checkGibberish = true,
  } = options;

  // Log validation start
  console.log(`  📋 Validating "${fieldName}":`, {
    value: text ? (text.length > 100 ? text.substring(0, 100) + '...' : text) : text,
    type: typeof text,
    length: text?.length ?? 0,
    isNull: text == null,
    options: {
      maxLength,
      minLength,
      required,
      checkInjection,
      checkGibberish,
    },
  });

  // Handle null/undefined/empty input
  if (text == null || typeof text !== 'string') {
    if (required) {
      console.log(`  ❌ ${fieldName} validation failed: null/undefined/not a string`);
      throw new PromptSecurityError(
        `${fieldName} is required`,
        'VALIDATION_REQUIRED',
        `Field cannot be null, undefined, or empty`
      );
    }
    console.log(`  ⚠️  ${fieldName} is null/undefined but not required, returning empty string`);
    return '';
  }

  // Basic sanitization
  const sanitized = text
    .trim()
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/[^\S\n]{2,}/g, ' '); // Collapse runs of spaces/tabs but preserve newlines
  // Check if required
  if (required && sanitized.length === 0) {
    throw new PromptSecurityError(
      `${fieldName} is required`,
      'VALIDATION_REQUIRED',
      `Field cannot be empty`
    );
  }

  // If empty and not required, return early
  if (sanitized.length === 0) {
    return sanitized;
  }

  validateLength(sanitized, fieldName, maxLength, minLength);

  // Check for prompt injection
  if (checkInjection) {
    const injectionCheck = detectPromptInjection(sanitized);
    if (injectionCheck.detected) {
      console.log(`  ❌ Prompt injection detected in "${fieldName}":`, injectionCheck.reason);
      throw new PromptSecurityError(
        `${fieldName} contains suspicious content`,
        'SECURITY_INJECTION_DETECTED',
        injectionCheck.reason
      );
    }
    console.log(`  ✅ No prompt injection detected in "${fieldName}"`);
  } else {
    console.log(`  ⚠️  Prompt injection check skipped for "${fieldName}"`);
  }

  // Check for gibberish
  if (checkGibberish) {
    console.log(`  🔍 Checking for gibberish in "${fieldName}"...`);
    const gibberishCheck = detectGibberish(sanitized);
    if (gibberishCheck.detected) {
      // Log detailed information for debugging
      const words = sanitized.split(/\s+/);
      const vowels = (sanitized.match(/[aeiouAEIOU]/g) || []).length;
      const consonants = (sanitized.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
      const capitals = (sanitized.match(/[A-Z]/g) || []).length;
      const totalLetters = (sanitized.match(/[A-Z]/gi) || []).length;

      console.log(`  ❌ Gibberish check failed for "${fieldName}":`, {
        reason: gibberishCheck.reason,
        originalLength: text.length,
        sanitizedLength: sanitized.length,
        sanitizedValue: sanitized,
        wordCount: words.length,
        words: words,
        charCounts: {
          vowels,
          consonants,
          capitals,
          totalLetters,
          vowelRatio: consonants > 0 ? (vowels / consonants).toFixed(2) : 'N/A',
          capitalRatio: totalLetters > 0 ? (capitals / totalLetters).toFixed(2) : 'N/A',
        },
      });
      throw new PromptSecurityError(
        `${fieldName} contains invalid or meaningless content: ${gibberishCheck.reason}`,
        'VALIDATION_GIBBERISH',
        gibberishCheck.reason
      );
    }
    console.log(`  ✅ No gibberish detected in "${fieldName}"`);
  } else {
    console.log(`  ⚠️  Gibberish check skipped for "${fieldName}"`);
  }

  console.log(`  ✅ "${fieldName}" validation completed successfully`);
  return sanitized;
}

/**
 * Validates song generation form data
 */
export function validateSongGenerationInput(formData: SongFormData): SongFormData {

  try {
    const recipientDetails = validateAndSanitizeText(
      formData.recipientDetails,
      'Recipient details',
      {
        maxLength: SECURITY_CONFIG.maxLengths.recipientDetails,
        minLength: SECURITY_CONFIG.minLengths.recipientDetails,
        required: true,
        checkInjection: true,
        checkGibberish: true,
      }
    );
    const songStory = validateAndSanitizeText(
      formData.songStory,
      'Song story',
      {
        maxLength: SECURITY_CONFIG.maxLengths.songStory,
        minLength: SECURITY_CONFIG.minLengths.songStory,
        required: false,
        checkInjection: true,
        checkGibberish: true,
      }
    );

    const languages = validateAndSanitizeText(
      formData.languages,
      'Language',
      {
        maxLength: SECURITY_CONFIG.maxLengths.languages,
        minLength: 2,
        required: true,
        checkInjection: true,
        checkGibberish: false, // Language names might look unusual
      }
    );
    console.log('✅ Language validation passed:', {
      originalLength: formData.languages?.length,
      sanitizedLength: languages.length,
      sanitizedValue: languages,
    });

    // Validate occasion (optional)
    let occasion = formData.occassion || '';
    if (occasion) {
      console.log('🔍 Validating occasion...');
      occasion = validateAndSanitizeText(
        occasion,
        'Occasion',
        {
          maxLength: SECURITY_CONFIG.maxLengths.occasion,
          required: false,
          checkInjection: true,
          checkGibberish: true,
        }
      );
      console.log('✅ Occasion validation passed:', {
        originalLength: formData.occassion?.length,
        sanitizedLength: occasion.length,
        sanitizedValue: occasion,
      });
    } else {
      console.log('ℹ️  Occasion not provided (optional field)');
    }

    // Validate mood (already validated by form, but check for injection)
    const mood = Array.isArray(formData.mood) ? formData.mood : [formData.mood];
    console.log(`🔍 Validating ${mood.length} mood item(s)...`);
    mood.forEach((moodItem, index) => {
      console.log(`  Validating mood ${index + 1}: "${moodItem}"`);
      validateAndSanitizeText(
        moodItem,
        `Mood ${index + 1}`,
        {
          maxLength: 50,
          required: true,
          checkInjection: true,
          checkGibberish: false, // Mood names are predefined
        }
      );
      console.log(`  ✅ Mood ${index + 1} validation passed`);
    });

    // Validate source song lyrics (optional, from our database)
    let sourceSongLyrics = formData.sourceSongLyrics;

    if (sourceSongLyrics) {
      console.log('🔍 Validating source song lyrics...');
      sourceSongLyrics = validateAndSanitizeText(
        sourceSongLyrics,
        'Source song lyrics',
        {
          maxLength: 10000, // Allow longer lyrics from source songs
          required: false,
          checkInjection: true,
          checkGibberish: false, // Lyrics can have creative content
        }
      );
      console.log('✅ Source song lyrics validation passed:', {
        originalLength: formData.sourceSongLyrics?.length,
        sanitizedLength: sourceSongLyrics.length,
      });
    }

    console.log('✅ Song generation input validation passed');

    return {
      ...formData,
      recipientDetails,
      songStory,
      languages,
      occassion: occasion,
      mood: formData.mood,
      ...(sourceSongLyrics ? { sourceSongLyrics } : {}),
    };
  } catch (error) {
    if (error instanceof PromptSecurityError) {
      console.error('❌ Security validation failed:', error.message);
      throw error;
    }
    console.error('❌ Unexpected error during validation:', error);
    throw new PromptSecurityError(
      'Failed to validate input',
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Validates lyrics refinement input
 */
export function validateRefinementInput(refineText: string): string {
  console.log('🔒 Running security validation for refinement input...');
  console.log('📝 Refinement input data:', {
    refineText: refineText ? `"${refineText.substring(0, 100)}${refineText.length > 100 ? '...' : ''}" (type: ${typeof refineText}, length: ${refineText?.length})` : refineText,
  });

  try {
    console.log('🔍 Validating refinement request...');
    const validated = validateAndSanitizeText(
      refineText,
      'Refinement request',
      {
        maxLength: SECURITY_CONFIG.maxLengths.refineText,
        minLength: SECURITY_CONFIG.minLengths.refineText,
        required: true,
        checkInjection: true,
        checkGibberish: true,
      }
    );

    console.log('✅ Refinement input validation passed:', {
      originalLength: refineText?.length,
      sanitizedLength: validated.length,
      sanitizedValue: validated.length > 100 ? validated.substring(0, 100) + '...' : validated,
    });
    return validated;
  } catch (error) {
    if (error instanceof PromptSecurityError) {
      console.error('❌ Security validation failed:', error.message);
      throw error;
    }
    console.error('❌ Unexpected error during validation:', error);
    throw new PromptSecurityError(
      'Failed to validate refinement request',
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Security audit logging (for monitoring suspicious activity)
 */
export function logSecurityEvent(
  eventType: 'injection_attempt' | 'gibberish_detected' | 'validation_failed',
  details: {
    input?: string;
    reason?: string;
    userId?: string;
    timestamp?: Date;
  }
): void {
  // In production, this should log to a security monitoring system
  console.warn('⚠️ SECURITY EVENT:', {
    type: eventType,
    timestamp: details.timestamp || new Date(),
    reason: details.reason,
    // Truncate input for logging (don't log full content for privacy)
    inputPreview: details.input ? details.input.substring(0, 100) + '...' : undefined,
    userId: details.userId,
  });

  // TODO: Integrate with security monitoring service (e.g., Sentry, DataDog)
  // TODO: Implement rate limiting based on repeated security events
}


