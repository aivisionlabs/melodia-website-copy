/**
 * Utilities for templated songs: {{NAME}} placeholder replacement in template/instance text.
 */

export const NAME_PLACEHOLDER = '{{NAME}}';

/**
 * Label for template pickers. Prefer admin-entered `title`; `template_title` is the
 * post–Process Lyrics value (may contain {{NAME}}) and is a poor default for UI.
 */
export function templatedSongDisplayTitle(row: {
  title: string;
  template_title?: string | null;
}): string {
  const primary = row.title?.trim();
  if (primary) return primary;
  return row.template_title?.trim() || "Template";
}

/**
 * Replace {{NAME}} placeholder with actual name in text (for instance lyrics).
 * Avoids ReDoS by not using regex with user input in a loop.
 */
export function replacePlaceholderWithName(text: string, name: string): string {
  if (!name || !text.includes(NAME_PLACEHOLDER)) {
    return `${text}' Song`;
  }
  return `${text.split(NAME_PLACEHOLDER).join(name)}' Song`;
}
