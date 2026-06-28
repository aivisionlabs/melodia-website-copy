/**
 * Strips invisible/control Unicode characters that are common copy-paste artifacts
 * from Word, WhatsApp, iOS keyboard, and encoding-mismatched sources. These cause
 * LLMs (e.g. Gemini) to truncate output or produce garbled text when present in lyrics.
 *
 * Non-breaking spaces and tabs are converted to regular spaces (preserves word boundaries).
 * Truly invisible chars (zero-width, BOM, replacement char) are removed entirely.
 */
export function sanitizeInvisibleChars(input: string): string {
  return input
    .replace(/\uFEFF/g, '')    // BOM — inserted by Word/Excel pastes
    .replace(/\u200B/g, '')    // Zero Width Space
    .replace(/\u200C/g, '')    // Zero Width Non-Joiner — WhatsApp/keyboard artifact in Hindi
    .replace(/\u200D/g, '')    // Zero Width Joiner — same source
    .replace(/\uFFFD/g, '')    // Unicode replacement character — encoding mismatch
    .replace(/\u00A0/g, ' ')   // Non-breaking space — common in Word/Google Docs/iOS paste
    .replace(/\u202F/g, ' ')   // Narrow no-break space
    .replace(/\t/g, ' ');      // Tab — common in spreadsheet/Notes paste
}

export const SECTION_HEADER_REGEX =
  /^\s*\[(verse|chorus|bridge|pre-chorus|hook|outro|intro|refrain)[^\]]*\]\s*$/gim;

/**
 * Strips markdown formatting artifacts from rich-text paste sources (WhatsApp, Notion,
 * Google Docs). Only double-marker variants are stripped to avoid false positives on
 * single asterisks that may appear legitimately in lyrics.
 */
function stripMarkdownArtifacts(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/__(.+?)__/g, '$1')        // __bold__ → bold
    .replace(/^#{1,3} /gm, '');         // # Heading / ## Heading → line content only
}

/**
 * Strips common performance-direction parentheticals that appear in lyrics copied
 * from Genius, AZLyrics, or typed by users from memory. Suno would sing these
 * literally if left in.
 *
 * Conservative list — only unambiguous performance instructions, not general
 * parenthetical phrases that could be part of lyrics.
 */
function stripPerformanceDirections(input: string): string {
  return input.replace(
    /\(\s*(?:\d+x|x\d+|repeat(?:\s+x?\d+)?|ad\s*lib|adlib|whisper(?:ed)?|spoken|fade(?:\s+out)?|instrumental|backing\s+vocals?|background|rap\s+break|hook)\s*\)/gi,
    ''
  );
}

export function stripUnsupportedDecorations(input: string): string {
  const sanitized = sanitizeInvisibleChars(input)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[•●▪■◆◼◾★☆]/g, '')
    .replace(/\uFE0F/g, '');

  return stripPerformanceDirections(stripMarkdownArtifacts(sanitized))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasSongSections(lyrics: string): boolean {
  return SECTION_HEADER_REGEX.test(lyrics);
}

export function buildDeterministicStructure(rawLyrics: string): string {
  const cleaned = stripUnsupportedDecorations(rawLyrics);
  if (!cleaned) return rawLyrics.trim();
  if (hasSongSections(cleaned)) return cleaned;

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 4) {
    return [
      '[Verse 1]',
      lines.join('\n'),
      '',
      '[Chorus]',
      lines.slice(0, Math.max(1, Math.min(2, lines.length))).join('\n'),
      '',
      '[Outro]',
      lines.slice(-Math.max(1, Math.min(2, lines.length))).join('\n'),
    ]
      .join('\n')
      .trim();
  }

  const chunkSize = Math.max(2, Math.floor(lines.length / 3));
  const verse1 = lines.slice(0, chunkSize);
  const chorus = lines.slice(chunkSize, chunkSize * 2);
  const tail = lines.slice(chunkSize * 2);
  const bridge = tail.slice(0, Math.max(2, Math.floor(tail.length / 2)));
  const outro = tail.slice(Math.max(bridge.length, 1));

  return [
    '[Verse 1]',
    verse1.join('\n'),
    '',
    '[Chorus]',
    (chorus.length ? chorus : verse1.slice(0, 2)).join('\n'),
    '',
    '[Verse 2]',
    (tail.length ? tail : verse1).join('\n'),
    '',
    '[Bridge]',
    (bridge.length ? bridge : chorus.slice(0, 2)).join('\n'),
    '',
    '[Chorus]',
    (chorus.length ? chorus : verse1.slice(0, 2)).join('\n'),
    '',
    '[Outro]',
    (outro.length ? outro : tail.slice(-2)).join('\n'),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
