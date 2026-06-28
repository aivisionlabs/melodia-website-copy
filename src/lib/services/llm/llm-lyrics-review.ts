import { z } from 'zod';
import { traceable } from 'langsmith/traceable';
import { logger } from '@/lib/logger';
import {
  buildLyricsReviewAnalyzePrompt,
  buildLyricsReviewAnalyzeUserPrompt,
  type LyricsReviewContext,
} from './prompts/lyrics-review-prompt-builder';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { initializeVertexAI, generateWithVertexAI, parseLlmJsonText, LLM_CONFIG } from './llm-shared';

const REVIEW_MODEL = LLM_CONFIG.reviewModelName;

const ReviewSchema = z.object({
  flags: z.array(z.string()).optional().default([]),
  replacements: z.array(z.object({
    before: z.string().min(1),
    after: z.string().min(1),
    reason: z.string().min(1),
    module: z.enum(['rhyme_meter', 'phonetics', 'cultural', 'script']),
    severity: z.enum(['low', 'medium', 'high']),
  })).max(25).default([]),
});

const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

async function generateJsonForReview(args: {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  attemptName: string;
}): Promise<unknown> {
  const { systemPrompt, userPrompt, temperature, maxOutputTokens, attemptName } = args;
  const vertexAI = initializeVertexAI();

  const start = Date.now();
  const text = await generateWithVertexAI(
    vertexAI,
    systemPrompt,
    userPrompt,
    temperature,
    maxOutputTokens,
    true, // JSON mode
    REVIEW_MODEL,
  );
  const duration = Date.now() - start;

  logger.debug('Lyric review LLM response received', {
    attempt: attemptName,
    model: REVIEW_MODEL,
    responseLength: text.length,
    duration_ms: duration,
  });

  // Best-effort JSON parse (model is in JSON mime mode but can still emit wrappers/control chars)
  return parseLlmJsonText(text);
}

async function generateJsonForReviewWithRetry(args: {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  baseAttemptName: string;
}): Promise<unknown> {
  const { systemPrompt, userPrompt, maxOutputTokens, baseAttemptName } = args;

  try {
    return await generateJsonForReview({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxOutputTokens,
      attemptName: `${baseAttemptName}_1`,
    });
  } catch (error) {
    logger.warn('Lyric review JSON parse failed, retrying once', {
      attempt: `${baseAttemptName}_1`,
      error: error instanceof Error ? error.message : String(error),
      model: REVIEW_MODEL,
    });

    const strictPrompt =
      `${systemPrompt}\n\nSTRICT JSON REQUIREMENT:\n` +
      `- Output MUST be valid JSON (no trailing commas).\n` +
      `- Escape newlines inside strings as \\n.\n` +
      `- Do not output any text outside the JSON object.\n`;

    return await generateJsonForReview({
      systemPrompt: strictPrompt,
      userPrompt,
      temperature: 0.0,
      maxOutputTokens,
      attemptName: `${baseAttemptName}_2`,
    });
  }
}

function validateLyricsStructureForReview(lyrics: string): string[] {
  const issues: string[] = [];
  const t = (lyrics || '').trim();
  if (!t) issues.push('Lyrics are empty');
  if (t.length < 50) issues.push('Lyrics are too short');

  const hasBracketHeaders = /^\[[^\]\n]{1,80}\]\s*$/m.test(t);
  const hasParenHeaders = /^\([^)]+\)\s*$/m.test(t);
  if (hasBracketHeaders && hasParenHeaders) issues.push('Mixed header styles: both [..] and (..)');
  if (hasParenHeaders && !hasBracketHeaders) issues.push('Legacy parentheses headers present');

  const hasVerse = /^\[(verse)(\s+\d+)?\]\s*$/im.test(t);
  const hasChorus = /^\[chorus\]\s*$/im.test(t);
  if (!hasVerse) issues.push('Missing [Verse] header');
  if (!hasChorus) issues.push('Missing [Chorus] header');

  for (const line of t.split('\n')) {
    if (line.includes('!') && /[\p{Script=Devanagari}]/u.test(line)) {
      issues.push('Hindi punctuation rule violated: ! found in Devanagari line');
      break;
    }
  }

  return issues;
}

export interface LyricsReviewResult {
  fixedLyrics: string;
  reviewReport: z.infer<typeof ReviewSchema> & {
    applied: Array<{
      before: string;
      after: string;
      module: 'rhyme_meter' | 'phonetics' | 'cultural' | 'script';
      severity: 'low' | 'medium' | 'high';
    }>;
    skipped: Array<{
      before: string;
      reason: string;
    }>;
    warnings: string[];
  };
  reviewModelName: string;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    count++;
    idx = found + needle.length;
  }
  return count;
}

