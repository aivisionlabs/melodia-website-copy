"use client";

import { Play, Pause, Rewind, FastForward } from "lucide-react";
import { useRef, useEffect, useState } from "react";

// Format time helper
const formatTime = (time: number): string => {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface SongPlayerControlsProps {
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  } | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

export default function SongPlayerControls({
  playbackState,
  onPlayPause,
  onSeek,
  onSkipBackward,
  onSkipForward,
}: SongPlayerControlsProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number>(0);
  const hasDraggedRef = useRef(false);
  const dragValueRef = useRef<number>(0);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click if we just finished dragging
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (!progressBarRef.current || !playbackState) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * playbackState.duration;
    onSeek(newTime);
  };

  const handleProgressDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !playbackState) return;
    e.preventDefault();
    hasDraggedRef.current = false;

    // Initialize drag value based on mouse down position
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const initialTime = percentage * playbackState.duration;
    setDragValue(initialTime);
    dragValueRef.current = initialTime;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (progressBarRef.current && playbackState) {
        hasDraggedRef.current = true;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percentage * playbackState.duration;
        setDragValue(newTime);
        dragValueRef.current = newTime;
      }
    };

    const handleMouseUp = () => {
      if (playbackState && dragValueRef.current >= 0) {
        onSeek(dragValueRef.current);
      }
      setDragValue(0);
      dragValueRef.current = 0;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, playbackState?.duration]);

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            {formatTime(
              isDragging ? dragValue : playbackState?.currentTime || 0
            )}
          </span>
          <span>{formatTime(playbackState?.duration || 0)}</span>
        </div>
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseDown={handleProgressDragStart}
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer group"
        >
          <div
            className="absolute h-full bg-[#EF476F] rounded-full transition-all duration-100"
            style={{
              width: `${playbackState?.duration ? ((isDragging ? dragValue : playbackState.currentTime || 0) / playbackState.duration) * 100 : 0}%`,
            }}
          />
          <div
            className="absolute h-4 w-4 bg-[#EF476F] rounded-full -top-1 transition-all duration-100 opacity-0 group-hover:opacity-100"
            style={{
              left: `calc(${playbackState?.duration ? ((isDragging ? dragValue : playbackState.currentTime || 0) / playbackState.duration) * 100 : 0}% - 8px)`,
            }}
          />
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-center gap-4 w-full mb-8">
        <button onClick={onSkipBackward} className="p-2">
          <Rewind size={28} />
        </button>
        <button
          onClick={onPlayPause}
          className="w-14 h-14 bg-[#EF476F] rounded-full flex items-center justify-center text-white shadow-lg"
        >
          {playbackState?.isPlaying ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-1" />
          )}
        </button>
        <button onClick={onSkipForward} className="p-2">
          <FastForward size={28} />
        </button>
      </div>
    </>
  );
}
