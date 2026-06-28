import { traceable } from 'langsmith/traceable';
import { SongRequirements } from './llm-context-analysis';
import { SongFormData } from './llm-lyrics-operation';
import { buildMusicStyleSystemPrompt, buildMusicStyleUserPrompt } from './prompts/music-style-prompt-builder';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, LLM_CONFIG } from './llm-shared';

// =============================================================================
// Demo Mode
// =============================================================================

function getDemoMusicStyle(requirements: SongRequirements): string {
  // All songs use Indian vocals (Bollywood/Indian singer)
  const indianVocal =
    requirements.vocalGender === 'f'
      ? 'Bollywood singer female'
      : requirements.vocalGender === 'm'
        ? 'Bollywood singer male'
        : 'Bollywood singer female';

  // Use the already occasion-driven instrumentationHints and suggestedGenre
  // from the context analysis (which are now occasion-based, not language-based).
  const instruments = requirements.instrumentationHints.length > 0
    ? requirements.instrumentationHints.join(' and ')
    : 'piano and strings and acoustic guitar';
  const genre = requirements.suggestedGenre || 'pop ballad';
  const tempo = requirements.suggestedTempo || '90 BPM';

  const energyTag =
    requirements.energyLevel === 'high' ? 'high energy'
    : requirements.energyLevel === 'low' ? 'intimate dynamics'
    : 'steady groove';

  const moodTag = requirements.emotionalTone || 'warm and heartfelt';

  return `${genre}, ${indianVocal} ${moodTag}, ${instruments}, ${tempo}, ${energyTag}, ${moodTag}, clean mix`;
}

// =============================================================================
// Validation
// =============================================================================

function validateMusicStyle(style: string): string {
  const trimmed = style.trim();

  // Remove surrounding quotes if present
  const cleaned = trimmed.replace(/^["']|["']$/g, '').trim();

  // Remove any prefix text like "The music style is:" or "Style:"
  const prefixCleaned = cleaned.replace(/^(the\s+)?music\s+style\s+(is|tag)\s*:?\s*/i, '').trim();

  // Check for error response
  if (prefixCleaned.includes('ERROR_INVALID_REQUEST')) {
    throw new Error('Request did not contain valid input for music style generation');
  }

  // Validate length (audio model supports up to 1000 chars for style)
  if (prefixCleaned.length < 50) {
    throw new Error(`Music style is too short (${prefixCleaned.length} chars, minimum 50)`);
  }

  if (prefixCleaned.length > 1000) {
    throw new Error(`Music style is too long (${prefixCleaned.length} chars, maximum 1000)`);
  }

  // Check it looks like a tag string (should contain commas for multiple descriptors)
  if (!prefixCleaned.includes(',')) {
    logger.warn('Music style does not contain commas, may not be in proper tag format', { style: prefixCleaned });
  }

  return prefixCleaned;
}

// =============================================================================
// Main Function
// =============================================================================

async function _generateMusicStyleImpl(
  requirements: SongRequirements,
  formData: SongFormData,
): Promise<string> {
  const startTime = Date.now();
  logger.info('Starting music style generation', {
    singerPerspective: requirements.singerPerspective,
    vocalGender: requirements.vocalGender,
    energyLevel: requirements.energyLevel,
    culturalContext: requirements.culturalContext,
    suggestedGenre: requirements.suggestedGenre,
  });

  // Demo mode
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Using mock music style');
    await new Promise(resolve => setTimeout(resolve, 200));
    const demoStyle = getDemoMusicStyle(requirements);
    logger.info('DEMO MODE: Music style generated', { musicStyle: demoStyle });
    return demoStyle;
  }

  const systemPrompt = buildMusicStyleSystemPrompt();
  const userPrompt = buildMusicStyleUserPrompt(requirements, formData);

  try {
    const vertexAI = initializeVertexAI();

    // First attempt
    try {
      const result = await _attemptMusicStyleGeneration(
        vertexAI,
        systemPrompt,
        userPrompt,
        LLM_CONFIG.musicStyle.temperature_attempt1,
        LLM_CONFIG.musicStyle.maxOutputTokens,
        'Attempt 1',
      );

      const duration = Date.now() - startTime;
      logger.info('Music style generation completed successfully', {
        musicStyle: result,
        duration_ms: duration,
      });

      return result;
    } catch (firstError) {
      logger.warn('Music style first attempt failed, retrying', {
        error: firstError instanceof Error ? firstError.message : String(firstError),
      });

      // Second attempt with lower temperature
      try {
        const result = await _attemptMusicStyleGeneration(
          vertexAI,
          systemPrompt,
          userPrompt,
          LLM_CONFIG.musicStyle.temperature_attempt2,
          LLM_CONFIG.musicStyle.maxOutputTokens,
          'Attempt 2',
        );

        const duration = Date.now() - startTime;
        logger.info('Music style generation completed on second attempt', {
          musicStyle: result,
          duration_ms: duration,
        });

        return result;
      } catch (secondError) {
        logger.error('Music style generation failed on both attempts, using fallback', {
          error: secondError instanceof Error ? secondError.message : String(secondError),
        });
        // Fallback to demo-style music style
        return getDemoMusicStyle(requirements);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Music style generation failed entirely, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
    });
    return getDemoMusicStyle(requirements);
  }
}

// =============================================================================
// Private Helpers
// =============================================================================

async function _attemptMusicStyleGeneration(
  vertexAI: any,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  attemptName: string,
): Promise<string> {
  logger.info('Attempting music style generation', {
    attempt: attemptName,
    temperature,
    model: LLM_CONFIG.modelName,
  });

  const startTime = Date.now();
  const responseText = await generateWithVertexAI(
    vertexAI,
    systemPrompt,
    userPrompt,
    temperature,
    maxOutputTokens,
    false, // Text mode, not JSON
  );
  const duration = Date.now() - startTime;

  logger.debug('Music style LLM response received', {
    attempt: attemptName,
    responseLength: responseText.length,
    duration_ms: duration,
  });

  const validated = validateMusicStyle(responseText);

  logger.info('Music style validated', {
    attempt: attemptName,
    musicStyle: validated,
    length: validated.length,
  });

  return validated;
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

export const generateMusicStyle = maybeTraceable(_generateMusicStyleImpl, {
  name: 'generate-music-style',
  run_type: 'chain',
  metadata: { module: 'music-style' },
  tags: ['music-style', 'phase-2b'],
});
