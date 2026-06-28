/**
 * Music Style Display Component
 * Shows the generated music style with edit controls
 */

"use client";

import { useState, useEffect } from "react";
import { Music, RefreshCw, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicStyleDisplayProps {
  musicStyle: string;
  lyricsDraftId: number;
  onUpdate?: (
    lyricsDraftId: number,
    musicStyle: string,
  ) => Promise<string | null>;
  isUpdating?: boolean;
  /** Merged onto root — e.g. flush inside a parent card */
  className?: string;
  /** When true, omit the title row (parent already shows "Music style") — Edit stays beside text */
  hideHeader?: boolean;
}

export default function MusicStyleDisplay({
  musicStyle,
  lyricsDraftId,
  onUpdate,
  isUpdating = false,
  className,
  hideHeader = false,
}: MusicStyleDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(musicStyle);
  const [displayStyle, setDisplayStyle] = useState(musicStyle);

  useEffect(() => {
    setDisplayStyle(musicStyle);
    setEditValue(musicStyle);
    setIsEditing(false);
  }, [musicStyle, lyricsDraftId]);

  const handleStartEdit = () => {
    setEditValue(displayStyle);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditValue(displayStyle);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onUpdate || !editValue.trim()) return;
    const savedStyle = await onUpdate(lyricsDraftId, editValue.trim());
    if (savedStyle) {
      setDisplayStyle(savedStyle);
      setIsEditing(false);
    }
  };

  const isLoading = isUpdating;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
        className,
      )}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-yellow/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-3 h-3 text-text-teal" />
            </div>
            <span className="text-[10px] font-bold text-text-teal/40 uppercase tracking-widest">
              Music Style
            </span>
          </div>
          {onUpdate && !isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              disabled={isLoading}
              className="flex items-center gap-1 text-[10px] font-bold text-text-teal/40 hover:text-text-teal transition-colors active:scale-95 disabled:opacity-40"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      )}

      {isEditing ? (
        <div
          className={cn(
            "px-4 pb-3 space-y-2",
            hideHeader && "pt-3",
          )}
        >
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2.5 text-sm text-text-teal bg-secondary-cream border border-gray-200 rounded-xl focus:outline-none focus:border-primary-yellow resize-none leading-relaxed"
            rows={3}
            maxLength={500}
            placeholder="e.g., romantic pop ballad, soft female vocals, piano and strings, 85 BPM, warm and intimate"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-teal/30 font-body">{editValue.length}/500</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-text-teal/50 hover:text-text-teal transition-colors active:scale-95"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading || !editValue.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-accent-coral text-white rounded-full disabled:opacity-40 active:scale-95 transition-transform"
              >
                {isUpdating ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : hideHeader ? (
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 min-w-0 text-[13px] text-text-teal/60 leading-relaxed">
              {displayStyle}
            </p>
            {onUpdate && (
              <button
                type="button"
                onClick={handleStartEdit}
                disabled={isLoading}
                className="flex items-center gap-1 text-[10px] font-bold text-text-teal/40 hover:text-text-teal transition-colors active:scale-95 disabled:opacity-40 flex-shrink-0 pt-0.5"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="px-4 pb-3 text-[13px] text-text-teal/60 leading-relaxed">
          {displayStyle}
        </p>
      )}
    </div>
  );
}
