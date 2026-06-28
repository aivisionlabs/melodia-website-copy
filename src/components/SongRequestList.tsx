"use client";

import { useState } from "react";
import { SelectSongRequest, SelectChangeRequest } from "@/lib/db/schema";
import PaymentStatusModal from "./admin/PaymentStatusModal";
import LyricsIterationsModal from "./admin/LyricsIterationsModal";
import ChangeRequestInlineManager from "./admin/ChangeRequestInlineManager";
import {
  CreditCard,
  FileText,
  Music,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import FulfillmentFieldsEditor from "./admin/FulfillmentFieldsEditor";
import Link from "next/link";

interface SongRequestListProps {
  requests: Array<
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
      changeRequestCount?: number;
      changeRequests: SelectChangeRequest[];
      sourceSong?: {
        id: number;
        title: string;
        slug: string;
        imageUrl?: string | null;
      } | null;
    }
  >;
}

export default function SongRequestList({ requests }: SongRequestListProps) {
  // Deduplicate requests by ID to prevent duplicate keys
  const uniqueRequests = requests.filter(
    (request, index, self) =>
      index === self.findIndex((r) => r.id === request.id)
  );

  const [currentRequests, setCurrentRequests] = useState(uniqueRequests);

  // Note: Filters have been moved to AdminDashboardTabs for server-side filtering
  // The props now come pre-filtered from the server

  const [paymentModalOpen, setPaymentModalOpen] = useState<number | null>(null);
  const [lyricsModalOpen, setLyricsModalOpen] = useState<number | null>(null);

  const [editingFulfillment, setEditingFulfillment] = useState<number | null>(
    null
  );
  const [updatingRequest, setUpdatingRequest] = useState<number | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<number | null>(null);
  const [linkingSong, setLinkingSong] = useState<number | null>(null);
  const [availableSongs, setAvailableSongs] = useState<
    Array<{
      id: number;
      label: string;
      title: string;
      slug: string;
      isLinked: boolean;
    }>
  >([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [selectedSongToLink, setSelectedSongToLink] = useState<{
    [requestId: number]: string;
  }>({});

  // Note: Package and Assignee filter options removed - now handled server-side in AdminDashboardTabs

  const getPaymentStatusColor = (status: string | null | undefined) => {
    switch (status) {
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

  // Note: Client-side filtering removed - filtering is now done server-side via API
  // Use currentRequests directly (already filtered by server)

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFulfillmentStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "shared":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "change_requested":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "pending":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (
    date: Date | string | null,
    includeTime: boolean = false
  ) => {
    if (!date) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    return new Date(date).toLocaleDateString("en-US", options);
  };

  const handleUpdateFulfillmentFields = async (
    requestId: number,
    updates: any
  ) => {
    setUpdatingRequest(requestId);
    try {
      const response = await fetch(`/api/song-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update request");
      }

      const { data: updatedRequest } = await response.json();
      setCurrentRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, ...updatedRequest } : req
        )
      );
      setEditingFulfillment(null);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update request."
      );
    } finally {
      setUpdatingRequest(null);
    }
  };

  const updateChangeRequestCount = (requestId: number, newCount: number) => {
    setCurrentRequests((prev) =>
      prev.map((req) =>
        req.id === requestId ? { ...req, changeRequestCount: newCount } : req
      )
    );
  };

  const fetchAvailableSongs = async () => {
    if (availableSongs.length > 0) return; // Already loaded
    setLoadingSongs(true);
    try {
      const response = await fetch("/api/admin/songs");
      if (response.ok) {
        const data = await response.json();
        setAvailableSongs(data.songs || []);
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
    } finally {
      setLoadingSongs(false);
    }
  };

  const handleLinkSong = async (requestId: number, songId: string) => {
    if (!songId) return;
    setLinkingSong(requestId);
    try {
      const response = await fetch(
        `/api/song-requests/${requestId}/link-song`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: parseInt(songId) }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to link song");
      }

      const { data: linkedSong } = await response.json();

      // Find the song details from available songs
      const songDetails = availableSongs.find((s) => s.id === parseInt(songId));

      // Update local state - add the linked song to the linkedSongs array
      setCurrentRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                linkedSongs: [
                  ...(req.linkedSongs || []),
                  {
                    id: linkedSong.id,
                    title:
                      linkedSong.title ||
                      songDetails?.title ||
                      `Song ${linkedSong.id}`,
                    slug: linkedSong.slug || songDetails?.slug || "",
                  },
                ],
              }
            : req
        )
      );

      // Update available songs to mark this one as linked
      setAvailableSongs((prev) =>
        prev.map((s) =>
          s.id === parseInt(songId) ? { ...s, isLinked: true } : s
        )
      );

      setSelectedSongToLink((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to link song");
    } finally {
      setLinkingSong(null);
    }
  };

  const handleUnlinkSong = async (requestId: number, songId: number) => {
    if (
      !confirm("Are you sure you want to unlink this song from the request?")
    ) {
      return;
    }
    setLinkingSong(requestId);
    try {
      const response = await fetch(
        `/api/song-requests/${requestId}/link-song`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unlink song");
      }

      // Update local state - remove the linked song from linkedSongs array
      setCurrentRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                linkedSongs: (req.linkedSongs || []).filter(
                  (s) => s.id !== songId
                ),
              }
            : req
        )
      );

      // Update available songs to mark this one as unlinked
      setAvailableSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, isLinked: false } : s))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to unlink song");
    } finally {
      setLinkingSong(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Note: Filters have been moved to AdminDashboardTabs for server-side filtering */}
      <ul className="space-y-4">
        {currentRequests.map((request) => {
          // Debug: Log source song data
          if (request.source_song_id && !request.sourceSong) {
            console.warn(
              `Request ${request.id} has source_song_id ${request.source_song_id} but no sourceSong data`
            );
          }
          return (
            <li
              key={request.id}
              className="border border-gray-200 rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="px-4 py-4 sm:px-6">
                {/* Card Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Request #{request.id} -{" "}
                      <span className="font-normal text-gray-700">
                        {request.recipient_details}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500">
                        Created on {formatDate(request.created_at, true)}
                      </p>
                      {request.mobile_number && (
                        <p className="text-sm text-gray-600">
                          📱 {request.mobile_number}
                        </p>
                      )}
                      {request.email && (
                        <p className="text-sm text-gray-600">
                          📧 {request.email}
                        </p>
                      )}
                      {request.package && (
                        <p className="text-sm font-medium text-gray-700">
                          📦 Package:{" "}
                          {request.package.name || request.package.slug}{" "}
                          {request.package.price &&
                            `(₹${request.package.price})`}
                        </p>
                      )}
                      {request.isUserSong && (
                        <p className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          🎵 User Song Flow (299/599)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.isUserSong && request.song?.slug && (
                      <Link
                        href={`/my-songs/${request.song.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Music className="w-4 h-4" />
                        View User Song
                      </Link>
                    )}

                    <Link
                      href={`/song-admin-portal/create?requestId=${request.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Music className="w-4 h-4" />
                      Create Song
                    </Link>

                    {editingFulfillment !== request.id && (
                      <button
                        onClick={() => setEditingFulfillment(request.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        Update Details
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Details - Upfront */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Song Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">For:</span>
                      <span className="ml-2 text-gray-800">
                        {request.recipient_details}
                      </span>
                    </div>
                    {request.occasion && (
                      <div>
                        <span className="font-medium text-gray-600">
                          Occasion:
                        </span>
                        <span className="ml-2 text-gray-800">
                          {request.occasion}
                        </span>
                      </div>
                    )}
                    {request.mood && request.mood.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-600">Mood:</span>
                        <span className="ml-2 text-gray-800">
                          {Array.isArray(request.mood)
                            ? request.mood.join(", ")
                            : request.mood}
                        </span>
                      </div>
                    )}
                    {request.languages && (
                      <div>
                        <span className="font-medium text-gray-600">
                          Language:
                        </span>
                        <span className="ml-2 text-gray-800">
                          {request.languages}
                        </span>
                      </div>
                    )}
                    {request.song_story && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-600">
                          Story:
                        </span>
                        <p className="mt-1 text-gray-800 whitespace-pre-wrap">
                          {request.song_story}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Song Card */}
                {request.sourceSong && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Source Template Song
                    </h4>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-md">
                      <div className="flex items-center gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                          {request.sourceSong.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={request.sourceSong.imageUrl}
                              alt={request.sourceSong.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-primary-yellow/20 to-accent-coral/20 flex items-center justify-center">
                              <Music className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            Using template
                          </p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {request.sourceSong.title}
                          </p>
                          {request.sourceSong.slug && (
                            <Link
                              href={`/song/${request.sourceSong.slug}`}
                              target="_blank"
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                            >
                              View in library →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statuses and Dates */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-600">Package</div>
                    {request.package ? (
                      <div className="mt-1 text-gray-800">
                        <span className="font-medium">
                          {request.package.name || request.package.slug}
                        </span>
                        {request.package.price && (
                          <span className="ml-1 text-gray-600">
                            (₹{request.package.price})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="mt-1 text-gray-500">No Package</span>
                    )}
                    {request.isUserSong && request.song?.slug && (
                      <Link
                        href={`/my-songs/${request.song.slug}`}
                        target="_blank"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <Music className="w-3 h-3" />
                        View User Song
                      </Link>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">
                      Payment Status
                    </div>
                    {request.payment ? (
                      <span
                        className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(request.payment.status)}`}
                      >
                        {request.payment.status}
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
                        No Payment
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Fulfillment</div>
                    {updatingRequest === request.id ? (
                      <span className="mt-1 inline-flex items-center text-xs text-gray-500">
                        Updating...
                      </span>
                    ) : (
                      <select
                        value={request.fulfillment_status || "pending"}
                        onChange={(e) => {
                          handleUpdateFulfillmentFields(request.id, {
                            fulfillmentStatus: e.target.value,
                          });
                        }}
                        className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-colors ${getFulfillmentStatusColor(request.fulfillment_status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="shared">Shared</option>
                        <option value="change_requested">
                          Change Requested
                        </option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Priority</div>
                    <span
                      className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}
                    >
                      {request.priority}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">
                      Delivery Date
                    </div>
                    <div className="text-gray-800">
                      {formatDate(request.delivery_date)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Event Date</div>
                    <div className="text-gray-800">
                      {formatDate(request.event_date)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Assignee</div>
                    <div className="text-gray-800">
                      {request.assignee || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fulfillment Editor */}
                {editingFulfillment === request.id && (
                  <div className="mt-4">
                    <FulfillmentFieldsEditor
                      request={request}
                      onSave={(updates) =>
                        handleUpdateFulfillmentFields(request.id, updates)
                      }
                      onCancel={() => setEditingFulfillment(null)}
                      isSaving={updatingRequest === request.id}
                    />
                  </div>
                )}

                {/* Initial Requirements */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Initial Requirements
                      </h4>
                      {request.initial_requirements_text ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {request.initial_requirements_text}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No initial requirements specified. Use &quot;Update
                          Details&quot; to add them.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Linked Songs */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Linked Songs
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedSongToLink[request.id] || ""}
                        onChange={(e) => {
                          setSelectedSongToLink((prev) => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }));
                          if (availableSongs.length === 0) {
                            fetchAvailableSongs();
                          }
                        }}
                        onFocus={() => {
                          if (availableSongs.length === 0) {
                            fetchAvailableSongs();
                          }
                        }}
                        disabled={linkingSong === request.id || loadingSongs}
                        className="text-xs px-2 py-1.5 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50"
                      >
                        <option value="">
                          {loadingSongs ? "Loading..." : "Select song to link"}
                        </option>
                        {availableSongs
                          .filter(
                            (s) =>
                              !(request.linkedSongs || []).some(
                                (ls) => ls.id === s.id
                              )
                          )
                          .map((song) => (
                            <option key={song.id} value={song.id}>
                              {song.label}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() =>
                          handleLinkSong(
                            request.id,
                            selectedSongToLink[request.id] || ""
                          )
                        }
                        disabled={
                          !selectedSongToLink[request.id] ||
                          linkingSong === request.id
                        }
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
                      >
                        {linkingSong === request.id
                          ? "Linking..."
                          : "Link Song"}
                      </button>
                    </div>
                  </div>
                  {(request.linkedSongs || []).length > 0 ? (
                    <div className="space-y-2">
                      {(request.linkedSongs || []).map((linkedSong) => {
                        // For expert-created package, use library route; otherwise use my-songs route
                        const isExpertCreatedPackage =
                          request.package?.expert_created === true;
                        const songUrl = isExpertCreatedPackage
                          ? `/song/${linkedSong.slug}`
                          : `/my-songs/${linkedSong.slug}`;

                        return (
                          <div
                            key={linkedSong.id}
                            className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Music className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {linkedSong.title ||
                                  `Song ID: ${linkedSong.id}`}
                              </span>
                              {linkedSong.slug && (
                                <Link
                                  href={songUrl}
                                  target="_blank"
                                  className="text-xs text-yellow-600 hover:underline"
                                >
                                  View
                                </Link>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                handleUnlinkSong(request.id, linkedSong.id)
                              }
                              disabled={linkingSong === request.id}
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                            >
                              {linkingSong === request.id ? "..." : "Unlink"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No songs linked to this request.
                    </p>
                  )}
                </div>

                {/* Change Requests */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ChangeRequestInlineManager
                    requestId={request.id}
                    initialChangeRequests={request.changeRequests}
                    onUpdateRequestCount={(newCount) =>
                      updateChangeRequestCount(request.id, newCount)
                    }
                  />
                </div>

                {/* Collapsible Details section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() =>
                      setExpandedDetails(
                        expandedDetails === request.id ? null : request.id
                      )
                    }
                    className="w-full flex justify-between items-center text-left text-sm font-medium text-gray-700"
                  >
                    <span>Less-Common Details</span>
                    {expandedDetails === request.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  {expandedDetails === request.id && (
                    <div className="mt-3 space-y-4">
                      {/* Payment Details Section */}
                      {request.payment && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Payment Details
                            </span>
                          </div>
                          <button
                            onClick={() => setPaymentModalOpen(request.id)}
                            className="text-sm text-yellow-600 hover:underline"
                          >
                            View Full Details
                          </button>
                        </div>
                      )}
                      {/* Lyrics Generated Section */}
                      {request.latestLyricsDraft?.has_lyrics && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Lyrics Generated
                            </span>
                          </div>
                          <button
                            onClick={() => setLyricsModalOpen(request.id)}
                            className="text-sm text-yellow-600 hover:underline"
                          >
                            View Versions
                          </button>
                        </div>
                      )}
                      {/* Music Style Section */}
                      {request.latestLyricsDraft?.music_style && (
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Music Style:
                          </span>
                          <span className="text-sm text-gray-600">
                            {request.latestLyricsDraft.music_style}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          Initial Requirements
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                          {request.initial_requirements_text ||
                            "None provided."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modals */}
      {currentRequests.map((request) => (
        <div key={`modals-${request.id}`}>
          <PaymentStatusModal
            isOpen={paymentModalOpen === request.id}
            onClose={() => setPaymentModalOpen(null)}
            payment={request.payment || null}
          />
          <LyricsIterationsModal
            isOpen={lyricsModalOpen === request.id}
            onClose={() => setLyricsModalOpen(null)}
            requestId={request.id}
          />
        </div>
      ))}
    </div>
  );
}
