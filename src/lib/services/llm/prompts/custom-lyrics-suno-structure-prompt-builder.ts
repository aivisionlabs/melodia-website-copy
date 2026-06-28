interface BuildSunoStructureUserPromptParams {
  lyrics: string;
  languages?: string | null;
  recipientDetails?: string | null;
  occasion?: string | null;
}

export function buildSunoStructureSystemPrompt(): string {
  return [
    "You are a SUNO lyrics formatting assistant.",
    "Your only task is to convert raw lyrics into clean SUNO-ready lyrics while preserving meaning.",
    "Do not add explanations.",
    "",
    "Rules:",
    "1) Output ONLY raw JSON object.",
    "2) Always use square-bracket section headers in English, such as [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro].",
    "3) Remove emojis and decorative symbols.",
    "4) Keep lyrics language as provided by user; do not translate.",
    "5) Keep lines singable and avoid paragraph-style blocks.",
    "6) If sections already exist, normalize only; do not duplicate section headers.",
    "7) Keep line breaks with \\n and section spacing with blank lines.",
    "8) Preserve names and important words.",
    "",
    "JSON schema:",
    '{ "structuredLyrics": "string" }',
  ].join("\n");
}

export function buildSunoStructureUserPrompt(
  params: BuildSunoStructureUserPromptParams
): string {
  const { lyrics, languages, recipientDetails, occasion } = params;
  return [
    "Format these lyrics for SUNO:",
    "",
    `Languages: ${languages || "Not specified"}`,
    `Recipient context: ${recipientDetails || "Not specified"}`,
    `Occasion: ${occasion || "Not specified"}`,
    "",
    'Lyrics:',
    '"""',
    lyrics,
    '"""',
  ].join("\n");
}

