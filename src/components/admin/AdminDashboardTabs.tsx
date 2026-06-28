"use client";

import SongList from "@/components/SongList";
import SongRequestList from "@/components/SongRequestList";
import Analytics from "@/components/admin/Analytics";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import UserSongList from "@/components/admin/UserSongList";
import {
  SelectChangeRequest,
  SelectSongRequest
} from "@/lib/db/schema";
import { Song } from "@/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TabType = "requests" | "songs" | "user-songs" | "analytics";

type RequestData = Array<
  SelectSongRequest & {
    song?: {
      id: number;
      slug: string | null;
      status: string | null;
      kind: "user_song" | "library_song";
    } | null;
    linkedSongs?: Array<{ id: number; title: string; slug: string }>;
    isUserSong?: boolean;
    package?: {
      name: string;
      slug: string;
      price: string | number;
      expert_created: boolean;
    } | null;
    payment?: {
      id: number;
      status: string;
      amount: string | number;
      created_at: Date | string;
      payment_id: string | null;
      order_id: string | null;
    } | null;
    latestLyricsDraft?: {
      music_style: string | null;
      has_lyrics: boolean;
    } | null;
    changeRequests: SelectChangeRequest[];
  }
>;

type UserSongData = Array<{
  id: number;
  slug: string;
  title: string;
  status: string;
  created_at: Date | string;
  recipient_details: string;
  occasion: string | null;
  languages: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  is_anonymous: boolean;
  variant_count: number;
  music_style: string | null;
  is_converted_to_library?: boolean;
  payment_id: string | null;
  order_id: string | null;
}>;

