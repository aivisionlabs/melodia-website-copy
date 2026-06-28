"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsProps {
  analytics: {
    paidSongs: {
      count: number;
      revenue: number;
    };
    paidRequests: {
      count: number;
      revenue: number;
    };
    totalRevenue: number;
    totalCompletedPayments: number;
    recentPayments: {
      count: number;
      revenue: number;
    };
    paymentStatusBreakdown: Array<{
      status: string;
      count: number;
      totalAmount: number;
    }>;
    dailyData: Array<{
      date: string;
      revenue: number;
      paymentCount: number;
      paidSongs: number;
      paidRequests: number;
    }>;
  };
}

export default function Analytics({ analytics }: AnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "refunded":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Format daily data for charts
  const chartData = analytics.dailyData.map((item) => ({
    ...item,
    dateLabel: formatDate(item.date),
  }));

  // Tooltip component
  const CardTooltip = ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: string;
  }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className="absolute z-[100] bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-white text-xs rounded-lg shadow-2xl max-w-xs pointer-events-none bg-white">
            <div className="whitespace-normal text-center leading-relaxed">
              {content}
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div
                className="border-4 border-transparent"
                style={{ borderTopColor: "rgba(17, 24, 39, 0.95)" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-white">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <CardTooltip content="Total revenue from all completed payments across all time. This includes payments for both songs and song requests.">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-help transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics.totalRevenue)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatNumber(analytics.totalCompletedPayments)} completed
              payments
            </p>
          </div>
        </CardTooltip>

        {/* Paid Songs */}
        <CardTooltip content="Total number of user songs that have been paid for. These are songs that have been generated and have completed payment transactions.">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-help transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Songs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(analytics.paidSongs.count)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatCurrency(analytics.paidSongs.revenue)} revenue
            </p>
          </div>
        </CardTooltip>

        {/* Paid Requests */}
        <CardTooltip content="Total number of song requests that have been paid for. This includes all requests where payment has been completed, regardless of whether the song has been generated yet.">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-help transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Paid Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(analytics.paidRequests.count)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatCurrency(analytics.paidRequests.revenue)} revenue
            </p>
          </div>
        </CardTooltip>

        {/* Recent Payments (30 days) */}
        <CardTooltip content="Revenue and payment count from the last 30 days. This shows recent payment activity and helps track current business performance trends.">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 cursor-help transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Last 30 Days
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics.recentPayments.revenue)}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatNumber(analytics.recentPayments.count)} payments
            </p>
          </div>
        </CardTooltip>
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Revenue (Last 30 Days)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Revenue generated per day from completed payments
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateLabel"
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                name="Revenue (₹)"
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Paid Songs and Requests Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Paid Songs & Requests (Last 30 Days)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Count of paid songs and song requests per day
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateLabel"
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="paidSongs"
                fill="#3b82f6"
                name="Paid Songs"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="paidRequests"
                fill="#8b5cf6"
                name="Paid Requests"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Payment Count Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Payment Count (Last 30 Days)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Number of completed payments per day
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateLabel"
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="paymentCount"
                fill="#f59e0b"
                name="Payments"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Status Breakdown */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment Status Breakdown
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Overview of all payment statuses
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.paymentStatusBreakdown.map((item) => (
              <div
                key={item.status}
                className={`border rounded-lg p-4 ${getStatusColor(item.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium capitalize">
                    {item.status}
                  </p>
                </div>
                <p className="text-2xl font-bold">{formatNumber(item.count)}</p>
                <p className="text-xs mt-1 opacity-75">
                  {formatCurrency(item.totalAmount)}
                </p>
              </div>
            ))}
            {analytics.paymentStatusBreakdown.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No payment data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
