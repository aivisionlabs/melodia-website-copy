import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partnerApiCredentialsTable } from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';

export const runtime = 'nodejs';

async function requireAdmin(logger: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

  if (!isAuthenticated) {
    logger.warn('Unauthorized admin partner-api credential deactivation access');
    return false;
  }

  return true;
}

async function deleteHandler(
  _req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string; credentialId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId, credentialId } = await (
      ctx.params ?? Promise.resolve({ vendorId: '', credentialId: '' })
    );

    const vendorIdNum = Number.parseInt(String(vendorId), 10);
    const credentialIdNum = Number.parseInt(String(credentialId), 10);

    if (!Number.isFinite(vendorIdNum) || !Number.isFinite(credentialIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const [updatedCredential] = await db
      .update(partnerApiCredentialsTable)
      .set({ active: false })
      .where(
        and(
          eq(partnerApiCredentialsTable.id, credentialIdNum),
          eq(partnerApiCredentialsTable.vendor_id, vendorIdNum),
        ),
      )
      .returning({
        id: partnerApiCredentialsTable.id,
        active: partnerApiCredentialsTable.active,
      });

    if (!updatedCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 },
      );
    }

    ctx.logger.info('Admin deactivated partner API credential', {
      vendorId: vendorIdNum,
      credentialId: credentialIdNum,
    });

    return NextResponse.json({
      success: true,
      message: 'Credential deactivated successfully',
    });
  } catch (error) {
    ctx.logger.error('Failed to deactivate partner API credential', error as any);
    return NextResponse.json(
      { error: 'Failed to deactivate credential' },
      { status: 500 },
    );
  }
}

export const DELETE = withApiLogger(
  'admin-partner-api-credential-deactivate',
  deleteHandler,
);
