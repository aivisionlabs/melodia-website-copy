/**
 * UTM Tracking API
 * POST /api/track-utm
 * Tracks UTM parameters and creates/updates partner visit records
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partnerVisitsTable, partnersTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAnonymousCookie } from '@/lib/auth/cookies';
import { getCurrentUser } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      landing_page,
    } = body;

    // Get user identifiers
    const user = await getCurrentUser(req);
    const anonymousId = await getAnonymousCookie();

    // Get IP address and user agent
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Find partner by UTM source (if it's a partner slug)
    let partnerId: number | null = null;
    if (utm_source) {
      try {
        const partners = await db
          .select()
          .from(partnersTable)
          .where(eq(partnersTable.slug, utm_source))
          .limit(1);

        if (partners.length > 0 && partners[0].active) {
          partnerId = partners[0].id;
        }
      } catch (error) {
        // Partner lookup failed, continue without partner_id
        console.error('Partner lookup error:', error);
      }
    }

    // Check if visit already exists for this anonymous user with same UTM params
    let existingVisit = null;
    if (anonymousId) {
      try {
        const visits = await db
          .select()
          .from(partnerVisitsTable)
          .where(
            and(
              eq(partnerVisitsTable.anonymous_user_id, anonymousId),
              utm_source ? eq(partnerVisitsTable.utm_source, utm_source) : undefined,
              utm_campaign ? eq(partnerVisitsTable.utm_campaign, utm_campaign) : undefined
            )
          )
          .limit(1);

        if (visits.length > 0) {
          existingVisit = visits[0];
        }
      } catch (error) {
        console.error('Visit lookup error:', error);
      }
    }

    if (existingVisit) {
      // Update existing visit
      try {
        await db
          .update(partnerVisitsTable)
          .set({
            last_visit_at: new Date(),
            visit_count: (existingVisit.visit_count || 1) + 1,
            user_id: user?.id ? parseInt(user.id) : existingVisit.user_id,
            partner_id: partnerId || existingVisit.partner_id,
          })
          .where(eq(partnerVisitsTable.id, existingVisit.id));

        return NextResponse.json({
          success: true,
          visit_id: existingVisit.id,
          is_new: false
        });
      } catch (error) {
        console.error('Visit update error:', error);
        return NextResponse.json(
          { error: 'Failed to update visit' },
          { status: 500 }
        );
      }
    } else {
      // Create new visit
      try {
        const newVisits = await db
          .insert(partnerVisitsTable)
          .values({
            partner_id: partnerId || undefined,
            anonymous_user_id: anonymousId || undefined,
            user_id: user?.id ? parseInt(user.id) : undefined,
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            utm_content: utm_content || null,
            utm_term: utm_term || null,
            referrer: referrer || null,
            landing_page: landing_page || null,
            ip_address: ipAddress,
            user_agent: userAgent,
          })
          .returning();

        return NextResponse.json({
          success: true,
          visit_id: newVisits[0].id,
          is_new: true
        });
      } catch (error) {
        console.error('Visit creation error:', error);
        return NextResponse.json(
          { error: 'Failed to create visit' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('UTM tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track UTM visit' },
      { status: 500 }
    );
  }
}