function applyDeterministicReplacements(args: {
  originalLyrics: string;
  replacements: Array<z.infer<typeof ReviewSchema>['replacements'][number]>;
}): { fixedLyrics: string; applied: LyricsReviewResult['reviewReport']['applied']; skipped: LyricsReviewResult['reviewReport']['skipped']; warnings: string[] } {
  const { originalLyrics } = args;
  const warnings: string[] = [];
  const applied: LyricsReviewResult['reviewReport']['applied'] = [];
  const skipped: LyricsReviewResult['reviewReport']['skipped'] = [];

  // Apply longer matches first to avoid partial overlaps
  const ordered = [...args.replacements].sort((a, b) => (b.before.length - a.before.length));

  let current = originalLyrics;
  for (const r of ordered) {
    const occurrences = countOccurrences(current, r.before);
    if (occurrences === 0) {
      skipped.push({ before: r.before, reason: 'before_not_found' });
      continue;
    }
    if (occurrences > 1) {
      skipped.push({ before: r.before, reason: 'before_not_unique' });
      continue;
    }

    current = current.replace(r.before, r.after);
    applied.push({
      before: r.before,
      after: r.after,
      module: r.module,
      severity: r.severity,
    });
  }

  if (skipped.length > 0) {
    warnings.push(`Skipped ${skipped.length} replacement(s) due to non-unique or missing matches`);
  }

  return { fixedLyrics: current, applied, skipped, warnings };
}

async function _reviewAndFixLyricsImpl(args: {
  lyrics: string;
  context?: LyricsReviewContext;
}): Promise<LyricsReviewResult> {
  const { lyrics, context } = args;

  if (isDemoModeEnabled()) {
    logger.info('DEMO MODE: Skipping lyric review/fix (returning input lyrics)', {
      hasLyrics: !!lyrics,
      lyricsLength: lyrics?.length || 0,
    });
    return {
      fixedLyrics: lyrics,
      reviewReport: {
        flags: ['demo_mode'],
        replacements: [],
        applied: [],
        skipped: [],
        warnings: ['Demo mode: review was skipped'],
      },
      reviewModelName: 'demo-mode',
    };
  }

  logger.info('Starting lyric review (deterministic replacements)', {
    model: REVIEW_MODEL,
    lyricsLength: lyrics.length,
    languages: context?.languages,
  });

  // Step 1: Analyze
  const analyzeSystem = buildLyricsReviewAnalyzePrompt();
  const analyzeUser = buildLyricsReviewAnalyzeUserPrompt(lyrics, context);
  const raw = await generateJsonForReviewWithRetry({
    systemPrompt: analyzeSystem,
    userPrompt: analyzeUser,
    maxOutputTokens: 2500,
    baseAttemptName: 'review',
  });
  const review = ReviewSchema.parse(raw);

  const appliedRes = applyDeterministicReplacements({
    originalLyrics: lyrics,
    replacements: review.replacements,
  });

  const fixedLyrics = appliedRes.fixedLyrics.trim();

  // Validate output; retry once with stricter constraints if needed
  const issues = validateLyricsStructureForReview(fixedLyrics);
  if (issues.length > 0) {
    logger.warn('Lyric review output failed validation after replacements', {
      issues,
      model: REVIEW_MODEL,
    });
  }

  if (issues.length > 0) {
    logger.error('Lyric review failed to produce valid lyrics', {
      issues,
      model: REVIEW_MODEL,
    });
    throw new Error(`Lyric review could not produce valid lyrics: ${issues.join('; ')}`);
  }

  const report = {
    ...review,
    applied: appliedRes.applied,
    skipped: appliedRes.skipped,
    warnings: appliedRes.warnings,
  };

  logger.info('Lyric review completed (deterministic replacements applied)', {
    model: REVIEW_MODEL,
    replacementCount: review.replacements.length,
    appliedCount: appliedRes.applied.length,
    skippedCount: appliedRes.skipped.length,
    fixedLyricsLength: fixedLyrics.length,
  });

  return {
    fixedLyrics,
    reviewReport: report,
    reviewModelName: REVIEW_MODEL,
  };
}

// =============================================================================
// LangSmith Traced Export
// =============================================================================

export const reviewAndFixLyrics = maybeTraceable(_reviewAndFixLyricsImpl, {
  name: 'review-and-fix-lyrics',
  run_type: 'chain',
  metadata: { module: 'lyrics-review' },
  tags: ['lyrics', 'review', 'phase-3'],
});
