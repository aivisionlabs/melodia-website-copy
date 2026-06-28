/**
 * Magic Edit Panel Component
 * Panel for AI-powered lyrics editing
 */

"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingChange {
  id: string;
  original: string;
  instruction: string;
}

interface MagicEditPanelProps {
  refinePrompt: string;
  onPromptChange: (value: string) => void;
  hasVersions: boolean;
  activeVersionNumber: number | null;
  pendingChanges: PendingChange[];
  onRemoveChange: (id: string) => void;
  /** When provided, inline Submit/Cancel buttons are shown so they stay visible above the keyboard on mobile */
  onSubmit?: () => void;
  onCancel?: () => void;
  isRefining?: boolean;
}

export default function MagicEditPanel({
  refinePrompt,
  onPromptChange,
  hasVersions,
  activeVersionNumber,
  pendingChanges,
  onRemoveChange,
  onSubmit,
  onCancel,
  isRefining = false,
}: MagicEditPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Small delay to ensure the textarea is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, []);

  const scrollActionsIntoView = () => {
    setTimeout(() => {
      actionsRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 400);
  };

  return (
    <div className="mt-6">
      <div className="bg-white rounded-3xl p-6">
        <label className="block text-lg font-semibold text-text-teal mb-3">
          What changes would you like to make?
        </label>
        {hasVersions && (
          <p className="text-xs text-gray-500 mb-2">
            Editing Version {activeVersionNumber ?? "—"}
          </p>
        )}

        {pendingChanges.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-teal">
              Pending changes ({pendingChanges.length})
            </h3>
            {pendingChanges.map((change) => (
              <div
                key={change.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-start"
              >
                <div className="flex-1 text-sm">
                  <div className="text-gray-500 italic mb-1 line-clamp-2">
                    "{change.original}"
                  </div>
                  <div className="text-text-teal font-medium">
                    {change.instruction}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveChange(change.id)}
                  className="text-gray-400 hover:text-red-500 ml-2 p-1"
                  aria-label="Remove this change"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Submit to apply these changes to your lyrics. You can add more
              instructions below.
            </p>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={refinePrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onFocus={scrollActionsIntoView}
          className="w-full min-h-32 p-4 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent-coral focus:border-transparent"
          rows={8}
          placeholder="Type your changes here... (e.g., 'Make it more romantic', 'Add more Hindi lyrics', 'Change the chorus')"
        />
        <p className="text-sm text-gray-500 mt-3">
          Your input will be added to the existing details and new lyrics will
          be generated.
        </p>

        {/* Inline actions so they stay visible above keyboard on mobile */}
        {onSubmit != null && onCancel != null && (
          <div ref={actionsRef} className="mt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={
                isRefining ||
                (!refinePrompt.trim() && pendingChanges.length === 0)
              }
              className="flex-1 h-11 bg-accent-coral hover:bg-accent-coral/90 text-white font-semibold"
            >
              {isRefining
                ? "Updating..."
                : pendingChanges.length > 0
                  ? `Submit ${pendingChanges.length} change${pendingChanges.length === 1 ? "" : "s"}`
                  : "Submit Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
