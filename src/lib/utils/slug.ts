/**
 * Utility functions for slug generation and validation
 */

/**
 * Generate a clean slug from a title
 * @param title - The title to convert to a slug
 * @returns A clean slug string
 */
export function generateBaseSlug(title: string): string {
  if (!title || typeof title !== 'string') {
    return 'song';
  }

  const slug = title
    .toLowerCase()
    .trim()
    // Replace special characters and spaces with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50);

  // If the result is empty (e.g., title was just special characters), use default
  if (!slug) {
    return 'song';
  }

  return slug;
}

/**
 * Validate if a slug is valid
 * @param slug - The slug to validate
 * @returns True if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Check if slug matches the expected pattern
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug) && slug.length <= 100;
}

/**
 * Examples of slug generation:
 *
 * "Hello World" → "hello-world"
 * "My Song Title!" → "my-song-title"
 * "Song with (Parentheses)" → "song-with-parentheses"
 * "Very Long Title That Should Be Truncated Because It Exceeds The Maximum Length" → "very-long-title-that-should-be-truncated-because-it"
 * "Song with Numbers 123" → "song-with-numbers-123"
 * "Special@#$%Characters" → "specialcharacters"
 * "Multiple   Spaces" → "multiple-spaces"
 * "Trailing-Hyphens-" → "trailing-hyphens"
 * "-Leading-Hyphens" → "leading-hyphens"
 */