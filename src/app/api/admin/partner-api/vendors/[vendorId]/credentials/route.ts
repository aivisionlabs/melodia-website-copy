import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  partnerApiCredentialsTable,
  partnerApiVendorsTable,
} from '@/lib/db/schema';
import { withApiLogger } from '@/lib/logger/api-middleware';
import { generatePartnerApiKey } from '@/lib/partner-api/security';

export const runtime = 'nodejs';

const createCredentialSchema = z.object({
  name: z.string().min(1).max(200),
  expires_at: z.string().datetime().optional(),
});

async function requireAdmin(logger: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin-auth')?.value === 'true';

  if (!isAuthenticated) {
    logger.warn('Unauthorized admin partner-api credentials access');
    return false;
  }

  return true;
}

async function getHandler(
  _req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await (ctx.params ?? Promise.resolve({ vendorId: '' }));
    const vendorIdNum = Number.parseInt(String(vendorId), 10);
    if (!Number.isFinite(vendorIdNum)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const vendor = await db
      .select({ id: partnerApiVendorsTable.id })
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, vendorIdNum))
      .limit(1);

    if (vendor.length === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const credentials = await db
      .select({
        id: partnerApiCredentialsTable.id,
        name: partnerApiCredentialsTable.name,
        key_prefix: partnerApiCredentialsTable.key_prefix,
        last_used_at: partnerApiCredentialsTable.last_used_at,
        expires_at: partnerApiCredentialsTable.expires_at,
        active: partnerApiCredentialsTable.active,
        created_at: partnerApiCredentialsTable.created_at,
      })
      .from(partnerApiCredentialsTable)
      .where(eq(partnerApiCredentialsTable.vendor_id, vendorIdNum))
      .orderBy(desc(partnerApiCredentialsTable.created_at));

    ctx.logger.info('Admin listed partner API credentials', {
      vendorId: vendorIdNum,
      count: credentials.length,
    });

    return NextResponse.json({
      success: true,
      credentials,
    });
  } catch (error) {
    ctx.logger.error('Failed to list partner API credentials', error as any);
    return NextResponse.json(
      { error: 'Failed to list credentials' },
      { status: 500 },
    );
  }
}

async function postHandler(
  req: NextRequest,
  ctx: { logger: any; params?: Promise<{ vendorId: string }> },
) {
  try {
    if (!(await requireAdmin(ctx.logger))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId } = await (ctx.params ?? Promise.resolve({ vendorId: '' }));
    const vendorIdNum = Number.parseInt(String(vendorId), 10);
    if (!Number.isFinite(vendorIdNum)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const vendor = await db
      .select({ id: partnerApiVendorsTable.id })
      .from(partnerApiVendorsTable)
      .where(eq(partnerApiVendorsTable.id, vendorIdNum))
      .limit(1);

    if (vendor.length === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const { apiKey, keyHash, keyPrefix } = generatePartnerApiKey();
    const expiresAt = parsed.data.expires_at ? new Date(parsed.data.expires_at) : null;

    const [credential] = await db
      .insert(partnerApiCredentialsTable)
      .values({
        vendor_id: vendorIdNum,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: parsed.data.name.trim(),
        expires_at: expiresAt,
        active: true,
      })
      .returning({
        id: partnerApiCredentialsTable.id,
        name: partnerApiCredentialsTable.name,
        key_prefix: partnerApiCredentialsTable.key_prefix,
        expires_at: partnerApiCredentialsTable.expires_at,
        active: partnerApiCredentialsTable.active,
        created_at: partnerApiCredentialsTable.created_at,
      });

    ctx.logger.info('Admin generated partner API credential', {
      vendorId: vendorIdNum,
      credentialId: credential.id,
      keyPrefix: credential.key_prefix,
    });

    return NextResponse.json({
      success: true,
      credential,
      api_key: apiKey,
      message: 'API key generated. This value is shown only once.',
    });
  } catch (error) {
    ctx.logger.error('Failed to create partner API credential', error as any);
    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 },
    );
  }
}

export const GET = withApiLogger('admin-partner-api-credentials-list', getHandler);
export const POST = withApiLogger('admin-partner-api-credentials-create', postHandler);
