"use client";

import { useState } from "react";

interface FulfillmentFieldsEditorProps {
  request: any;
  onSave: (updates: {
    fulfillmentStatus?: string;
    priority?: string;
    deliveryDate?: string | null;
    eventDate?: string | null;
    initialRequirementsText?: string;
    assignee?: string | null;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function FulfillmentFieldsEditor({
  request,
  onSave,
  onCancel,
  isSaving,
}: FulfillmentFieldsEditorProps) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    (request.fulfillment_status as string) || "pending"
  );
  const [priority, setPriority] = useState(
    (request.priority as string) || "medium"
  );

  const toDateInput = (date: string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const [deliveryDate, setDeliveryDate] = useState(
    toDateInput(request.delivery_date)
  );
  const [eventDate, setEventDate] = useState(toDateInput(request.event_date));

  const [initialRequirementsText, setInitialRequirementsText] = useState(
    request.initial_requirements_text || ""
  );

  const [assignee, setAssignee] = useState(request.assignee || "Saurabh");

  const handleSave = () => {
    const updates: any = {
      fulfillmentStatus,
      priority,
      deliveryDate: deliveryDate || null,
      eventDate: eventDate || null,
      initialRequirementsText,
      assignee: assignee && assignee.trim() ? assignee.trim() : null,
    };
    onSave(updates);
  };

  return (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-4">
      <h4 className="text-base font-semibold text-gray-900">
        Update Fulfillment Details
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fulfillment Status
          </label>
          <select
            value={fulfillmentStatus}
            onChange={(e) => setFulfillmentStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="pending">Pending</option>
            <option value="shared">Shared</option>
            <option value="change_requested">Change Requested</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Date
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Initial Requirements
        </label>
        <textarea
          value={initialRequirementsText}
          onChange={(e) => setInitialRequirementsText(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Enter initial requirements for the song..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assignee
        </label>
        <select
          value={assignee || ""}
          onChange={(e) => setAssignee(e.target.value || null)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">Unassigned</option>
          <option value="Saurabh">Saurabh</option>
          <option value="Minkesh">Minkesh</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
