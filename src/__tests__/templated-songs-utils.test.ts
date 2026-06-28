import { describe, it, expect } from 'vitest';
import {
  replacePlaceholderWithName,
  templatedSongDisplayTitle,
  NAME_PLACEHOLDER,
} from '@/lib/templated-songs-utils';

describe('replacePlaceholderWithName', () => {
  it('replaces single {{NAME}} placeholder', () => {
    const result = replacePlaceholderWithName(`Happy birthday {{NAME}}`, 'Priya');
    expect(result).toBe("Happy birthday Priya' Song");
  });

  it('replaces multiple {{NAME}} occurrences', () => {
    const result = replacePlaceholderWithName(
      `{{NAME}} is wonderful, dear {{NAME}}`,
      'Raj',
    );
    expect(result).toBe("Raj is wonderful, dear Raj' Song");
  });

  it('returns text with appended suffix when no placeholder present', () => {
    const result = replacePlaceholderWithName('No placeholder here', 'Meera');
    expect(result).toBe("No placeholder here' Song");
  });

  it('returns text with appended suffix when name is empty string', () => {
    const result = replacePlaceholderWithName(`Hello {{NAME}}`, '');
    expect(result).toBe("Hello {{NAME}}' Song");
  });

  it('does not use regex — safe with special regex characters in name', () => {
    const name = 'O(n+e)';
    const result = replacePlaceholderWithName(`Song for {{NAME}}`, name);
    expect(result).toBe(`Song for O(n+e)' Song`);
  });

  it('NAME_PLACEHOLDER constant matches the expected token', () => {
    expect(NAME_PLACEHOLDER).toBe('{{NAME}}');
  });
});

describe('templatedSongDisplayTitle', () => {
  it('prefers title over template_title', () => {
    expect(
      templatedSongDisplayTitle({ title: 'Birthday Bop', template_title: '{{NAME}} Birthday' }),
    ).toBe('Birthday Bop');
  });

  it('falls back to template_title when title is empty', () => {
    expect(
      templatedSongDisplayTitle({ title: '', template_title: '{{NAME}} Birthday' }),
    ).toBe('{{NAME}} Birthday');
  });

  it('falls back to "Template" when both are empty', () => {
    expect(
      templatedSongDisplayTitle({ title: '', template_title: null }),
    ).toBe('Template');
  });

  it('trims whitespace from title', () => {
    expect(
      templatedSongDisplayTitle({ title: '  Padded  ', template_title: 'Other' }),
    ).toBe('Padded');
  });
});
