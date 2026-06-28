import { z } from 'zod';
import { traceable } from 'langsmith/traceable';
import { DBSongRequest } from '@/types/song-request';
import { buildGenerationPrompt, buildGenerationUserPrompt, buildRefinementPrompt, buildRefinementUserPrompt, type OutputScript } from './prompts/lyrics-operation-prompt-builder';
import { validateSongGenerationInput, validateRefinementInput, PromptSecurityError } from './prompt-security-validator';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, sanitizeJsonString, LLM_CONFIG } from './llm-shared';
import { analyzeContext, SongRequirements } from './llm-context-analysis';
import { generateMusicStyle } from './llm-music-style-operation';

// =============================================================================
// Schemas & Types
// =============================================================================

/** Schema for lyrics-only LLM response (no musicStyle) */
const LyricsOnlyResponseSchema = z.object({
  title: z.string().optional(),
  lyrics: z.string().optional(),
  language: z.string().optional(),
  description: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  // Allow musicStyle to be present but ignore it (backward compat with model output)
  musicStyle: z.string().optional(),
});

type LyricsOnlyResponse = z.infer<typeof LyricsOnlyResponseSchema>;

/** Combined response including music style from separate generation */
export const LLMResponseSchema = z.object({
  title: z.string().optional(),
  musicStyle: z.string().optional(),
  lyrics: z.string().optional(),
  language: z.string().optional(),
  description: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema> & {
  vocalGender?: 'm' | 'f' | null;
  songRequirements?: SongRequirements;
};

export interface SongFormData {
  languages: string;
  recipientDetails: string;
  songStory: string;
  occassion?: string;
  mood: string[] | string;
  requesterName?: string;
  sourceSongLyrics?: string; // Lyrics from source song for style matching
  isPersonaBased?: boolean; // When true, downstream song generation uses personaId and does not require music style
  languagePreferences?: string; // Advanced: proportion guidance e.g. "70% Hindi, 30% English"
  advancedMusicChips?: string[]; // Advanced: occasion-specific genre/style chips
  musicStyleNotes?: string; // Advanced: free-text additional music style notes
  outputScript?: OutputScript; // 'romanized' (consumer default) or 'native' (admin — native script for audio model)
}

export interface RefinementRequest {
  currentLyrics: string;
  refineText: string;
  songRequest: DBSongRequest;
  /** Cached SongRequirements from the lyrics draft (same context as generation). Ensures refinement respects singer perspective, emotional tone, key themes. */
  songRequirements?: SongRequirements | null;
}

// =============================================================================
// Lyrics Output Validation
// =============================================================================

function validateLyricsOutput(output: LyricsOnlyResponse): void {
  if (output.title) {
    const words = output.title.trim().split(/\s+/);
    if (words.length > 8) {
      throw new Error('Title exceeds maximum word count of 8 words');
    }
    if (output.title.length > 200) {
      throw new Error('Title is abnormally long, likely gibberish');
    }
  }

  if (output.description && output.description.length > 150) {
    throw new Error('Description exceeds maximum length of 150 characters');
  }

  const lyrics = output.lyrics ?? '';
  if (!lyrics.trim()) {
    throw new Error('Lyrics are missing or empty');
  }

  if (lyrics.trim().length < 50) {
    throw new Error('Lyrics are too short (minimum 50 characters)');
  }

  const hasVerse =
    /^\[(verse)(\s+\d+)?\]\s*$/im.test(lyrics) ||
    /^\[verse\s*1\]\s*$/im.test(lyrics);
  const hasChorus = /^\[chorus\]\s*$/im.test(lyrics);

  if (!hasVerse || !hasChorus) {
    throw new Error('Lyrics must include at least [Verse 1]/[Verse] and [Chorus] headers');
  }
}

// =============================================================================
// Lyrics-Only Generation (Phase 2a)
// =============================================================================

async function _attemptGenerateLyricsOnly(
  vertexAI: any,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  useJsonMode: boolean,
  attemptName: string
): Promise<LyricsOnlyResponse> {
  logger.info('Attempting lyrics-only generation with LLM', {
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

  logger.debug('Lyrics LLM response received', {
    attempt: attemptName,
    responseLength: responseText.length,
    duration_ms: llmDuration
  });

  const sanitized = sanitizeJsonString(responseText);
  const parsed = JSON.parse(sanitized);
  const validated = LyricsOnlyResponseSchema.parse(parsed);

  // Check if AI rejected the request
  if (validated.error === 'INVALID_REQUEST') {
    logger.warn('LLM rejected request as invalid', { attempt: attemptName });
    throw new Error('Request did not contain valid input for lyrics creation');
  }

  validateLyricsOutput(validated);

  logger.info('Lyrics-only generation successful', {
    attempt: attemptName,
    title: validated.title,
    lyricsLength: validated.lyrics?.length || 0,
    duration_ms: llmDuration
  });

  return validated;
}

async function _generateLyricsOnly(
  vertexAI: any,
  validatedFormData: SongFormData,
  requirements?: SongRequirements,
): Promise<LyricsOnlyResponse> {
  const systemPrompt = buildGenerationPrompt({
    hasSourceSong: !!validatedFormData.sourceSongLyrics,
    outputScript: validatedFormData.outputScript,
  });
  const userPrompt = buildGenerationUserPrompt(validatedFormData, requirements);

  // First attempt: JSON mode with higher temperature
  try {
    return await _attemptGenerateLyricsOnly(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.generation.temperature_attempt1,
      LLM_CONFIG.generation.maxOutputTokens,
      true,
      'Lyrics Attempt 1'
    );
  } catch (firstError) {
    logger.warn('Lyrics first attempt failed, retrying with lower temperature', {
      error: firstError instanceof Error ? firstError.message : String(firstError)
    });

    // Second attempt: JSON mode with lower temperature
    return await _attemptGenerateLyricsOnly(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.generation.temperature_attempt2,
      LLM_CONFIG.generation.maxOutputTokens,
      true,
      'Lyrics Attempt 2'
    );
  }
}

// =============================================================================
// Main Generation: 3-Phase Orchestration
// =============================================================================

async function _generateLyricsImpl(formData: SongFormData): Promise<LLMResponse> {
  const startTime = Date.now();
  logger.info('Starting 3-phase lyrics generation', {
    hasRecipientDetails: !!formData?.recipientDetails,
    languages: formData?.languages,
    hasMood: !!formData?.mood,
    hasOccasion: !!formData?.occassion,
    isPersonaBased: !!formData?.isPersonaBased,
  });

  // Validate inputs first
  if (!formData || !formData.recipientDetails || !formData.languages || formData.languages.trim().length === 0) {
    logger.error('Missing required fields for lyrics generation', {
      hasFormData: !!formData,
      hasRecipientDetails: !!formData?.recipientDetails,
      hasLanguages: !!formData?.languages
    });
    throw new Error("Required details not found to produce lyrics");
  }

  // Apply security validation
  let validatedFormData: SongFormData;
  try {
    logger.debug('Validating form data for security');
    validatedFormData = validateSongGenerationInput(formData);
    logger.debug('Form data validation passed');
  } catch (error) {
    if (error instanceof PromptSecurityError) {
      logger.warn('Security validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Invalid input: ${error.message}`);
    }
    logger.error('Unexpected validation error', error instanceof Error ? error : { error: String(error) });
    throw error;
  }

  const isPersonaBased = !!validatedFormData.isPersonaBased;
  const hasSourceSong = !!validatedFormData.sourceSongLyrics;

  // Demo mode - return sample data without making LLM API calls
  if (isDemoModeEnabled()) {
    const shouldOmitMusicStyle = isPersonaBased || hasSourceSong;
    const languagesRaw = (validatedFormData.languages || '').toString();
    const isIndianLanguage =
      /(indian|indic|hindi|punjabi|bengali|tamil|telugu|marathi|gujarati|kannada|malayalam|urdu)/i.test(
        languagesRaw
      );

    logger.info('DEMO MODE: Using mock lyrics instead of real LLM API', {
      recipientDetails: validatedFormData.recipientDetails,
      hasSourceSongLyrics: hasSourceSong,
      isPersonaBased,
      shouldOmitMusicStyle,
      isIndianLanguage,
    });

    const recipientName = validatedFormData.recipientDetails.split(',')[0]?.trim() || validatedFormData.recipientDetails.trim();
    const language = validatedFormData.languages?.split(',')[0]?.trim() || 'English';
    const occasion = validatedFormData.occassion || 'special moment';
    const mood = Array.isArray(validatedFormData.mood)
      ? validatedFormData.mood.join(', ')
      : validatedFormData.mood || 'joyful';

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Infer vocal gender for demo mode
    const recipientLower = validatedFormData.recipientDetails.toLowerCase();
    let vocalGender: 'm' | 'f' | null = null;
    if (/\b(husband|hubby|boyfriend|bf|fiance)\b/.test(recipientLower)) {
      vocalGender = 'f';
    } else if (/\b(wife|wifey|girlfriend|gf|fiancee)\b/.test(recipientLower)) {
      vocalGender = 'm';
    }

    const demoMusicStyle = shouldOmitMusicStyle
      ? undefined
      : isIndianLanguage
        ? `Bollywood romantic ballad, ${vocalGender === 'f' ? 'Bollywood singer female' : vocalGender === 'm' ? 'Bollywood singer male' : 'Bollywood singer'}, tabla and piano and strings, 90 BPM, warm and intimate`
        : `romantic pop ballad, ${vocalGender === 'f' ? 'soft female vocals' : vocalGender === 'm' ? 'warm male vocals' : 'soft vocals'}, piano and strings, 85 BPM, warm and intimate`;

    return {
      title: `${recipientName}'s Special Song`,
      musicStyle: demoMusicStyle,
      lyrics: `[Verse 1]\nEvery moment spent with you\nFills my heart with joy so true\n${recipientName}, you light up my days\nIn so many wonderful ways\n\n[Chorus]\nThis song is for you\nA melody bright and new\nCelebrating all you do\n${recipientName}, this song is for you\n\n[Verse 2]\nOn this ${occasion} so special\nYour presence makes life so delightful\nYour kindness knows no end\nMy dear ${recipientName}, my friend\n\n[Chorus]\nThis song is for you\nA melody bright and new\nCelebrating all you do\n${recipientName}, this song is for you\n\n[Bridge]\nThrough the laughter and the tears\nYou've been there through all the years\nYour friendship means so much\nYour warm and caring touch\n\n[Chorus]\nThis song is for you\nA melody bright and new\nCelebrating all you do\n${recipientName}, this song is for you`,
      language: language,
      description: `A heartfelt ${mood} song for ${recipientName} on ${occasion}`,
      vocalGender,
    };
  }

  try {
    // =========================================================================
    // PHASE 1: Context Analysis
    // =========================================================================
    logger.info('Phase 1: Starting context analysis');
    const requirements = await analyzeContext(validatedFormData);
    logger.info('Phase 1 complete: Context analysis done', {
      singerPerspective: requirements.singerPerspective,
      vocalGender: requirements.vocalGender,
      energyLevel: requirements.energyLevel,
      duration_ms: Date.now() - startTime,
    });

    // =========================================================================
    // PHASE 2: Parallel Lyrics + Music Style Generation
    // =========================================================================
    logger.info('Phase 2: Starting parallel lyrics + music style generation');
    const vertexAI = initializeVertexAI();

    // For persona-based flow, skip music style generation
    const skipMusicStyle = isPersonaBased;

    const [lyricsResult, musicStyleResult] = await Promise.all([
      // Phase 2a: Lyrics generation
      _generateLyricsOnly(vertexAI, validatedFormData, requirements),
      // Phase 2b: Music style generation (skip for persona-based)
      skipMusicStyle
        ? Promise.resolve(null)
        : generateMusicStyle(requirements, validatedFormData).catch((error) => {
          logger.error('Music style generation failed, will use fallback', {
            error: error instanceof Error ? error.message : String(error),
          });
          return null; // Don't fail the whole generation if music style fails
        }),
    ]);

    const totalDuration = Date.now() - startTime;
    logger.info('3-phase lyrics generation completed successfully', {
      title: lyricsResult.title,
      lyricsLength: lyricsResult.lyrics?.length || 0,
      musicStyle: musicStyleResult || 'not generated',
      vocalGender: requirements.vocalGender,
      duration_ms: totalDuration,
    });

    return {
      title: lyricsResult.title,
      lyrics: lyricsResult.lyrics,
      language: lyricsResult.language,
      description: lyricsResult.description,
      musicStyle: musicStyleResult || undefined,
      vocalGender: requirements.vocalGender,
      songRequirements: requirements,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Lyrics generation failed after all attempts', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration
    });
    throw new Error("Error producing lyrics");
  }
}

// =============================================================================
// Lyrics Refinement (unchanged -- does not regenerate music style)
// =============================================================================

async function _refineLyricsImpl(refinementRequest: RefinementRequest): Promise<string> {
  const { currentLyrics, refineText, songRequest } = refinementRequest;

  if (!currentLyrics || !refineText || !songRequest) {
    throw new Error("Required refinement details not found");
  }

  let validatedRefineText: string;
  try {
    validatedRefineText = validateRefinementInput(refineText);
  } catch (error) {
    if (error instanceof PromptSecurityError) {
      throw new Error(`Invalid refinement request: ${error.message}`);
    }
    throw error;
  }

  // Demo mode — apply simple text transformations so the user can see visible changes
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Applying simple demo refinement', { refineText: validatedRefineText });
    await new Promise(resolve => setTimeout(resolve, 900));

    const cmd = validatedRefineText.toLowerCase();
    let result = currentLyrics;

    // "change X to Y" / "replace X with Y"
    const changeMatch = cmd.match(/(?:change|replace)\s+(.+?)\s+(?:to|with)\s+(.+)/i);
    if (changeMatch) {
      const [, from, to] = changeMatch;
      // Case-insensitive replace of the original phrase in the actual (non-lowercased) lyrics
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = currentLyrics.replace(regex, to.trim());
      logger.info('DEMO MODE: Applied change/replace transformation');
      return result;
    }

    // "make max N line(s)" / "limit to N lines" / "shorten to N lines"
    const maxLinesMatch = cmd.match(/(?:make\s+(?:max|maximum|only|it)\s*|(?:limit|shorten)\s+to\s+|keep\s+(?:only\s+)?)(\d+)\s*lines?/i);
    if (maxLinesMatch) {
      const maxLines = parseInt(maxLinesMatch[1], 10);
      const allLines = currentLyrics.split('\n');
      // Keep section headers + up to maxLines non-empty content lines
      let contentCount = 0;
      const kept: string[] = [];
      for (const line of allLines) {
        const isHeader = /^\[.+\]/.test(line.trim());
        if (isHeader) { kept.push(line); continue; }
        if (line.trim() === '') { kept.push(line); continue; }
        if (contentCount < maxLines) { kept.push(line); contentCount++; }
      }
      result = kept.join('\n').trimEnd();
      logger.info('DEMO MODE: Applied max-lines transformation', { maxLines, resultLines: kept.length });
      return result;
    }

    // "make shorter" / "shorten"
    if (/\bshorten\b|make.{0,10}\bshorter\b|cut.{0,10}\bhalf\b/.test(cmd)) {
      const lines = currentLyrics.split('\n');
      result = lines.slice(0, Math.ceil(lines.length / 2)).join('\n');
      logger.info('DEMO MODE: Applied shorten transformation');
      return result;
    }

    // Default: return lyrics unchanged (still creates a new version in DB)
    logger.info('DEMO MODE: No matching transformation, returning original lyrics');
    return currentLyrics;
  }

  const systemPrompt = buildRefinementPrompt();
  const userPrompt = buildRefinementUserPrompt(currentLyrics, validatedRefineText, songRequest, refinementRequest.songRequirements ?? undefined);

  try {
    logger.info('Attempting lyrics refinement with Vertex AI');
    const vertexAI = initializeVertexAI();
    const refinedText = await generateWithVertexAI(
      vertexAI,
      systemPrompt,
      userPrompt,
      LLM_CONFIG.refinement.temperature,
      LLM_CONFIG.refinement.maxOutputTokens,
      false
    );

    const trimmedText = refinedText.trim();

    if (trimmedText === 'ERROR_INVALID_REFINEMENT_REQUEST' ||
      trimmedText.includes('ERROR_INVALID_REFINEMENT_REQUEST')) {
      throw new Error('Request did not contain valid input for lyrics refinement');
    }

    logger.info('Refined lyrics generated successfully');
    return trimmedText;
  } catch (error) {
    logger.error('Error refining lyrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message.includes('Request did not contain valid input')) {
      throw error;
    }

    throw new Error("Error refining lyrics");
  }
}

// =============================================================================
// LangSmith Traced Exports
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

export const generateLyrics = maybeTraceable(_generateLyricsImpl, {
  name: 'generate-lyrics-pipeline',
  run_type: 'chain',
  metadata: { module: 'lyrics-operation' },
  tags: ['lyrics', 'generation', 'pipeline'],
});

export const refineLyrics = maybeTraceable(_refineLyricsImpl, {
  name: 'refine-lyrics',
  run_type: 'chain',
  metadata: { module: 'lyrics-operation' },
  tags: ['lyrics', 'refinement'],
});
