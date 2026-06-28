/**
 * LLM Lyrics Generation Service
 * Uses Google Vertex AI (Gemini) to generate song lyrics
 */

import { VertexAI } from '@google-cloud/vertexai';
import { CredentialsManager } from '../ai/credentials-manager';
import { isDemoModeEnabled } from '@/lib/demo-mode';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const LOCATION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const MODEL_NAME = process.env.GOOGLE_CLOUD_VERTEX_AI_MODEL || 'gemini-2.5-flash';

let vertexAI: VertexAI | null = null;

// Initialize Vertex AI with proper credentials
function getVertexAI() {
  if (!vertexAI && !isDemoModeEnabled()) {
    if (!PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    const creds = CredentialsManager.getGCSCredentialsFromEnv();

    // Initialize Vertex AI with credentials if available
    if (creds) {
      vertexAI = new VertexAI({
        project: PROJECT_ID,
        location: LOCATION,
        googleAuthOptions: {
          credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key.replace(/\\n/g, '\n'),
          }
        }
      });
    } else {
      // Fallback to default credentials (requires Application Default Credentials)
      console.warn(
        'No credentials found in GCS_CREDENTIALS_JSON. ' +
        'Attempting to use Application Default Credentials. This may fail in serverless environments.'
      );
      vertexAI = new VertexAI({
        project: PROJECT_ID,
        location: LOCATION,
      });
    }
  }
  return vertexAI;
}

export interface LyricsGenerationRequest {
  recipientName: string;
  relationship?: string;
  occasion?: string;
  languages: string[];
  mood?: string[];
  story?: string;
  additionalDetails?: string;
  style?: string;
}

export interface LyricsGenerationResponse {
  lyrics: string;
  title: string;
  musicStyle: string;
  language: string;
  modelName: string;
}

/**
 * Build the prompt for lyrics generation
 */
function buildLyricsPrompt(request: LyricsGenerationRequest): string {
  const {
    recipientName,
    relationship = '',
    occasion = '',
    languages = ['English'],
    mood = [],
    story = '',
    style = 'Personal',
  } = request;

  const language = languages[0] || 'English';
  const moodStr = mood.length > 0 ? mood.join(', ') : 'joyful';

  return `You are a professional songwriter. Create a beautiful, heartfelt song with the following details:

RECIPIENT: ${recipientName}${relationship ? ` (${relationship})` : ''}
OCCASION: ${occasion || 'special moment'}
LANGUAGE: ${language}
MOOD: ${moodStr}
STYLE: ${style}

${story ? `STORY/CONTEXT:\n${story}\n` : ''}

Please generate:
1. A catchy, memorable song title
2. Complete song lyrics with verses and chorus
3. Music style recommendation (e.g., "Pop Ballad", "Acoustic Folk", "R&B", etc.)

IMPORTANT REQUIREMENTS:
- Lyrics should be in ${language}
- Include 2-3 verses and a memorable chorus
- Make it emotional and personal
- Keep verses 4-6 lines each
- Chorus should be 3-4 lines and repeatable
- Total length: 15-20 lines
- Use natural, conversational language
- Avoid clichés, be original

Format your response EXACTLY like this:
TITLE: [Song Title]
MUSIC_STYLE: [Style]
LYRICS:
[Verse 1]
Line 1
Line 2
...

[Chorus]
Line 1
Line 2
...

[Verse 2]
...

[Chorus]
...`;
}

/**
 * Parse the LLM response
 */
