/**
 * QR Code Generator API
 * GET /api/admin/partners/[partnerId]/qr-code
 * Generates a QR code for a partner with UTM parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { partnersTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getPartnerUTMMedium } from '@/lib/constants';

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

    // Get partner
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

    const partner = partners[0];

    if (!partner.active) {
      return NextResponse.json(
        { error: 'Partner is not active' },
        { status: 400 }
      );
    }

    // Build URL with UTM parameters
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://melodia-songs.com';
    const utmMedium = getPartnerUTMMedium(partner.type as 'cake_shop' | 'instagram_influencer');
    const qrUrl = `${baseUrl}/?utm_source=${partner.slug}&utm_medium=${utmMedium}&utm_campaign=partner_referral`;

    // Generate QR code with logo
    // Note: Requires 'qrcode' package: npm install qrcode @types/qrcode
    let qrCodeDataUrl: string;

    try {
      // Dynamic import to handle case where package might not be installed
      const QRCode = (await import('qrcode')).default;

      // Read the logo file
      const logoPath = join(process.cwd(), 'public', 'images', 'melodia-logo-transparent.png');
      let logoBuffer: Buffer | null = null;

      try {
        logoBuffer = await readFile(logoPath);
      } catch (logoError) {
        console.warn('Logo file not found, generating QR code without logo:', logoError);
        // Continue without logo if file not found
      }

      // Generate QR code with logo in center
      if (logoBuffer) {
        // Use toCanvas method to composite logo
        const { createCanvas, loadImage } = await import('canvas');

        // Create a canvas for the QR code
        const qrCanvas = createCanvas(300, 300);

        // Generate QR code on the canvas
        await QRCode.toCanvas(qrCanvas, qrUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        // Load logo image
        const logoImage = await loadImage(logoBuffer);

        // Calculate logo size (20% of QR code size)
        const logoSize = Math.min(qrCanvas.width, qrCanvas.height) * 0.2;
        const logoX = (qrCanvas.width - logoSize) / 2;
        const logoY = (qrCanvas.height - logoSize) / 2;

        // Get 2D context and draw logo
        const ctx = qrCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw white background square for logo (with padding)
        const padding = logoSize * 0.1;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2);

        // Draw logo (cast to any to handle canvas Image type compatibility)
        ctx.drawImage(logoImage as any, logoX, logoY, logoSize, logoSize);

        // Convert canvas to data URL
        qrCodeDataUrl = qrCanvas.toDataURL('image/png');
      } else {
        // Generate QR code without logo
        qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      }
    } catch (error) {
      // If qrcode package is not installed, return URL only
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        console.warn('QRCode or canvas package not installed. Install with: npm install qrcode canvas @types/qrcode');
        return NextResponse.json({
          partner_id: partner.id,
          partner_name: partner.name,
          partner_slug: partner.slug,
          qr_url: qrUrl,
          qr_code_image: null,
          error: 'QR code generation requires qrcode and canvas packages. Install with: npm install qrcode canvas @types/qrcode',
        });
      }
      throw error;
    }

    return NextResponse.json({
      partner_id: partner.id,
      partner_name: partner.name,
      partner_slug: partner.slug,
      qr_url: qrUrl,
      qr_code_image: qrCodeDataUrl,
    }, {
      headers: {
        // QR codes are deterministic for a partner unless base URL / partner activation changes.
        // Cache at CDN to avoid CPU-heavy canvas/PNG generation on repeat admin loads.
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

