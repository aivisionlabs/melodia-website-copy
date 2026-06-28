/**
 * Transliterate Name API
 * POST /api/transliterate-name
 * Returns native-script spelling candidates for a recipient name in a target
 * language so the user can confirm the correct dialect before song generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { withApiLogger, ApiLoggerContext } from '@/lib/logger/api-middleware';
import { transliterateName } from '@/lib/services/llm/llm-transliterate-name';

const NAME_ALLOWED = /^[\p{L}\p{M}'\-. ]+$/u;

const transliterateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(60, 'Name is too long')
    .refine((v) => NAME_ALLOWED.test(v.trim()), {
      message: 'Name may only contain letters, spaces, hyphens, apostrophes, or periods',
    }),
  language: z.string().min(1, 'Language is required').max(100),
});

/** Rejects when the client closes the connection so we stop processing early. */
function clientDisconnected(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Client disconnected', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', () =>
      reject(new DOMException('Client disconnected', 'AbortError')),
    );
  });
}

async function handler(req: NextRequest, { logger }: ApiLoggerContext) {
  try {
    const body = await req.json();
    const { name, language } = transliterateSchema.parse(body);

    logger.info('Transliterate name request', {
      nameLength: name.length,
      language,
    });

    const result = await Promise.race([
      transliterateName({ name, language }),
      clientDisconnected(req.signal),
    ]);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Client disconnected mid-flight — no response needed
      return new NextResponse(null, { status: 499 });
    }

    if (error instanceof z.ZodError) {
      logger.warn('Validation error in transliterate-name', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Transliterate name error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to transliterate name.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('transliterate-name', handler);
export const POST = withRateLimit('name.transliterate', handlerWithLogging);
