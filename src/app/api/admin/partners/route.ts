/**
 * Partner Management API
 * GET /api/admin/partners - List all partners
 * POST /api/admin/partners - Create new partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { partnersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cake_shop', 'instagram_influencer'], {
    errorMap: () => ({ message: 'Type must be cake_shop or instagram_influencer' }),
  }),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  instagram_handle: z.string().optional(),
  business_address: z.string().optional(),
  active: z.boolean().default(true),
  commission_rate: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

// Helper function to check admin authentication
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = db.select().from(partnersTable);

    if (activeOnly) {
      query = query.where(eq(partnersTable.active, true)) as any;
    }

    const partners = await query.orderBy(partnersTable.created_at);

    return NextResponse.json({
      success: true,
      partners,
      total: partners.length,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const body = await req.json();
    const validatedData = createPartnerSchema.parse(body);

    // Check if slug already exists
    const existing = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.slug, validatedData.slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Partner with this slug already exists' },
        { status: 400 }
      );
    }

    // Create new partner
    const newPartners = await db
      .insert(partnersTable)
      .values({
        name: validatedData.name,
        type: validatedData.type,
        slug: validatedData.slug,
        contact_name: validatedData.contact_name || null,
        contact_email: validatedData.contact_email || null,
        contact_phone: validatedData.contact_phone || null,
        instagram_handle: validatedData.instagram_handle || null,
        business_address: validatedData.business_address || null,
        active: validatedData.active,
        commission_rate: validatedData.commission_rate ? String(validatedData.commission_rate) : null,
        metadata: validatedData.metadata || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      partner: newPartners[0],
      message: 'Partner created successfully',
    });
  } catch (error) {
    console.error('Error creating partner:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}

