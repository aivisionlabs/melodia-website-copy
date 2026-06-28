"use client";

import { Button } from "@/components/ui/button";

interface SongCTAsProps {
  songLoved: boolean;
  onLoveIt: () => void;
  onMeh: () => void;
  hasFeedback?: boolean;
}

export default function SongCTAs({
  songLoved,
  onLoveIt,
  onMeh,
  hasFeedback = false,
}: SongCTAsProps) {
  // Don't show buttons if feedback has already been submitted
  if (hasFeedback) {
    return null;
  }

  if (!songLoved) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={onMeh}
          variant="secondary"
          className="bg-white h-12 rounded-full font-bold text-md shadow-sm"
        >
          Not So Much
        </Button>
        <Button
          onClick={onLoveIt}
          className="bg-[#EF476F] hover:bg-[#EF476F]/90 h-12 rounded-full font-bold text-md text-white shadow-sm"
        >
          Love This Song!
        </Button>
      </div>
    );
  }

  // Download button moved to header as icon, nothing to show here when song is loved
  return null;
}
