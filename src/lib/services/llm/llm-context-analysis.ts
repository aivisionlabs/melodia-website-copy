import { z } from 'zod';
import { traceable } from 'langsmith/traceable';
import { SongFormData } from './llm-lyrics-operation';
import { buildContextAnalysisSystemPrompt, buildContextAnalysisUserPrompt } from './prompts/context-analysis-prompt-builder';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';
import { initializeVertexAI, generateWithVertexAI, sanitizeJsonString, LLM_CONFIG } from './llm-shared';
import { resolveOccasionPreset, getInstrumentationForCulture, getGenresForCulture } from './occasion-presets';

// =============================================================================
// Schema & Types
// =============================================================================

export const SongRequirementsSchema = z.object({
  singerPerspective: z.enum(['male', 'female', 'neutral', 'duet']),
  vocalGender: z.enum(['m', 'f']).nullable(),
  emotionalTone: z.string(),
  occasionContext: z.string(),
  energyLevel: z.enum(['low', 'medium', 'high']),
  culturalContext: z.string(),
  suggestedTempo: z.string(),
  keyThemes: z.array(z.string()),
  instrumentationHints: z.array(z.string()),
  suggestedGenre: z.string(),
  // Allow error responses from the LLM
  error: z.string().optional(),
  message: z.string().optional(),
});

export type SongRequirements = z.infer<typeof SongRequirementsSchema>;

// =============================================================================
// Demo Mode
// =============================================================================

function getDemoRequirements(formData: SongFormData): SongRequirements {
  const languagesRaw = (formData.languages || '').toString();
  const recipientRaw = (formData.recipientDetails || '').toLowerCase();

  // culturalContext is now a language label, not a music style descriptor
  const culturalContext = languagesRaw.trim() || 'English';

  // Infer singer perspective from recipient details
  let singerPerspective: 'male' | 'female' | 'neutral' = 'neutral';
  let vocalGender: 'm' | 'f' | null = null;

  if (/\b(husband|hubby|boyfriend|bf|fiance)\b/i.test(recipientRaw) || /\b(mere pati)\b/i.test(recipientRaw)) {
    singerPerspective = 'female';
    vocalGender = 'f';
  } else if (/\b(wife|wifey|girlfriend|gf|fiancee)\b/i.test(recipientRaw) || /\b(meri patni|meri wife|meri biwi)\b/i.test(recipientRaw)) {
    singerPerspective = 'male';
    vocalGender = 'm';
  }

  const occasion = formData.occassion || 'special moment';

  // Use resolveOccasionPreset for smart defaults (exact → fuzzy → generic)
  // This is the only place presets are used — as deterministic fallback
  // when the LLM is unavailable (demo mode or LLM failure).
  const { preset } = resolveOccasionPreset(formData.occassion);

  // Instrumentation and genre are now occasion-driven (not language-driven).
  // Only culturally Indian occasions (weddings, festivals, devotional) get
  // Indian instruments; everything else gets universal/western instruments.
  return {
    singerPerspective,
    vocalGender,
    emotionalTone: preset.emotionalTone,
    occasionContext: `A ${occasion} song for a loved one`,
    energyLevel: preset.energyLevel,
    culturalContext,
    suggestedTempo: preset.tempoRange,
    keyThemes: preset.defaultThemes,
    instrumentationHints: getInstrumentationForCulture(preset, culturalContext, formData.occassion),
    suggestedGenre: getGenresForCulture(preset, culturalContext, formData.occassion)[0] || 'pop ballad',
  };
}

// =============================================================================
// Main Function
// =============================================================================

async function _analyzeContextImpl(formData: SongFormData): Promise<SongRequirements> {
  const startTime = Date.now();
  logger.info('Starting context analysis', {
    hasRecipientDetails: !!formData?.recipientDetails,
    languages: formData?.languages,
    occasion: formData?.occassion,
  });

  // Demo mode
  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Using mock context analysis');
    await new Promise(resolve => setTimeout(resolve, 300));
    const demoResult = getDemoRequirements(formData);
    logger.info('DEMO MODE: Context analysis complete', { singerPerspective: demoResult.singerPerspective, vocalGender: demoResult.vocalGender });
    return demoResult;
  }

  const systemPrompt = buildContextAnalysisSystemPrompt();
  const userPrompt = buildContextAnalysisUserPrompt(formData);

  try {
    const vertexAI = initializeVertexAI();

    // First attempt with higher temperature for nuanced analysis
    try {
      const result = await _attemptContextAnalysis(
        vertexAI,
        systemPrompt,
        userPrompt,
        LLM_CONFIG.contextAnalysis.temperature_attempt1,
        LLM_CONFIG.contextAnalysis.maxOutputTokens,
        'Attempt 1',
      );

      const duration = Date.now() - startTime;
      logger.info('Context analysis completed successfully', {
        singerPerspective: result.singerPerspective,
        vocalGender: result.vocalGender,
        energyLevel: result.energyLevel,
        culturalContext: result.culturalContext,
        duration_ms: duration,
      });

      return result;
    } catch (firstError) {
      logger.warn('Context analysis first attempt failed, retrying', {
        error: firstError instanceof Error ? firstError.message : String(firstError),
      });

      // Second attempt with lower temperature
      try {
        const result = await _attemptContextAnalysis(
          vertexAI,
          systemPrompt,
          userPrompt,
          LLM_CONFIG.contextAnalysis.temperature_attempt2,
          LLM_CONFIG.contextAnalysis.maxOutputTokens,
          'Attempt 2',
        );

        const duration = Date.now() - startTime;
        logger.info('Context analysis completed on second attempt', { duration_ms: duration });
        return result;
      } catch (secondError) {
        logger.error('Context analysis failed on both attempts, using fallback', {
          error: secondError instanceof Error ? secondError.message : String(secondError),
        });
        // Fallback to demo-style requirements rather than failing the whole generation
        return getDemoRequirements(formData);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Context analysis failed entirely, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
    });
    return getDemoRequirements(formData);
  }
}

// =============================================================================
// Private Helpers
// =============================================================================

async function _attemptContextAnalysis(
  vertexAI: any,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  attemptName: string,
): Promise<SongRequirements> {
  logger.info('Attempting context analysis', {
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
    true, // JSON mode
  );
  const duration = Date.now() - startTime;

  logger.debug('Context analysis LLM response received', {
    attempt: attemptName,
    responseLength: responseText.length,
    duration_ms: duration,
  });

  const sanitized = sanitizeJsonString(responseText);
  const parsed = JSON.parse(sanitized);
  const validated = SongRequirementsSchema.parse(parsed);

  // Check if AI rejected the request
  if (validated.error === 'INVALID_REQUEST') {
    logger.warn('LLM rejected context analysis request', { attempt: attemptName });
    throw new Error('Request did not contain valid input for song analysis');
  }

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

export const analyzeContext = maybeTraceable(_analyzeContextImpl, {
  name: 'analyze-context',
  run_type: 'chain',
  metadata: { module: 'context-analysis' },
  tags: ['context-analysis', 'phase-1'],
});