type AnalyticsData = {
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

export default function AdminDashboardTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Helper function to get tab from query params
  const getTabFromParams = useCallback((): TabType => {
    const tabParam = searchParams.get("tab");
    const validTabs: TabType[] = [
      "requests",
      "songs",
      "user-songs",
      "analytics",
    ];
    return validTabs.includes(tabParam as TabType)
      ? (tabParam as TabType)
      : "requests";
  }, [searchParams]);

  // Always initialize to "requests" to match server render (prevents hydration mismatch)
  const [activeTab, setActiveTab] = useState<TabType>("requests");

  // Separate states for each tab's search and pagination
  const [songSearchQuery, setSongSearchQuery] = useState<string>("");
  const [debouncedSongSearchQuery, setDebouncedSongSearchQuery] = useState<string>("");
  const [songCategoryFilter, setSongCategoryFilter] = useState<string>("");
  const [songSortBy, setSongSortBy] = useState<string>("newest");
  const [songsPage, setSongsPage] = useState(1);
  const [songsTotal, setSongsTotal] = useState(0);

  const [requestsSearchQuery, setRequestsSearchQuery] = useState<string>("");
  const [debouncedRequestsSearchQuery, setDebouncedRequestsSearchQuery] = useState<string>("");
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotal, setRequestsTotal] = useState(0);

  // Request filter states
  const [requestsPackageFilter, setRequestsPackageFilter] =
    useState<string>("all");
  const [requestsPaymentFilter, setRequestsPaymentFilter] =
    useState<string>("all");
  const [requestsFulfillmentFilter, setRequestsFulfillmentFilter] =
    useState<string>("all");
  const [requestsDateFilter, setRequestsDateFilter] = useState<string>("all");
  const [requestsAssigneeFilter, setRequestsAssigneeFilter] =
    useState<string>("all");
  const [availablePackages, setAvailablePackages] = useState<string[]>([
    "package_1",
    "package_2",
    "package_3",
  ]);
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([
    "Saurabh",
    "Minkesh",
  ]);

  const [userSongsSearchQuery, setUserSongsSearchQuery] = useState<string>("");
  const [debouncedUserSongsSearchQuery, setDebouncedUserSongsSearchQuery] = useState<string>("");
  const [userSongsPage, setUserSongsPage] = useState(1);
  const [userSongsTotal, setUserSongsTotal] = useState(0);

  const PAGE_SIZE = 50;
  const [availableCategories, setAvailableCategories] = useState<
    Array<{
      id: number;
      name: string;
      slug: string;
      sequence: number;
      count: number;
    }>
  >([]);

  // Data state for each tab
  const [songs, setSongs] = useState<Song[]>([]);
  const [requests, setRequests] = useState<RequestData>([]);
  const [userSongs, setUserSongs] = useState<UserSongData>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Loading states for each tab
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingUserSongs, setLoadingUserSongs] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Track if initial tab load from URL has been done
  const initialLoadDoneRef = useRef(false);

  // Debounce search queries with 200ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSongSearchQuery(songSearchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [songSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRequestsSearchQuery(requestsSearchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [requestsSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSongsSearchQuery(userSongsSearchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [userSongsSearchQuery]);

  // Fetch data for a specific tab - always fetches fresh data
  const fetchTabData = useCallback(
    async (tab: TabType, pageOverride?: number, searchOverride?: string) => {
      const currentPage =
        pageOverride ??
        (tab === "songs"
          ? songsPage
          : tab === "requests"
            ? requestsPage
            : tab === "user-songs"
              ? userSongsPage
              : 1);
      const currentSearch =
        searchOverride !== undefined
          ? searchOverride
          : tab === "songs"
            ? debouncedSongSearchQuery
            : tab === "requests"
              ? debouncedRequestsSearchQuery
              : tab === "user-songs"
                ? debouncedUserSongsSearchQuery
                : "";

      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: PAGE_SIZE.toString(),
          search: currentSearch,
        });

        // Add song-specific filters
        if (tab === "songs") {
          if (songCategoryFilter) {
            queryParams.set("category", songCategoryFilter);
          }
          if (songSortBy) {
            queryParams.set("sortBy", songSortBy);
          }
        }

        // Add request-specific filters
        if (tab === "requests") {
          if (requestsPackageFilter && requestsPackageFilter !== "all") {
            queryParams.set("package", requestsPackageFilter);
          }
          if (requestsPaymentFilter && requestsPaymentFilter !== "all") {
            queryParams.set("payment", requestsPaymentFilter);
          }
          if (
            requestsFulfillmentFilter &&
            requestsFulfillmentFilter !== "all"
          ) {
            queryParams.set("fulfillment", requestsFulfillmentFilter);
          }
          if (requestsDateFilter && requestsDateFilter !== "all") {
            queryParams.set("dateRange", requestsDateFilter);
          }
          if (requestsAssigneeFilter && requestsAssigneeFilter !== "all") {
            queryParams.set("assignee", requestsAssigneeFilter);
          }
        }

        switch (tab) {
          case "songs":
            setLoadingSongs(true);
            const songsRes = await fetch(
              `/api/admin/dashboard/songs?${queryParams}`
            );
            if (songsRes.ok) {
              const data = await songsRes.json();
              setSongs(data.songs || []);
              setSongsTotal(data.total || 0);
            }
            setLoadingSongs(false);

            // Fetch categories if not already loaded
            if (availableCategories.length === 0) {
              const categoriesRes = await fetch("/api/admin/categories");
              if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setAvailableCategories(categoriesData.categories || []);
              }
            }
            break;

          case "requests":
            setLoadingRequests(true);
            const requestsRes = await fetch(
              `/api/admin/dashboard/requests?${queryParams}`
            );
            if (requestsRes.ok) {
              const data = await requestsRes.json();
              setRequests(data.requests || []);
              setRequestsTotal(data.total || 0);

              // Extract unique packages and assignees for filter dropdowns
              if (data.requests?.length > 0) {
                // Accumulate unique packages
                const newPackages = new Set<string>();
                const newAssignees = new Set<string>();

                data.requests.forEach((r: any) => {
                  if (r.package?.slug) newPackages.add(r.package.slug);
                  if (r.assignee) newAssignees.add(r.assignee);
                });

                if (newPackages.size > 0) {
                  setAvailablePackages((prev) => {
                    const combined = new Set(prev);
                    newPackages.forEach((p) => combined.add(p));
                    return combined.size > prev.length
                      ? Array.from(combined).sort()
                      : prev;
                  });
                }

                if (newAssignees.size > 0) {
                  setAvailableAssignees((prev) => {
                    const combined = new Set(prev);
                    newAssignees.forEach((a) => combined.add(a));
                    return combined.size > prev.length
                      ? Array.from(combined).sort()
                      : prev;
                  });
                }
              }
            }
            setLoadingRequests(false);
            break;

          case "user-songs":
            setLoadingUserSongs(true);
            const userSongsRes = await fetch(
              `/api/admin/dashboard/user-songs?${queryParams}`
            );
            if (userSongsRes.ok) {
              const data = await userSongsRes.json();
              setUserSongs(data.userSongs || []);
              setUserSongsTotal(data.total || 0);
            }
            setLoadingUserSongs(false);
            break;

          case "analytics":
            setLoadingAnalytics(true);
            const analyticsRes = await fetch("/api/admin/dashboard/analytics");
            if (analyticsRes.ok) {
              const analyticsData = await analyticsRes.json();
              setAnalytics(analyticsData.analytics || null);
            }
            setLoadingAnalytics(false);
            break;
        }
      } catch (error) {
        console.error(`Error fetching ${tab} data:`, error);
        // Reset loading state on error
        setLoadingSongs(false);
        setLoadingRequests(false);
        setLoadingUserSongs(false);
        setLoadingAnalytics(false);
      }
    },
    [
      songsPage,
      debouncedSongSearchQuery,
      songCategoryFilter,
      songSortBy,
      requestsPage,
      debouncedRequestsSearchQuery,
      requestsPackageFilter,
      requestsPaymentFilter,
      requestsFulfillmentFilter,
      requestsDateFilter,
      requestsAssigneeFilter,
      userSongsPage,
      debouncedUserSongsSearchQuery,
    ]
  );

  // Sync active tab with query params on mount and when params change
  useEffect(() => {
    const tab = getTabFromParams();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [getTabFromParams, activeTab]);

  // Initial load: fetch data for the tab specified in URL on first mount
  useEffect(() => {
    if (initialLoadDoneRef.current) return;

    const tab = getTabFromParams();
    initialLoadDoneRef.current = true;

    // Fetch data for the initial tab from URL
    fetchTabData(tab);
  }, [getTabFromParams, fetchTabData]);

  // Update query params when tab changes
  const handleTabChange = (tab: TabType) => {
    // Don't do anything if clicking the same tab
    if (tab === activeTab) return;

    // Update active tab immediately for smooth UI transition
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
    // Fetch data when tab is clicked
    fetchTabData(tab);
  };

  // Effects to trigger re-fetch when page, search, filter, or sort changes
  // Note: Initial tab load is handled by the initial load effect above
  // Note: Tab switching is handled by handleTabChange
  // Note: Using debounced search queries to avoid excessive API calls
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (activeTab === "songs") {
      fetchTabData("songs");
    }
  }, [songsPage, debouncedSongSearchQuery, songCategoryFilter, songSortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (activeTab === "requests") {
      fetchTabData("requests");
    }
  }, [
    requestsPage,
    debouncedRequestsSearchQuery,
    requestsPackageFilter,
    requestsPaymentFilter,
    requestsFulfillmentFilter,
    requestsDateFilter,
    requestsAssigneeFilter,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (activeTab === "user-songs") {
      fetchTabData("user-songs");
    }
  }, [userSongsPage, debouncedUserSongsSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page to 1 when search or filter changes
  // Using debounced search queries to reset page when debounced value changes
  useEffect(() => {
    setSongsPage(1);
  }, [debouncedSongSearchQuery, songCategoryFilter]);
  useEffect(() => {
    setRequestsPage(1);
  }, [
    debouncedRequestsSearchQuery,
    requestsPackageFilter,
    requestsPaymentFilter,
    requestsFulfillmentFilter,
    requestsDateFilter,
    requestsAssigneeFilter,
  ]);
  useEffect(() => {
    setUserSongsPage(1);
  }, [debouncedUserSongsSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex flex-wrap space-x-4 sm:space-x-8"
          aria-label="Tabs"
        >
          <button
            onClick={() => handleTabChange("requests")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out
              ${
                activeTab === "requests"
                  ? "border-yellow-600 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Song Requests
            {requestsTotal > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
                {requestsTotal}
              </span>
            )}
            {loadingRequests && (
              <span className="ml-2 text-gray-400 text-xs animate-pulse">
                Loading...
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("songs")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out
              ${
                activeTab === "songs"
                  ? "border-yellow-600 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Generated Songs
            {songsTotal > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
                {songsTotal}
              </span>
            )}
            {loadingSongs && (
              <span className="ml-2 text-gray-400 text-xs animate-pulse">
                Loading...
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("user-songs")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out
              ${
                activeTab === "user-songs"
                  ? "border-yellow-600 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            User Songs
            {userSongsTotal > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
                {userSongsTotal}
              </span>
            )}
            {loadingUserSongs && (
              <span className="ml-2 text-gray-400 text-xs animate-pulse">
                Loading...
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("analytics")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out
              ${
                activeTab === "analytics"
                  ? "border-yellow-600 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Analytics
            <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs font-medium">
              📊
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="relative min-h-[400px]">
        {/* Requests Tab */}
        <div
          className={`transition-opacity duration-300 ${
            activeTab === "requests"
              ? "opacity-100"
              : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        >
          {activeTab === "requests" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Song Requests
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage incoming song requests and track their progress
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="w-full">
                <SearchBar
                  value={requestsSearchQuery}
                  onChange={setRequestsSearchQuery}
                  placeholder="Search requests by recipient, mobile number, or email..."
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Package:</span>
                  <select
                    value={requestsPackageFilter}
                    onChange={(e) => setRequestsPackageFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                  >
                    <option value="all">ALL</option>
                    {availablePackages.map((pkg) => (
                      <option key={pkg} value={pkg}>
                        {pkg.replace(/-/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Payment:</span>
                  <select
                    value={requestsPaymentFilter}
                    onChange={(e) => setRequestsPaymentFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="no_payment">No Payment</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Fulfillment:</span>
                  <select
                    value={requestsFulfillmentFilter}
                    onChange={(e) =>
                      setRequestsFulfillmentFilter(e.target.value)
                    }
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="shared">Shared</option>
                    <option value="change_requested">Change Requested</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Created:</span>
                  <select
                    value={requestsDateFilter}
                    onChange={(e) => setRequestsDateFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                  >
                    <option value="all">All Time</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Assignee:</span>
                  <select
                    value={requestsAssigneeFilter}
                    onChange={(e) => setRequestsAssigneeFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="unassigned">Unassigned</option>
                    {availableAssignees.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-500 text-sm">
                      Loading song requests...
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <SongRequestList requests={requests} />
                  <Pagination
                    currentPage={requestsPage}
                    totalItems={requestsTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setRequestsPage}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Songs Tab */}
        <div
          className={`transition-opacity duration-300 ${
            activeTab === "songs"
              ? "opacity-100"
              : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        >
          {activeTab === "songs" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Generated Songs
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage all generated songs in the system
                  </p>
                </div>
                <div className="w-full sm:w-auto flex gap-3">
                  <Link
                    href="/song-admin-portal/create"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full sm:w-auto text-center"
                  >
                    Create New Song
                  </Link>
                </div>
              </div>
              {/* Search and Filter Controls */}
              <div className="w-full flex flex-col sm:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <SearchBar
                    value={songSearchQuery}
                    onChange={setSongSearchQuery}
                    placeholder="Search songs by title..."
                  />
                </div>

                {/* Category Filter */}
                <div className="sm:w-48">
                  <select
                    value={songCategoryFilter}
                    onChange={(e) => setSongCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="__NO_CATEGORY__">
                      No Category Selected
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="sm:w-48">
                  <select
                    value={songSortBy}
                    onChange={(e) => setSongSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="likes-desc">Most Likes</option>
                    <option value="likes-asc">Least Likes</option>
                    <option value="title-asc">Title (A-Z)</option>
                    <option value="title-desc">Title (Z-A)</option>
                  </select>
                </div>
              </div>
              {loadingSongs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-500 text-sm">
                      Loading songs...
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <SongList
                    songs={songs}
                    searchQuery={""} // Disable client-side search - handled by server
                    categoryFilter={""} // Disable client-side filter - handled by server
                    sortBy={"newest"} // Disable client-side sort - handled by server
                    availableCategories={availableCategories}
                  />
                  <Pagination
                    currentPage={songsPage}
                    totalItems={songsTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setSongsPage}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* User Songs Tab */}
        <div
          className={`transition-opacity duration-300 ${
            activeTab === "user-songs"
              ? "opacity-100"
              : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        >
          {activeTab === "user-songs" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    User Generated Songs
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    View all songs created by users
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="w-full">
                <SearchBar
                  value={userSongsSearchQuery}
                  onChange={setUserSongsSearchQuery}
                  placeholder="Search user songs by recipient name..."
                />
              </div>

              {loadingUserSongs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-500 text-sm">
                      Loading user songs...
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <UserSongList songs={userSongs} />
                  <Pagination
                    currentPage={userSongsPage}
                    totalItems={userSongsTotal}
                    pageSize={PAGE_SIZE}
                    onPageChange={setUserSongsPage}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Analytics Tab */}
        <div
          className={`transition-opacity duration-300 ${
            activeTab === "analytics"
              ? "opacity-100"
              : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        >
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Payment Analytics
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Insights into paid songs and song requests
                  </p>
                </div>
              </div>
              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-500 text-sm">
                      Loading analytics...
                    </div>
                  </div>
                </div>
              ) : analytics ? (
                <Analytics analytics={analytics} />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">
                    No analytics data available
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
