/**
 * Analytics queries - Payment and revenue analytics for admin dashboard
 * Optimized to reduce database round trips using batch queries
 */

import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../index';
import { userSongsTable, songRequestsTable, paymentsTable } from '../../schema';
import { PaymentAnalyticsData } from './types';

/**
 * Generate date range for last N days
 */
function generateDateRange(days: number = 30): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Get payment analytics for admin dashboard
 * Optimized: Batches queries where possible to reduce round trips
 */
export async function getPaymentAnalytics(): Promise<PaymentAnalyticsData> {
  try {
    // Batch related queries together using Promise.all
    const [
      paidSongsResult,
      paidRequestsResult,
      paymentStatusBreakdownResult,
      totalRevenueResult,
      recentPaymentsResult,
      dailyRevenueResult,
      dailyPaidSongsResult,
      dailyPaidRequestsResult
    ] = await Promise.all([
      // Query 1: Paid songs count and revenue
      db.select({
        count: sql<number>`COUNT(*)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
      })
        .from(userSongsTable)
        .innerJoin(paymentsTable, eq(userSongsTable.payment_id, paymentsTable.id))
        .where(eq(paymentsTable.status, 'completed')),

      // Query 2: Paid requests count and revenue
      db.select({
        count: sql<number>`COUNT(DISTINCT ${songRequestsTable.id})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
      })
        .from(songRequestsTable)
        .innerJoin(paymentsTable, eq(songRequestsTable.id, paymentsTable.song_request_id))
        .where(eq(paymentsTable.status, 'completed')),

      // Query 3: Payment status breakdown
      db.select({
        status: paymentsTable.status,
        count: sql<number>`COUNT(*)::int`,
        totalAmount: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
      })
        .from(paymentsTable)
        .groupBy(paymentsTable.status),

      // Query 4: Total revenue (all completed payments)
      db.select({
        totalRevenue: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
        count: sql<number>`COUNT(*)::int`,
      })
        .from(paymentsTable)
        .where(eq(paymentsTable.status, 'completed')),

      // Query 5: Recent payments (last 30 days)
      db.select({
        count: sql<number>`COUNT(*)::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
      })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.status, 'completed'),
            sql`${paymentsTable.created_at} >= NOW() - INTERVAL '30 days'`
          )
        ),

      // Query 6: Daily revenue breakdown (last 30 days)
      db.select({
        date: sql<string>`DATE(${paymentsTable.created_at})::text`,
        revenue: sql<string>`COALESCE(SUM(${paymentsTable.amount})::text, '0')`,
        count: sql<number>`COUNT(*)::int`,
      })
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.status, 'completed'),
            sql`${paymentsTable.created_at} >= NOW() - INTERVAL '30 days'`
          )
        )
        .groupBy(sql`DATE(${paymentsTable.created_at})`)
        .orderBy(sql`DATE(${paymentsTable.created_at}) ASC`),

      // Query 7: Daily paid songs count (last 30 days)
      db.select({
        date: sql<string>`DATE(${userSongsTable.created_at})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
        .from(userSongsTable)
        .innerJoin(paymentsTable, eq(userSongsTable.payment_id, paymentsTable.id))
        .where(
          and(
            eq(paymentsTable.status, 'completed'),
            sql`${userSongsTable.created_at} >= NOW() - INTERVAL '30 days'`
          )
        )
        .groupBy(sql`DATE(${userSongsTable.created_at})`)
        .orderBy(sql`DATE(${userSongsTable.created_at}) ASC`),

      // Query 8: Daily paid requests count (last 30 days)
      db.select({
        date: sql<string>`DATE(${songRequestsTable.created_at})::text`,
        count: sql<number>`COUNT(DISTINCT ${songRequestsTable.id})::int`,
      })
        .from(songRequestsTable)
        .innerJoin(paymentsTable, eq(songRequestsTable.id, paymentsTable.song_request_id))
        .where(
          and(
            eq(paymentsTable.status, 'completed'),
            sql`${songRequestsTable.created_at} >= NOW() - INTERVAL '30 days'`
          )
        )
        .groupBy(sql`DATE(${songRequestsTable.created_at})`)
        .orderBy(sql`DATE(${songRequestsTable.created_at}) ASC`),
    ]);

    // Extract results
    const paidSongs = paidSongsResult[0] || { count: 0, totalRevenue: '0' };
    const paidRequests = paidRequestsResult[0] || { count: 0, totalRevenue: '0' };
    const totalRevenue = totalRevenueResult[0] || { totalRevenue: '0', count: 0 };
    const recentPayments = recentPaymentsResult[0] || { count: 0, totalRevenue: '0' };

    // Build daily data maps
    const allDates = generateDateRange(30);
    const dailyRevenueMap = new Map(
      dailyRevenueResult.map((item) => [
        item.date,
        { revenue: parseFloat(item.revenue || '0'), count: item.count }
      ])
    );
    const dailyPaidSongsMap = new Map(
      dailyPaidSongsResult.map((item) => [item.date, item.count])
    );
    const dailyPaidRequestsMap = new Map(
      dailyPaidRequestsResult.map((item) => [item.date, item.count])
    );

    // Fill in missing dates
    const dailyData = allDates.map((date) => ({
      date,
      revenue: dailyRevenueMap.get(date)?.revenue || 0,
      paymentCount: dailyRevenueMap.get(date)?.count || 0,
      paidSongs: dailyPaidSongsMap.get(date) || 0,
      paidRequests: dailyPaidRequestsMap.get(date) || 0,
    }));

    return {
      paidSongs: {
        count: paidSongs.count,
        revenue: parseFloat(paidSongs.totalRevenue || '0'),
      },
      paidRequests: {
        count: paidRequests.count,
        revenue: parseFloat(paidRequests.totalRevenue || '0'),
      },
      totalRevenue: parseFloat(totalRevenue.totalRevenue || '0'),
      totalCompletedPayments: totalRevenue.count,
      recentPayments: {
        count: recentPayments.count,
        revenue: parseFloat(recentPayments.totalRevenue || '0'),
      },
      paymentStatusBreakdown: paymentStatusBreakdownResult.map((item) => ({
        status: item.status || 'unknown',
        count: item.count,
        totalAmount: parseFloat(item.totalAmount || '0'),
      })),
      dailyData,
    };
  } catch (error) {
    console.error('Error fetching payment analytics:', error);

    // Return empty data structure on error
    const allDates = generateDateRange(30);
    return {
      paidSongs: { count: 0, revenue: 0 },
      paidRequests: { count: 0, revenue: 0 },
      totalRevenue: 0,
      totalCompletedPayments: 0,
      recentPayments: { count: 0, revenue: 0 },
      paymentStatusBreakdown: [],
      dailyData: allDates.map((date) => ({
        date,
        revenue: 0,
        paymentCount: 0,
        paidSongs: 0,
        paidRequests: 0,
      })),
    };
  }
}

