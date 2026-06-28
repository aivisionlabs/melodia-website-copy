"use client";

import { useState, useEffect, useRef } from "react";
import { softDeleteSongAction } from "@/lib/actions/song.actions";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MoreVertical } from "lucide-react";

interface DeleteSongButtonProps {
  songId: number;
  songTitle: string;
  onDelete?: () => void;
  variant?: "icon" | "dropdown";
}

export default function DeleteSongButton({
  songId,
  songTitle,
  onDelete,
  variant = "icon",
}: DeleteSongButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${songTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await softDeleteSongAction(songId);

      if (result.success) {
        toast({
          title: "Song deleted successfully",
          description: `"${songTitle}" has been moved to trash.`,
          duration: 3000,
        });
        onDelete?.();
      } else {
        toast({
          title: "Error deleting song",
          description: result.error || "Failed to delete song",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error deleting song:", error);
      toast({
        title: "Error deleting song",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
      setShowDropdown(false);
    }
  };

  if (variant === "dropdown") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-md"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
            <div className="py-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Song"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Delete song"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
