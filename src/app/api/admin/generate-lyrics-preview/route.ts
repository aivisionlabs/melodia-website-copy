/**
 * Admin-only API: Generate lyrics and music style from form data (preview, no DB).
 * POST /api/admin/generate-lyrics-preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { generateLyrics } from '@/lib/services/llm/llm-lyrics-operation';
import type { SongFormData } from '@/lib/services/llm/llm-lyrics-operation';
import { withApiLogger, createApiTimer } from '@/lib/logger/api-middleware';
import {
  getReferenceLyricsForPersona,
  getReferenceLyricsForLibrarySongId,
} from '@/lib/persona-reference-lyrics';

export const dynamic = 'force-dynamic';
// LLM lyrics generation can take 60–180s; allow up to 5 min (Vercel Pro max)
export const maxDuration = 300;

const bodySchema = z.object({
  recipientDetails: z.string().min(2, 'Recipient details (name, relationship) required'),
  languages: z.string().min(1, 'At least one language required'),
  occassion: z.string().optional(),
  songStory: z.string().optional(),
  mood: z.union([z.string(), z.array(z.string())]).optional(),
  /** Library song id from persona template carousel; reference lyrics for structure (create-page flow) */
  sourceSongId: z.number().int().positive().optional(),
  personaId: z.number().int().positive().optional(),
});

export const POST = withApiLogger(
  'admin-generate-lyrics-preview',
  async (req: NextRequest, ctx: { logger: any; requestId: string; startTime: number }) => {
    const timer = createApiTimer(ctx);

    try {
      timer.mark('auth_start');
      const cookieStore = await cookies();
      const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';
      if (!isAuthenticated) {
        ctx.logger.warn('Unauthorized admin generate-lyrics-preview access');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      timer.mark('auth_end');

      const body = await req.json();
      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        ctx.logger.warn('Invalid admin generate-lyrics-preview body', {
          errors: parsed.error.flatten(),
        });
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { recipientDetails, languages, occassion, songStory, mood, personaId, sourceSongId } = parsed.data;

      const formData: SongFormData = {
        recipientDetails,
        languages: languages || 'English',
        songStory: songStory ?? '',
        occassion: occassion ?? '',
        mood: mood == null ? [] : Array.isArray(mood) ? mood : mood.split(',').map((s: string) => s.trim()).filter(Boolean),
        outputScript: 'native',
      };

      let sourceSongLyrics: string | null = null;
      if (sourceSongId != null) {
        sourceSongLyrics = await getReferenceLyricsForLibrarySongId(sourceSongId);
        if (sourceSongLyrics) {
          formData.sourceSongLyrics = sourceSongLyrics;
          formData.isPersonaBased = true;
          ctx.logger.info('Admin lyrics preview: using source library song lyrics for structure', {
            sourceSongId,
            referenceLyricsLength: sourceSongLyrics.length,
          });
        } else {
          ctx.logger.warn('Admin lyrics preview: source song has no linked lyrics, falling back to persona or none', {
            sourceSongId,
            personaId,
          });
        }
      }
      if (!sourceSongLyrics && personaId != null) {
        timer.mark('persona_resolve_start');
        sourceSongLyrics = await getReferenceLyricsForPersona(personaId);
        timer.mark('persona_resolve_end');
        if (sourceSongLyrics) {
          formData.sourceSongLyrics = sourceSongLyrics;
          formData.isPersonaBased = true;
          ctx.logger.info('Admin lyrics preview: using persona reference lyrics for structure', {
            personaId,
            referenceLyricsLength: sourceSongLyrics.length,
          });
        } else {
          ctx.logger.warn('Admin lyrics preview: persona has no linked song or lyrics, proceeding without structure matching', {
            personaId,
          });
        }
      }

      ctx.logger.info('Admin lyrics preview generation started', {
        recipientDetails: formData.recipientDetails,
        languages: formData.languages,
        hasOccasion: !!formData.occassion,
        hasSongStory: !!formData.songStory,
        moodCount: Array.isArray(formData.mood) ? formData.mood.length : 0,
        hasPersonaId: personaId != null,
        hasSourceSongId: sourceSongId != null,
        hasReferenceLyrics: !!sourceSongLyrics,
      });

      timer.mark('generate_start');
      const result = await generateLyrics(formData);
      timer.mark('generate_end');

      ctx.logger.info('Admin lyrics preview generation completed', {
        hasTitle: !!result.title,
        lyricsLength: result.lyrics?.length ?? 0,
        hasMusicStyle: !!result.musicStyle,
        duration_ms: Date.now() - ctx.startTime,
      });
      timer.logSummary();

      return NextResponse.json({
        success: true,
        title: result.title ?? null,
        lyrics: result.lyrics ?? null,
        musicStyle: result.musicStyle ?? null,
        description: result.description ?? null,
        language: result.language ?? null,
      });
    } catch (error) {
      ctx.logger.error('Admin generate-lyrics-preview error', error as Error);
      timer.logSummary();

      const message = error instanceof Error ? error.message : String(error);
      const isTimeout =
        message.includes('timeout') ||
        message.includes('aborted') ||
        (error instanceof Error && error.name === 'AbortError');

      if (message.includes('Unauthorized') || message.includes('Invalid input')) {
        return NextResponse.json(
          { error: message },
          { status: message.includes('Unauthorized') ? 401 : 400 }
        );
      }
      if (isTimeout) {
        return NextResponse.json(
          {
            error:
              'Lyrics generation timed out. The model may be slow. Try again',
          },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to generate lyrics and music style. Please try again.' },
        { status: 500 }
      );
    }
  }
);
