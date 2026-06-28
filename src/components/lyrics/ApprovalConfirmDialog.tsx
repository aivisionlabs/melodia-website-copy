/**
 * Approval Confirmation Dialog Component
 */

"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ApprovalConfirmDialogProps {
  isOpen: boolean;
  isApproving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ApprovalConfirmDialog({
  isOpen,
  isApproving,
  onConfirm,
  onCancel,
}: ApprovalConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="absolute bottom-0 left-0 right-0 bg-secondary-cream rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <h3 className="text-lg font-bold font-heading text-text-teal mb-1">
          Approve your lyrics?
        </h3>
        <p className="text-sm text-text-teal/55 mb-4 leading-relaxed">
          Once approved, lyrics cannot be modified. Make sure every word is
          exactly how you want it — names, story, everything.
        </p>

        <div className="bg-primary-yellow/20 border border-primary-yellow/50 rounded-2xl p-3.5 mb-5">
          <p className="text-xs text-text-teal font-medium leading-relaxed">
            <strong>Tip:</strong> Use the <strong>Magic Lyrics Editor</strong>{" "}
            to make any changes before approving.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 border-gray-200 text-text-teal/70 hover:bg-gray-50 rounded-full font-semibold"
            onClick={onCancel}
            disabled={isApproving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-accent-coral text-white hover:bg-accent-coral/90 rounded-full font-bold"
            onClick={onConfirm}
            disabled={isApproving}
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Approving…
              </>
            ) : (
              "Yes, Approve!"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
