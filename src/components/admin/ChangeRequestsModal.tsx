"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2 } from "lucide-react";

interface ChangeRequest {
  id: string;
  songRequestId: number;
  songId?: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
}

export default function ChangeRequestsModal({
  isOpen,
  onClose,
  requestId,
}: ChangeRequestsModalProps) {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRequestDescription, setNewRequestDescription] = useState("");
  const [newRequestSongId, setNewRequestSongId] = useState<string>("");
  const [editDescription, setEditDescription] = useState("");
  const [editSongId, setEditSongId] = useState<string>("");

  useEffect(() => {
    if (isOpen && requestId) {
      loadChangeRequests();
    }
  }, [isOpen, requestId]);

  const loadChangeRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/change-requests?requestId=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setChangeRequests(data.changeRequests || []);
      }
    } catch (error) {
      console.error("Error loading change requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newRequestDescription.trim()) {
      alert("Please enter a description");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songRequestId: requestId,
          description: newRequestDescription.trim(),
          songId: newRequestSongId ? parseInt(newRequestSongId) : null,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewRequestDescription("");
        setNewRequestSongId("");
        loadChangeRequests();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create change request");
      }
    } catch (error) {
      console.error("Error creating change request:", error);
      alert("Failed to create change request");
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (cr: ChangeRequest) => {
    setEditingId(cr.id);
    setEditDescription(cr.description);
    setEditSongId(cr.songId ? String(cr.songId) : "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditSongId("");
  };

  const handleUpdate = async (id: string) => {
    if (!editDescription.trim()) {
      alert("Description cannot be empty");
      return;
    }

    try {
      const response = await fetch(`/api/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription.trim(),
          songId: editSongId ? parseInt(editSongId) : null,
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditDescription("");
        setEditSongId("");
        loadChangeRequests();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update change request");
      }
    } catch (error) {
      console.error("Error updating change request:", error);
      alert("Failed to update change request");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Change Requests (Request #{requestId})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create Button */}
          <div className="mb-4">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Change Request
              </button>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-medium mb-3">Create New Change Request</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newRequestDescription}
                      onChange={(e) => setNewRequestDescription(e.target.value)}
                      placeholder="Describe the change request..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newRequestDescription.length}/5000 characters
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Song ID (optional - if this change resulted in a new song)
                    </label>
                    <input
                      type="number"
                      value={newRequestSongId}
                      onChange={(e) => setNewRequestSongId(e.target.value)}
                      placeholder="Enter song ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newRequestDescription.trim()}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewRequestDescription("");
                        setNewRequestSongId("");
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change Requests List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : changeRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No change requests found for this song request.
            </div>
          ) : (
            <div className="space-y-3">
              {changeRequests.map((cr) => (
                <div
                  key={cr.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {editingId === cr.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {editDescription.length}/5000 characters
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Song ID (optional)
                        </label>
                        <input
                          type="number"
                          value={editSongId}
                          onChange={(e) => setEditSongId(e.target.value)}
                          placeholder="Enter song ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(cr.id)}
                          disabled={!editDescription.trim()}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {cr.songId && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Song ID: {cr.songId}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                          {cr.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>
                            Created: {new Date(cr.createdAt).toLocaleString()}
                          </div>
                          {cr.updatedAt !== cr.createdAt && (
                            <div>
                              Updated: {new Date(cr.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartEdit(cr)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit change request"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
