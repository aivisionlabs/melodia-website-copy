/**
 * Generate song from templated song (public)
 * POST /api/templated-songs/generate
 * Body: { templateId: number, name: string }
 * Creates templated_song_instance, calls Suno with persona + replaced lyrics, returns instance slug/taskId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anonymousUsersTable } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getAnonymousCookie, setAnonymousCookie } from '@/lib/auth/cookies';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { logStructuredError } from '@/lib/logger/utils';
import { withRateLimit } from '@/lib/rate-limiting/middleware';
import { z } from 'zod';
import { generateTemplatedInstanceForIdentity } from '@/lib/services/templated-song-generation-service';

const bodySchema = z.object({
  templateId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(200).trim(),
});

async function handler(req: NextRequest, context: { logger: any; requestId?: string }) {
  const logger = context.logger;

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Validation error in templated-songs generate', { errors: parsed.error.errors });
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { templateId, name } = parsed.data;

    const user = await getCurrentUser(req);
    let anonymousId: string | undefined = await getAnonymousCookie();

    if (!user && !anonymousId) {
      try {
        const [newAnonymous] = await db
          .insert(anonymousUsersTable)
          .values({ id: sql`gen_random_uuid()` })
          .returning();
        if (newAnonymous?.id) {
          anonymousId = newAnonymous.id;
          await setAnonymousCookie(anonymousId);
        }
      } catch (err) {
        logger.error('Failed to create anonymous user for templated generate', err);
        return NextResponse.json(
          { error: 'Failed to create session. Please enable cookies.' },
          { status: 500 }
        );
      }
    }

    const generated = await generateTemplatedInstanceForIdentity({
      templateId,
      name,
      userId: user ? parseInt(String(user.id), 10) : null,
      anonymousUserId: anonymousId ?? null,
      logger,
    });

    return NextResponse.json({
      success: true,
      instanceId: generated.instanceId,
      slug: generated.slug,
      taskId: generated.taskId,
    });
  } catch (error) {
    logStructuredError(error, {
      operation: 'templated-songs-generate',
      requestId: context.requestId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate song.' },
      { status: 500 }
    );
  }
}

const handlerWithLogging = withApiLogger('templated-songs-generate', handler);
export const POST = withRateLimit('templated.generate', handlerWithLogging);
