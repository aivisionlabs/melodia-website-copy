import { describe, expect, it } from 'vitest';
import {
  buildDeterministicStructure,
  sanitizeInvisibleChars,
  stripUnsupportedDecorations,
} from '../lib/services/llm/custom-lyrics-suno-structure-utils';

describe('sanitizeInvisibleChars', () => {
  it('strips Unicode replacement character (U+FFFD)', () => {
    expect(sanitizeInvisibleChars('तू कह\uFFFDसफ़र है')).toBe('तू कहसफ़र है');
  });

  it('strips BOM (U+FEFF) from Word/Excel pastes', () => {
    expect(sanitizeInvisibleChars('\uFEFFपहली नज़र में')).toBe('पहली नज़र में');
  });

  it('strips Zero Width Space (U+200B)', () => {
    expect(sanitizeInvisibleChars('hello\u200Bworld')).toBe('helloworld');
  });

  it('strips Zero Width Non-Joiner (U+200C) — WhatsApp Hindi paste artifact', () => {
    expect(sanitizeInvisibleChars('दिल\u200Cकी')).toBe('दिलकी');
  });

  it('strips Zero Width Joiner (U+200D)', () => {
    expect(sanitizeInvisibleChars('दिल\u200Dकी')).toBe('दिलकी');
  });

  it('converts non-breaking space (U+00A0) to regular space — Word/Google Docs/iOS', () => {
    expect(sanitizeInvisibleChars('hello\u00A0world')).toBe('hello world');
  });

  it('converts narrow no-break space (U+202F) to regular space', () => {
    expect(sanitizeInvisibleChars('hello\u202Fworld')).toBe('hello world');
  });

  it('converts tab to space — spreadsheet/Notes app paste', () => {
    expect(sanitizeInvisibleChars('line one\ttwo')).toBe('line one two');
  });

  it('strips multiple invisible chars in one pass', () => {
    const input = '\uFEFF\u200Bतू कह\uFFFDसफ़र\u200C है\u200D';
    expect(sanitizeInvisibleChars(input)).toBe('तू कहसफ़र है');
  });

  it('leaves regular Devanagari text unchanged', () => {
    const lyrics = 'पहली नज़र में जो देखा था तुझको\nदिल ने कहा था यही है वो किस्सा';
    expect(sanitizeInvisibleChars(lyrics)).toBe(lyrics);
  });

  it('leaves English text unchanged', () => {
    expect(sanitizeInvisibleChars('Happy Anniversary')).toBe('Happy Anniversary');
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeInvisibleChars('')).toBe('');
  });
});

describe('stripUnsupportedDecorations', () => {
  it('delegates invisible char removal to sanitizeInvisibleChars', () => {
    expect(stripUnsupportedDecorations('\uFEFF\u200Bline one\uFFFD')).toBe('line one');
  });

  it('also strips BOM at start of input', () => {
    expect(stripUnsupportedDecorations('\uFEFFYour Lyrics')).toBe('Your Lyrics');
  });

  it('converts non-breaking space to regular space', () => {
    expect(stripUnsupportedDecorations('word\u00A0word')).toBe('word word');
  });

  it('converts tab to space', () => {
    expect(stripUnsupportedDecorations('word\tword')).toBe('word word');
  });
});

describe('Markdown artifact stripping', () => {
  it('strips **bold** markdown — WhatsApp/Notion paste', () => {
    expect(stripUnsupportedDecorations('You are **my love** forever')).toBe('You are my love forever');
  });

  it('strips __bold__ markdown', () => {
    expect(stripUnsupportedDecorations('You are __my love__ forever')).toBe('You are my love forever');
  });

  it('strips leading # heading markers', () => {
    expect(stripUnsupportedDecorations('# Chorus\nline one\nline two')).toBe('Chorus\nline one\nline two');
  });

  it('strips ## and ### heading markers', () => {
    expect(stripUnsupportedDecorations('## Verse 1\nline one')).toBe('Verse 1\nline one');
  });

  it('does NOT strip single * which may appear in lyrics', () => {
    const input = 'Stars * shine bright\nForever with you';
    expect(stripUnsupportedDecorations(input)).toContain('*');
  });

  it('handles mixed markdown and Devanagari', () => {
    const input = '**तुम मेरे हो** forever';
    expect(stripUnsupportedDecorations(input)).toBe('तुम मेरे हो forever');
  });
});

describe('Performance direction stripping', () => {
  it('strips (2x) repetition markers — trailing space before newline is also cleaned', () => {
    // The trailing space after stripping "(2x)" is removed by the [ \t]+\n cleanup
    expect(stripUnsupportedDecorations('line one (2x)\nline two')).toBe('line one\nline two');
  });

  it('strips (x3) repetition markers', () => {
    expect(stripUnsupportedDecorations('chorus line (x3)')).toBe('chorus line');
  });

  it('strips (repeat) markers', () => {
    expect(stripUnsupportedDecorations('this line (repeat)')).toBe('this line');
  });

  it('strips (repeat x2)', () => {
    expect(stripUnsupportedDecorations('this line (repeat x2)')).toBe('this line');
  });

  it('strips (whispered) direction', () => {
    expect(stripUnsupportedDecorations('soft words (whispered)')).toBe('soft words');
  });

  it('strips (ad lib) direction', () => {
    expect(stripUnsupportedDecorations('oh yeah (ad lib)')).toBe('oh yeah');
  });

  it('strips (fade out) direction', () => {
    expect(stripUnsupportedDecorations('final line (fade out)')).toBe('final line');
  });

  it('strips (instrumental) on its own line — becomes empty line, trimmed away', () => {
    expect(stripUnsupportedDecorations('(instrumental)\nVerse line')).toBe('Verse line');
  });

  it('is case-insensitive for directions', () => {
    expect(stripUnsupportedDecorations('line (REPEAT)')).toBe('line');
  });

  it('does NOT strip general parenthetical lyrics content', () => {
    // Parentheticals with names or lyric content should pass through
    expect(stripUnsupportedDecorations('(Priya) you are my world')).toContain('(Priya)');
    expect(stripUnsupportedDecorations('I love you (so much)')).toContain('(so much)');
  });
});

describe('Custom lyrics Suno structure', () => {
  it('removes emojis and decorative symbols', () => {
    const output = stripUnsupportedDecorations(
      'You are my star ⭐\nForever with you 🎉'
    );
    expect(output).toContain('You are my star');
    expect(output).not.toContain('⭐');
    expect(output).not.toContain('🎉');
  });

  it('adds section markers for unstructured lyrics', () => {
    const rawLyrics = [
      'You held my hand in the rain',
      'We danced through every season',
      'You are my forever song',
      'I keep your name in every line',
      'We found our rhythm in silence',
      'Your smile turns night to dawn',
      'Stay with me through every storm',
    ].join('\n');

    const output = buildDeterministicStructure(rawLyrics);
    expect(output).toContain('[Verse 1]');
    expect(output).toContain('[Chorus]');
    expect(output).toContain('[Bridge]');
  });

  it('keeps already-structured lyrics idempotent', () => {
    const structured = `[Verse 1]\nline one\nline two\n\n[Chorus]\nline three\nline four`;
    const output = buildDeterministicStructure(structured);
    expect(output).toBe(structured);
  });
});
