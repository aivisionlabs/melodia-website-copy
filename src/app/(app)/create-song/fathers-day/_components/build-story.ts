export interface FathersDayStoryInput {
  title: string;
  musicalVibe: string;
  superpower: string;
  catchphrase: string;
  hometown: string;
  currentCity: string;
}

export function buildFathersDayStory(input: FathersDayStoryInput): string {
  const parts: string[] = [];

  parts.push(`Create a heartfelt Father's Day song for my ${input.title}.`);

  if (input.musicalVibe) {
    parts.push(`Musical style: ${input.musicalVibe}.`);
  }

  if (input.superpower) {
    parts.push(`He is known for being ${input.superpower}.`);
  }

  if (input.catchphrase.trim()) {
    parts.push(`A phrase he always says: "${input.catchphrase.trim()}".`);
  }

  if (input.hometown.trim() && input.currentCity.trim()) {
    parts.push(
      `His journey: from ${input.hometown.trim()} to ${input.currentCity.trim()} — every mile he travelled is a milestone worth celebrating in the song.`,
    );
  } else if (input.hometown.trim()) {
    parts.push(`He is originally from ${input.hometown.trim()}.`);
  } else if (input.currentCity.trim()) {
    parts.push(`He has built his life in ${input.currentCity.trim()}.`);
  }

  return parts.join(" ");
}
