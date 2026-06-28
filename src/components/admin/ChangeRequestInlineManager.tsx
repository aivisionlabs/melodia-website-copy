"use client";

import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { SelectChangeRequest } from "@/lib/db/schema";

interface ChangeRequestInlineManagerProps {
  requestId: number;
  initialChangeRequests: SelectChangeRequest[];
  onUpdateRequestCount: (newCount: number) => void;
}

export default function ChangeRequestInlineManager({
  requestId,
  initialChangeRequests,
  onUpdateRequestCount,
}: ChangeRequestInlineManagerProps) {
  const [changeRequests, setChangeRequests] = useState<SelectChangeRequest[]>(
    initialChangeRequests
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newDescription.trim()) {
      alert("Description cannot be empty.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songRequestId: requestId,
          description: newDescription,
        }),
      });
      if (response.ok) {
        setNewDescription("");
        setIsCreating(false);
        const newRequest = await response.json();
        const updatedRequests = [newRequest.data, ...changeRequests];
        setChangeRequests(updatedRequests);
        onUpdateRequestCount(updatedRequests.length);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create change request.");
      }
    } catch (error) {
      console.error("Error creating change request:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-gray-900">Change Requests</h4>
      {changeRequests.map((cr) => (
        <div key={cr.id} className="border-l-2 border-gray-300 pl-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {cr.description}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(cr.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ))}
      {changeRequests.length === 0 && !isCreating && (
        <p className="text-sm text-gray-500">No change requests yet.</p>
      )}

      {isCreating ? (
        <div className="space-y-2 pt-2">
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Describe the change..."
            rows={3}
            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 p-4"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {creating ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Change Request
          </button>
        </div>
      )}
    </div>
  );
}
