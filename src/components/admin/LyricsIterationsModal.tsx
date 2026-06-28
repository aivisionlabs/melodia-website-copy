"use client";

import {
  X,
  FileText,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface LyricsDraft {
  id: number;
  version: number;
  customer_lyrics: string | null;
  model_ready_lyrics: string | null;
  song_title: string | null;
  music_style: string | null;
  lyrics_edit_prompt: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LyricsIterationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
}

export default function LyricsIterationsModal({
  isOpen,
  onClose,
  requestId,
}: LyricsIterationsModalProps) {
  const [lyricsDrafts, setLyricsDrafts] = useState<LyricsDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLyricsIterations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/song-requests/${requestId}/lyrics`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lyrics iterations");
      }

      // Remove duplicates by version (keep first occurrence)
      const uniqueDrafts = (data.lyricsDrafts || []).reduce(
        (acc: LyricsDraft[], draft: LyricsDraft) => {
          const existing = acc.find((d) => d.version === draft.version);
          if (!existing) {
            acc.push(draft);
          }
          return acc;
        },
        []
      );

      // Sort by version to ensure correct order
      uniqueDrafts.sort(
        (a: LyricsDraft, b: LyricsDraft) => (a.version || 0) - (b.version || 0)
      );
      setLyricsDrafts(uniqueDrafts);
    } catch (err) {
      console.error("Error fetching lyrics iterations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch lyrics iterations"
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (isOpen && requestId) {
      fetchLyricsIterations();
    }
  }, [isOpen, requestId, fetchLyricsIterations]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return {
          label: "Approved",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          icon: CheckCircle2,
        };
      case "draft":
        return {
          label: "Draft",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          icon: Clock,
        };
      default:
        return {
          label: status || "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          icon: FileText,
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Lyrics Iterations
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading lyrics iterations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchLyricsIterations}
                className="text-yellow-600 hover:text-yellow-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : lyricsDrafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No lyrics iterations found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lyricsDrafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 text-yellow-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        v{draft.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {draft.song_title || "Untitled Song"}
                          </h3>
                          {(() => {
                            const statusInfo = getStatusInfo(draft.status);
                            const StatusIcon = statusInfo.icon;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                        {draft.music_style && (
                          <p className="text-sm text-gray-600">
                            Style: {draft.music_style}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(draft.created_at)}</span>
                    </div>
                  </div>

                  {draft.lyrics_edit_prompt && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-900 mb-1">
                            Change Request:
                          </p>
                          <p className="text-sm text-blue-800">
                            {draft.lyrics_edit_prompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Display Lyrics (Romanized):
                    </p>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {draft.customer_lyrics || <span className="text-gray-400 italic">No display lyrics</span>}
                    </div>
                  </div>

                  {draft.model_ready_lyrics && (
                    <div className="mt-3 bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        Audio Model Lyrics (Native Script):
                      </p>
                      <div className="text-sm text-amber-900 whitespace-pre-wrap break-words">
                        {draft.model_ready_lyrics}
                      </div>
                    </div>
                  )}

                  {index < lyricsDrafts.length - 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-center">
                        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          ↓ Next Version
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