function parseLyricsResponse(response: string): Omit<LyricsGenerationResponse, 'modelName'> {
  try {
    // Extract title
    const titleMatch = response.match(/TITLE:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Song';

    // Extract music style
    const styleMatch = response.match(/MUSIC_STYLE:\s*(.+)/i);
    const musicStyle = styleMatch ? styleMatch[1].trim() : 'Pop';

    // Extract lyrics (everything after LYRICS:)
    const lyricsMatch = response.match(/LYRICS:\s*([\s\S]+)/i);
    const lyrics = lyricsMatch
      ? lyricsMatch[1].trim()
      : response.split('\n').slice(3).join('\n').trim();

    return {
      title,
      musicStyle,
      lyrics,
      language: 'English', // Will be updated from request
    };
  } catch (error) {
    console.error('Error parsing lyrics response:', error);
    throw new Error('Failed to parse generated lyrics');
  }
}

/**
 * Generate song lyrics using Vertex AI
 */
export async function generateLyrics(
  request: LyricsGenerationRequest
): Promise<LyricsGenerationResponse> {
  // Demo mode - return mock lyrics
  //   if (isDemoModeEnabled()) {
  //     console.log('[DEMO MODE] LLM - Generate lyrics for:', request.recipientName);

  //     return {
  //       title: `Song for ${request.recipientName}`,
  //       musicStyle: 'Pop Ballad',
  //       lyrics: `[Verse 1]
  // Every moment spent with you
  // Fills my heart with joy so true
  // ${request.recipientName}, you light up my days
  // In so many wonderful ways

  // [Chorus]
  // This song is for you
  // A melody bright and new
  // Celebrating all you do
  // ${request.recipientName}, this song is for you

  // [Verse 2]
  // Through the laughter and the tears
  // You've been there through all the years
  // Your kindness knows no end
  // My beloved ${request.relationship || 'friend'}

  // [Chorus]
  // This song is for you
  // A melody bright and new
  // Celebrating all you do
  // ${request.recipientName}, this song is for you`,
  //       language: request.languages[0] || 'English',
  //       modelName: 'demo-model',
  //     };
  //   }

  try {
    const ai = getVertexAI();
    if (!ai) {
      throw new Error('Vertex AI not initialized');
    }

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = buildLyricsPrompt(request);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new Error('No lyrics generated');
    }

    const parsed = parseLyricsResponse(text);

    return {
      ...parsed,
      language: request.languages[0] || 'English',
      modelName: MODEL_NAME,
    };
  } catch (error) {
    console.error('Lyrics generation error:', error);

    // Check for authentication/configuration errors
    if (error instanceof Error) {
      if (
        error.message.includes('Unable to authenticate') ||
        error.message.includes('Could not load the default credentials') ||
        error.message.includes('GOOGLE_CLOUD_PROJECT_ID') ||
        error.message.includes('GCS_CREDENTIALS_JSON')
      ) {
        throw new Error(
          'Google Cloud credentials are missing or invalid. ' +
          'Please set GCS_CREDENTIALS_JSON environment variable.'
        );
      }

      // Re-throw with original message if it contains useful info
      if (error.message.includes('Failed to generate lyrics')) {
        throw error;
      }
    }

    throw new Error('Failed to generate lyrics. Please try again.');
  }
}

/**
 * Refine existing lyrics
 */
export async function refineLyrics(
  originalLyrics: string,
  editPrompt: string
): Promise<string> {
  // if (isDemoModeEnabled()) {
  //   console.log('[DEMO MODE] LLM - Refine lyrics with prompt:', editPrompt);
  //   return originalLyrics + '\n\n[Refined based on feedback]';
  // }

  try {
    const ai = getVertexAI();
    if (!ai) {
      throw new Error('Vertex AI not initialized');
    }

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = `You are a professional songwriter. Here are the current song lyrics:

${originalLyrics}

The user wants you to make the following changes:
${editPrompt}

Please provide the COMPLETE revised lyrics (not just the changes). Maintain the song structure and format.
Keep the same verse/chorus format with [Verse 1], [Chorus], etc.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new Error('No refined lyrics generated');
    }

    return text.trim();
  } catch (error) {
    console.error('Lyrics refinement error:', error);

    // Check for authentication/configuration errors
    if (error instanceof Error) {
      if (
        error.message.includes('Unable to authenticate') ||
        error.message.includes('Could not load the default credentials') ||
        error.message.includes('GOOGLE_CLOUD_PROJECT_ID') ||
        error.message.includes('GCS_CREDENTIALS_JSON')
      ) {
        throw new Error(
          'Google Cloud credentials are missing or invalid. ' +
          'Please set GCS_CREDENTIALS_JSON environment variable.'
        );
      }

      // Re-throw with original message if it contains useful info
      if (error.message.includes('Failed to refine lyrics')) {
        throw error;
      }
    }

    throw new Error('Failed to refine lyrics. Please try again.');
  }
}

/**
 * Validate prompt for security (prevent prompt injection)
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  // Check for common prompt injection patterns
  const dangerousPatterns = [
    /ignore\s+(previous|all|above|prior)\s+(instructions|prompts|rules)/i,
    /forget\s+(everything|all|previous)/i,
    /new\s+instructions:/i,
    /system\s+(prompt|message|override)/i,
    /act\s+as\s+(if|though)/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(prompt)) {
      return {
        valid: false,
        error: 'Invalid input detected. Please rephrase your request.',
      };
    }
  }

  // Check length
  if (prompt.length > 5000) {
    return {
      valid: false,
      error: 'Input too long. Please keep it under 5000 characters.',
    };
  }

  return { valid: true };
}

