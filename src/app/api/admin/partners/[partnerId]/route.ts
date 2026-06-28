/**
 * Partner Management API - Individual Partner
 * GET /api/admin/partners/[partnerId] - Get partner by ID
 * PUT /api/admin/partners/[partnerId] - Update partner
 * DELETE /api/admin/partners/[partnerId] - Deactivate partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { partnersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['cake_shop', 'instagram_influencer']).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  instagram_handle: z.string().optional(),
  business_address: z.string().optional(),
  active: z.boolean().optional(),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { partnerId } = await params;
    const partnerIdNum = parseInt(partnerId, 10);

    if (isNaN(partnerIdNum)) {
      return NextResponse.json(
        { error: 'Invalid partner ID' },
        { status: 400 }
      );
    }

    const partners = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, partnerIdNum))
      .limit(1);

    if (partners.length === 0) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      partner: partners[0],
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { partnerId } = await params;
    const partnerIdNum = parseInt(partnerId, 10);

    if (isNaN(partnerIdNum)) {
      return NextResponse.json(
        { error: 'Invalid partner ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updatePartnerSchema.parse(body);

    // Check if partner exists
    const existing = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, partnerIdNum))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // If slug is being updated, check for conflicts
    if (validatedData.slug && validatedData.slug !== existing[0].slug) {
      const slugConflict = await db
        .select()
        .from(partnersTable)
        .where(eq(partnersTable.slug, validatedData.slug))
        .limit(1);

      if (slugConflict.length > 0) {
        return NextResponse.json(
          { error: 'Partner with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update partner
    // Convert commission_rate from number to string for database
    const updateData: any = {
      ...validatedData,
      updated_at: new Date(),
    };

    if (validatedData.commission_rate !== undefined) {
      updateData.commission_rate = validatedData.commission_rate !== null
        ? String(validatedData.commission_rate)
        : null;
    }

    const updatedPartners = await db
      .update(partnersTable)
      .set(updateData)
      .where(eq(partnersTable.id, partnerIdNum))
      .returning();

    return NextResponse.json({
      success: true,
      partner: updatedPartners[0],
      message: 'Partner updated successfully',
    });
  } catch (error) {
    console.error('Error updating partner:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { partnerId } = await params;
    const partnerIdNum = parseInt(partnerId, 10);

    if (isNaN(partnerIdNum)) {
      return NextResponse.json(
        { error: 'Invalid partner ID' },
        { status: 400 }
      );
    }

    // Soft delete by setting active to false
    const updatedPartners = await db
      .update(partnersTable)
      .set({
        active: false,
        updated_at: new Date(),
      })
      .where(eq(partnersTable.id, partnerIdNum))
      .returning();

    if (updatedPartners.length === 0) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Partner deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating partner:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate partner' },
      { status: 500 }
    );
  }
}

