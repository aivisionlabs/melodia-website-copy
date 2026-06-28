import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Music,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SongLikeButton } from "@/components/SongLikeButton";
import { trackNavigationEvent } from "@/lib/analytics";

interface PlayerControlsProps {
  isPlaying: boolean;
  isPlayLoading: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSkipTime: (seconds: number) => void;
  onSeek: (time: number) => void;
  formatTime: (time: number) => string;
  song: {
    id: string;
    title: string;
    slug?: string;
    likes_count?: number;
  };
  showLibraryButton?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isPlayLoading,
  isLoading,
  currentTime,
  duration,
  onTogglePlay,
  onSkipTime,
  onSeek,
  formatTime,
  song,
  showLibraryButton = true,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg z-50">
      {/* Main Controls Row */}
      <div className="flex items-center justify-between mb-4 gap-2 md:gap-4">
        {/* Left: Like Button */}
        <div className="flex items-center justify-start flex-shrink-0">
          <SongLikeButton
            slug={song.slug || ""}
            initialCount={song.likes_count || 0}
            size="sm"
            songTitle={song.title}
            songId={song.id}
            pageContext="player_controls"
          />
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center justify-center gap-3 md:gap-6 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSkipTime(-10)}
            disabled={isLoading}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
          >
            <Rewind className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onTogglePlay}
            disabled={isLoading || isPlayLoading}
            className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary-yellow hover:bg-yellow-400 text-text-teal shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            {isPlayLoading ? (
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-text-teal border-t-transparent flex-shrink-0"></div>
                <span className="text-[10px] md:text-xs font-medium leading-none">
                  Loading...
                </span>
              </div>
            ) : isPlaying ? (
              <Pause className="h-6 w-6 md:h-8 md:w-8" />
            ) : (
              <Play className="h-6 w-6 md:h-8 md:w-8 ml-0.5 md:ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSkipTime(10)}
            disabled={isLoading}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
          >
            <FastForward className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Right: Library CTA */}
        {showLibraryButton && (
          <div className="flex items-center justify-end flex-shrink-0">
            <Link href="/library">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  trackNavigationEvent.click(
                    "all_library_cta",
                    window.location.href,
                    "button"
                  )
                }
                className="flex items-center gap-1 md:gap-2 text-text-teal/70 hover:text-text-teal hover:bg-primary-yellow/20 transition-colors"
              >
                <Music className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm font-medium hidden sm:inline">
                  All Library
                </span>
                <span className="text-xs md:text-sm font-medium sm:hidden">
                  Library
                </span>
                <ArrowRight className="h-2 w-2 md:h-3 md:w-3" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 40}
          step={0.1}
          className="w-full"
          disabled={isLoading}
          onValueChange={(value) => {
            onSeek(value[0]);
          }}
        />
        <div className="flex justify-between text-xs md:text-sm text-text-teal/70 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 40)}</span>
        </div>
      </div>
    </div>
  );
};
