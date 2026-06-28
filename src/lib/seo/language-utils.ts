import { LANGUAGE_PAGES, type LanguagePageData } from "./language-pages";

export function getLanguagePageByName(name: string): LanguagePageData | undefined {
  const normalized = name.trim().toLowerCase();
  return LANGUAGE_PAGES.find(
    (lang) => lang.name.toLowerCase() === normalized || lang.slug === normalized,
  );
}

/** Map a song's comma-separated language field to matching language landing pages. */
export function getLanguagePagesFromSongLanguage(
  language: string | null | undefined,
): LanguagePageData[] {
  if (!language?.trim()) return [];

  const parts = language.split(/,\s*/).map((part) => part.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: LanguagePageData[] = [];

  for (const part of parts) {
    const page = getLanguagePageByName(part);
    if (page && !seen.has(page.slug)) {
      seen.add(page.slug);
      result.push(page);
    }
  }

  return result;
}

export function buildLanguagePageDescription(lang: LanguagePageData): string {
  return `Listen to personalized ${lang.name} song examples on Melodia — weddings, birthdays, anniversaries & more. Create your own custom ${lang.name} song from INR 199.`;
}
