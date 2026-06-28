import { describe, expect, it } from 'vitest';
import {
  buildAudioModelCrafterSystemPrompt,
  buildAudioModelCrafterUserPrompt,
} from '../lib/services/llm/prompts/audio-model-lyrics-crafter-prompt-builder';

const HINDI_ROMANIZED = `[Verse 1]
Tum mere dil ki dhadkan ho
Har pal mere saath rehna
Zindagi teri meri hai
Kabhi na jaana`;

const HINDI_DEVANAGARI = `[Verse 1]
तुम मेरे दिल की धड़कन हो
हर पल मेरे साथ रहना
ज़िंदगी तेरी मेरी है
कभी न जाना`;

const ENGLISH_LYRICS = `[Verse 1]
You are my heart and soul
Every day beside me
This life is yours and mine
Never leave my side`;

describe('buildAudioModelCrafterSystemPrompt', () => {
  it('instructs the LLM to convert Romanized text to native script', () => {
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toContain('Romanized');
    expect(prompt).toContain('native script');
  });

  it('tells the LLM to leave already-native-script text unchanged', () => {
    // Critical: prevents the model from back-converting Devanagari → Roman
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toMatch(/already.*native.*script.*output.*exactly|output.*exactly.*as-is/i);
  });

  it('explicitly tells the LLM to leave English in Latin script', () => {
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toContain('English');
    expect(prompt).toContain('Latin script');
  });

  it('tells the LLM to keep section headers unchanged', () => {
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toContain('[Verse 1]');
    expect(prompt).toContain('[Chorus]');
  });

  it('instructs the LLM not to translate or rephrase', () => {
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toMatch(/do NOT translate|not translate/i);
  });

  it('tells the LLM to output ONLY the processed lyrics', () => {
    const prompt = buildAudioModelCrafterSystemPrompt();
    expect(prompt).toContain('Output ONLY');
  });
});

describe('buildAudioModelCrafterUserPrompt — non-English (main custom lyrics path)', () => {
  it('embeds the display lyrics in the prompt', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
    });
    expect(prompt).toContain(HINDI_ROMANIZED);
  });

  it('uses ---BEGIN LYRICS--- / ---END LYRICS--- delimiters (not triple-quote)', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
    });
    expect(prompt).toContain('---BEGIN LYRICS---');
    expect(prompt).toContain('---END LYRICS---');
    expect(prompt).not.toContain('"""');
  });

  it('is safe when lyrics contain triple-quotes (prompt injection guard)', () => {
    const lyricsWithQuotes = 'Line one\n"""\nLine two after quotes';
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: lyricsWithQuotes,
      languages: 'Hindi',
    });
    // Lyrics are preserved verbatim; the delimiter doesn't use """ so no early termination
    expect(prompt).toContain(lyricsWithQuotes);
    expect(prompt).toContain('---BEGIN LYRICS---');
  });

  it('includes the language in the prompt', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
    });
    expect(prompt).toContain('Hindi');
  });

  it('includes recipient details when provided', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
      recipientDetails: 'Priya, my wife',
    });
    expect(prompt).toContain('Priya, my wife');
  });

  it('omits recipient context when recipientDetails is not provided', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
    });
    expect(prompt).not.toContain('Recipient details');
  });

  it('omits recipient context when recipientDetails is empty string', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
      recipientDetails: '   ',
    });
    expect(prompt).not.toContain('Recipient details');
  });

  it('works for mixed Hindi+English language tag', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi, English',
    });
    expect(prompt).toContain('Hindi, English');
    expect(prompt).toContain(HINDI_ROMANIZED);
  });

  it('also works when lyrics are already in Devanagari — system prompt rule 1 instructs pass-through', () => {
    // The crafter always runs regardless of script. Rule 1 in the system prompt explicitly
    // tells the model to output already-native text unchanged, preventing back-conversion.
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_DEVANAGARI,
      languages: 'Hindi',
    });
    expect(prompt).toContain(HINDI_DEVANAGARI);
    expect(prompt).toContain('Hindi');
    // Framing no longer says "Romanized" — safe for native-script input too
    expect(prompt).not.toContain('Romanized');
  });
});

describe('buildAudioModelCrafterUserPrompt — English-only path', () => {
  it('uses the English-only prompt variant when isEnglishOnly is true', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: ENGLISH_LYRICS,
      languages: 'English',
      isEnglishOnly: true,
    });
    expect(prompt).toContain('English only');
    expect(prompt).toContain('Do NOT convert any English text');
  });

  it('uses ---BEGIN/END LYRICS--- delimiters in English-only path too', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: ENGLISH_LYRICS,
      languages: 'English',
      isEnglishOnly: true,
    });
    expect(prompt).toContain('---BEGIN LYRICS---');
    expect(prompt).toContain('---END LYRICS---');
    expect(prompt).not.toContain('"""');
  });

  it('embeds lyrics in the English-only prompt', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: ENGLISH_LYRICS,
      languages: 'English',
      isEnglishOnly: true,
    });
    expect(prompt).toContain(ENGLISH_LYRICS);
  });

  it('English-only prompt still supports recipient details for proper noun conversion', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: ENGLISH_LYRICS,
      languages: 'English',
      isEnglishOnly: true,
      recipientDetails: 'Arjun, my son',
    });
    expect(prompt).toContain('Arjun, my son');
  });

  it('non-English-only prompt does NOT contain the English-only instruction', () => {
    const prompt = buildAudioModelCrafterUserPrompt({
      displayLyrics: HINDI_ROMANIZED,
      languages: 'Hindi',
      isEnglishOnly: false,
    });
    expect(prompt).not.toContain('English only');
    expect(prompt).not.toContain('Do NOT convert any English text');
  });
});
