import { z } from 'zod';
import { traceable } from 'langsmith/traceable';
import { DBSongRequest } from '@/types/song-request';
import {
  buildCustomLyricsProcessingPrompt,
  buildCustomLyricsProcessingUserPrompt,
} from './prompts/custom-lyrics-processor-prompt-builder';
import { validateSongGenerationInput, PromptSecurityError } from './prompt-security-validator';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, sanitizeJsonString, LLM_CONFIG } from './llm-shared';

const LLMResponseSchema = z.object({
  title: z.string().optional(),
  musicStyle: z.string().optional(), // May still be returned by LLM but is now optional/ignored
  lyrics: z.string().optional(),
  language: z.string().optional(),
  description: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

function validateOutput(output: LLMResponse): void {
  if (output.title) {
    const words = output.title.trim().split(/\s+/);
    if (words.length > 8) {
      throw new Error('Title exceeds maximum word count of 8 words');
    }
    if (output.title.length > 200) {
      throw new Error('Title is abnormally long');
    }
  }

  if (output.lyrics) {
    const lines = output.lyrics.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const repeatedCount = lines.filter((l) => l.trim() === firstLine).length;
      if (repeatedCount > lines.length * 0.5 && lines.length > 3) {
        throw new Error('Lyrics contain excessive repetition');
      }
    }
    if (output.lyrics.trim().length < 50) {
      throw new Error('Lyrics are too short (minimum 50 characters)');
    }
  }

  if (output.description && output.description.length > 150) {
    throw new Error('Description exceeds maximum length of 150 characters');
  }
}

// Helper to attempt custom lyrics processing with given parameters
async function _attemptProcessCustomLyrics(
  vertexAI: any,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  useJsonMode: boolean,
  attemptName: string
): Promise<LLMResponse> {
  logger.info('Attempting custom lyrics processing with LLM', {
    attempt: attemptName,
    temperature,
    maxOutputTokens,
    useJsonMode,
    model: LLM_CONFIG.modelName
  });

  const startTime = Date.now();
  const responseText = await generateWithVertexAI(
    vertexAI,
    systemPrompt,
    userPrompt,
    temperature,
    maxOutputTokens,
    useJsonMode
  );
  const llmDuration = Date.now() - startTime;

  logger.debug('LLM response received', {
    attempt: attemptName,
    responseLength: responseText.length,
    duration_ms: llmDuration
  });

  const sanitized = sanitizeJsonString(responseText);

  let parsed: LLMResponse;
  try {
    parsed = LLMResponseSchema.parse(JSON.parse(sanitized));
  } catch (parseError) {
    logger.error('Failed to parse LLM response', {
      attempt: attemptName,
      error: parseError instanceof Error ? parseError.message : String(parseError),
      sanitizedLength: sanitized.length
    });
    throw new Error(`Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }

  // Check for error responses
  if (parsed.error) {
    logger.warn('LLM returned error response', {
      attempt: attemptName,
      error: parsed.error,
      message: parsed.message
    });
    throw new Error(parsed.message || parsed.error || 'LLM returned an error');
  }

  // Validate output
  validateOutput(parsed);

  logger.info('Custom lyrics processing completed successfully', {
    attempt: attemptName,
    hasTitle: !!parsed.title,
    hasLyrics: !!parsed.lyrics,
    hasMusicStyle: !!parsed.musicStyle,
    duration_ms: llmDuration
  });

  return parsed;
}

/**
 * Process custom lyrics provided by the user through Gemini
 * Converts proper nouns to Devanagari script and structures the lyrics
 */
async function _processCustomLyricsImpl(
  customLyrics: string,
  songRequest: DBSongRequest,
  userProvidedTitle?: string
): Promise<LLMResponse> {
  const startTime = Date.now();

  logger.info('Starting custom lyrics processing', {
    customLyricsLength: customLyrics.length,
    hasTitle: !!userProvidedTitle,
    songRequestId: songRequest.id
  });

  // Demo mode: return mock response (musicStyle is now generated separately)
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Returning mock processed lyrics');
    return {
      title: userProvidedTitle || 'Custom Song',
      lyrics: customLyrics,
      language: songRequest.languages || 'English',
      description: 'A personalized song with custom lyrics',
    };
  }

  // Validate input for security
  try {
    validateSongGenerationInput({
      recipientDetails: songRequest.recipient_details,
      languages: songRequest.languages,
      songStory: customLyrics, // Use custom lyrics as story for validation
      mood: songRequest.mood || [],
    });
  } catch (error) {
    if (error instanceof PromptSecurityError) {
      logger.warn('Security validation failed for custom lyrics', {
        error: error.message,
        songRequestId: songRequest.id
      });
      throw error;
    }
    throw error;
  }

  // Build prompts
  const systemPrompt = buildCustomLyricsProcessingPrompt();
  const userPrompt = buildCustomLyricsProcessingUserPrompt(
    customLyrics,
    songRequest,
    userProvidedTitle
  );

  // Initialize Vertex AI
  const vertexAI = initializeVertexAI();

  // First attempt: Higher temperature for more creative processing
  try {
    const result = await _attemptProcessCustomLyrics(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.generation.temperature_attempt1,
      LLM_CONFIG.generation.maxOutputTokens,
      true, // useJsonMode
      'Attempt 1'
    );

    const duration = Date.now() - startTime;
    logger.info('Custom lyrics processing completed successfully', {
      duration_ms: duration,
      hasTitle: !!result.title,
      hasLyrics: !!result.lyrics
    });

    return result;
  } catch (firstError) {
    logger.warn('First attempt failed, retrying with lower temperature', {
      error: firstError instanceof Error ? firstError.message : String(firstError)
    });

    // Second attempt: Lower temperature for more consistent output
    try {
      const result = await _attemptProcessCustomLyrics(
        vertexAI,
        systemPrompt,
        userPrompt,
        LLM_CONFIG.generation.temperature_attempt2,
        LLM_CONFIG.generation.maxOutputTokens,
        true, // useJsonMode
        'Attempt 2'
      );

      const duration = Date.now() - startTime;
      logger.info('Custom lyrics processing completed successfully on retry', {
        duration_ms: duration,
        hasTitle: !!result.title,
        hasLyrics: !!result.lyrics
      });

      return result;
    } catch (secondError) {
      const duration = Date.now() - startTime;
      logger.error('Custom lyrics processing failed after all attempts', {
        duration_ms: duration,
        firstError: firstError instanceof Error ? firstError.message : String(firstError),
        secondError: secondError instanceof Error ? secondError.message : String(secondError)
      });

      throw new Error(
        `Failed to process custom lyrics: ${secondError instanceof Error ? secondError.message : String(secondError)}`
      );
    }
  }
}

// =============================================================================
// LangSmith Traced Export
// =============================================================================

const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

export const processCustomLyrics = maybeTraceable(_processCustomLyricsImpl, {
  name: 'process-custom-lyrics',
  run_type: 'chain',
  metadata: { module: 'custom-lyrics-processor' },
  tags: ['lyrics', 'custom-processing'],
});
