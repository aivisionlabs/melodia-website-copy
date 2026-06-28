#!/usr/bin/env tsx

/**
 * Script to fetch and display the final prompts from lyrics-opeation-prompt-builder.ts
 * Usage: npx tsx scripts/fetch-prompts.ts
 */

import {
  buildGenerationPrompt,
  buildGenerationUserPrompt,
  buildRefinementPrompt,
  buildRefinementUserPrompt,
} from '../src/lib/services/llm/prompts/lyrics-operation-prompt-builder';
import { SongFormData } from '../src/lib/services/llm/llm-lyrics-operation';
import { DBSongRequest } from '../src/types/song-request';

// Dummy form data for testing
const dummyFormData: SongFormData = {
  languages: 'English, Hindi',
  recipientDetails: 'Sarah, my best friend who loves music and has been there for me through everything',
  songStory: 'We met in college and have been inseparable ever since. She introduced me to my favorite band and we always sing together in the car.',
  occassion: 'Birthday',
  mood: ['Happy', 'Upbeat', 'Romantic'],
  requesterName: 'John',
};

// Dummy song request for refinement testing
const dummySongRequest: DBSongRequest = {
  id: 1,
  requester_name: 'John',
  recipient_details: 'Sarah, my best friend',
  languages: 'English, Hindi',
  song_story: 'We met in college and have been inseparable ever since.',
  occasion: 'Birthday',
  mood: ['Happy', 'Upbeat'],
  mobile_number: null,
  email: null,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date(),
  user_id: 123,
  anonymous_user_id: null,
  lyrics_input_mode: 'ai_generated',
  input_lyrics: null,
  language_preferences: null,
  music_style_chips: null,
  music_style_notes: null,
};

// Dummy current lyrics for refinement
const dummyCurrentLyrics = `(Verse 1)
In the halls of college we first met
A friendship that I'll never forget
You showed me music, showed me life
Through every moment, joy and strife

(Chorus)
Best friend forever, side by side
In your presence, I can confide
Through the years, we've grown so close
You're the one I love the most

(Bridge)
Car rides singing, memories made
Never will this friendship fade
You're my rock, my constant light
Together we'll shine so bright

(Outro)
Happy birthday, my dear friend
Our bond will never, ever end`;

const dummyRefineText = 'Make it more emotional and add a verse about our road trip last summer';

console.log('='.repeat(80));
console.log('GENERATION PROMPTS');
console.log('='.repeat(80));
console.log('\n');

console.log('--- SYSTEM PROMPT ---');
console.log(buildGenerationPrompt());
console.log('\n');

console.log('--- USER PROMPT ---');
console.log(buildGenerationUserPrompt(dummyFormData));
console.log('\n');

console.log('='.repeat(80));
console.log('REFINEMENT PROMPTS');
console.log('='.repeat(80));
console.log('\n');

console.log('--- SYSTEM PROMPT ---');
console.log(buildRefinementPrompt());
console.log('\n');

console.log('--- USER PROMPT ---');
console.log(buildRefinementUserPrompt(dummyCurrentLyrics, dummyRefineText, dummySongRequest));
console.log('\n');

console.log('='.repeat(80));
console.log('PROMPT FETCHING COMPLETE');
console.log('='.repeat(80));

