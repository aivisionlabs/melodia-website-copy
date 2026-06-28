/**
 * Admin: Set per-category promotion tag for a templated song
 * PATCH /api/admin/templated-songs/promotion-tag
 * Body: { templatedSongId, categoryId, setting: 'auto' | 'none' | 'trending' | 'most_preferred' | 'new' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { templatedSongCategoriesTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { z } from 'zod';
import {
  adminSettingToPromotionFields,
  promotionTagToAdminSetting,
  TEMPLATED_PROMOTION_TAG_VALUES,
} from '@/lib/templated-songs/promotion-tag';

const patchSchema = z.object({
  templatedSongId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  setting: z.enum([
    'auto',
    'none',
    ...TEMPLATED_PROMOTION_TAG_VALUES,
  ]),
});

async function patchHandler(req: NextRequest, { logger }: { logger: any }) {
  if (req.method !== 'PATCH') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin-auth')?.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { templatedSongId, categoryId, setting } = parsed.data;
    const fields = adminSettingToPromotionFields(setting);

    const [updated] = await db
      .update(templatedSongCategoriesTable)
      .set({
        promotion_tag: fields.promotion_tag,
        suppress_auto_new: fields.suppress_auto_new,
      })
      .where(
        and(
          eq(templatedSongCategoriesTable.templated_song_id, templatedSongId),
          eq(templatedSongCategoriesTable.category_id, categoryId)
        )
      )
      .returning({
        promotion_tag: templatedSongCategoriesTable.promotion_tag,
        suppress_auto_new: templatedSongCategoriesTable.suppress_auto_new,
      });

    if (!updated) {
      logger.warn('Admin promotion tag: junction not found', {
        templatedSongId,
        categoryId,
      });
      return NextResponse.json(
        { error: 'Template is not assigned to this category' },
        { status: 404 }
      );
    }

    const adminSetting = promotionTagToAdminSetting({
      promotionTag: updated.promotion_tag,
      suppressAutoNew: updated.suppress_auto_new,
    });

    logger.info('Admin updated templated song promotion tag', {
      templatedSongId,
      categoryId,
      setting,
      adminSetting,
    });

    return NextResponse.json({
      success: true,
      adminSetting,
      promotion_tag: updated.promotion_tag,
      suppress_auto_new: updated.suppress_auto_new,
    });
  } catch (error) {
    logger.error('Admin update templated song promotion tag error', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update promotion tag',
      },
      { status: 500 }
    );
  }
}

export const PATCH = withApiLogger(
  'admin-templated-songs-promotion-tag',
  patchHandler
);
