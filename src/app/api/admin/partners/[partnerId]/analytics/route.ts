/**
 * Partner Analytics API
 * GET /api/admin/partners/[partnerId]/analytics
 * Returns analytics data for a specific partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  partnerVisitsTable,
  partnersTable,
  songRequestsTable,
  paymentsTable
} from '@/lib/db/schema';
import { eq, and, gte, lte, count, sum, sql } from 'drizzle-orm';

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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

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

    // Build date filter conditions
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(partnerVisitsTable.first_visit_at, new Date(startDate)));
    }
    if (endDate) {
      // Add one day to end date to include the entire end date
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      dateConditions.push(lte(partnerVisitsTable.first_visit_at, endDateObj));
    }

    // Get visit metrics
    const visitMetrics = await db
      .select({
        total_visits: count(),
        unique_visitors: sql<number>`
          COUNT(DISTINCT ${partnerVisitsTable.anonymous_user_id}) +
          COUNT(DISTINCT CASE WHEN ${partnerVisitsTable.user_id} IS NOT NULL THEN ${partnerVisitsTable.user_id} END)
        `,
        conversions: sql<number>`
          COUNT(CASE WHEN ${partnerVisitsTable.converted} = true THEN 1 END)
        `,
      })
      .from(partnerVisitsTable)
      .where(
        and(
          eq(partnerVisitsTable.partner_id, partnerIdNum),
          ...dateConditions
        )
      );

    // Get revenue metrics from completed payments
    const revenueMetrics = await db
      .select({
        total_revenue: sum(paymentsTable.amount),
        total_payments: count(),
      })
      .from(partnerVisitsTable)
      .innerJoin(
        songRequestsTable,
        eq(partnerVisitsTable.id, songRequestsTable.partner_visit_id)
      )
      .innerJoin(
        paymentsTable,
        eq(songRequestsTable.id, paymentsTable.song_request_id)
      )
      .where(
        and(
          eq(partnerVisitsTable.partner_id, partnerIdNum),
          eq(paymentsTable.status, 'completed'),
          ...dateConditions
        )
      );

    const totalVisits = Number(visitMetrics[0]?.total_visits || 0);
    const uniqueVisitors = Number(visitMetrics[0]?.unique_visitors || 0);
    const conversions = Number(visitMetrics[0]?.conversions || 0);
    const conversionRate = totalVisits > 0
      ? Number(((conversions / totalVisits) * 100).toFixed(2))
      : 0;
    const totalRevenue = Number(revenueMetrics[0]?.total_revenue || 0);
    const totalPayments = Number(revenueMetrics[0]?.total_payments || 0);
    const averageOrderValue = totalPayments > 0
      ? Number((totalRevenue / totalPayments).toFixed(2))
      : 0;
    const revenuePerVisit = totalVisits > 0
      ? Number((totalRevenue / totalVisits).toFixed(2))
      : 0;

    // Get daily visit breakdown (last 30 days if no date range specified)
    const dailyBreakdown = await db
      .select({
        date: sql<string>`DATE(${partnerVisitsTable.first_visit_at})`,
        visits: count(),
        conversions: sql<number>`
          COUNT(CASE WHEN ${partnerVisitsTable.converted} = true THEN 1 END)
        `,
      })
      .from(partnerVisitsTable)
      .where(
        and(
          eq(partnerVisitsTable.partner_id, partnerIdNum),
          ...dateConditions
        )
      )
      .groupBy(sql`DATE(${partnerVisitsTable.first_visit_at})`)
      .orderBy(sql`DATE(${partnerVisitsTable.first_visit_at}) DESC`)
      .limit(30);

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        slug: partner.slug,
        active: partner.active,
      },
      metrics: {
        total_visits: totalVisits,
        unique_visitors: uniqueVisitors,
        conversions: conversions,
        conversion_rate: conversionRate,
        total_revenue: totalRevenue,
        total_payments: totalPayments,
        average_order_value: averageOrderValue,
        revenue_per_visit: revenuePerVisit,
      },
      date_range: {
        start_date: startDate || null,
        end_date: endDate || null,
      },
      daily_breakdown: dailyBreakdown.map((day) => ({
        date: day.date,
        visits: Number(day.visits),
        conversions: Number(day.conversions),
      })),
    });
  } catch (error) {
    console.error('Partner analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

