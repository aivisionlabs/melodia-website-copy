"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SongLikeButton } from "@/components/SongLikeButton";
import { ShareButton } from "@/components/ShareButton";
import { trackNavigationEvent, trackEngagementEvent } from "@/lib/analytics";
import {
  Music,
  ArrowRight,
  Play,
  Pause,
  Rewind,
  FastForward,
} from "lucide-react";
import Link from "next/link";

interface SongPlayerControlsProps {
  songTitle: string;
  songId: string;
  songSlug?: string;
  likesCount?: number;
  isPlaying: boolean;
  isLoading: boolean;
  isPlayLoading: boolean;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
  togglePlay: () => void;
  skipTime: (seconds: number) => void;
  seekTo: (time: number) => void;
  /** Optional slot for variant switcher - shown after song name in the player bar */
  variantSwitcher?: React.ReactNode;
}

export function SongPlayerControls({
  songTitle,
  songId,
  songSlug,
  likesCount,
  isPlaying,
  isLoading,
  isPlayLoading,
  currentTime,
  duration,
  formatTime,
  togglePlay,
  skipTime,
  seekTo,
  variantSwitcher,
}: SongPlayerControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg z-50">
      {/* Song Title Row - Mobile: top row, Desktop: inline with controls */}
      <div className="flex items-center justify-between mb-3 md:hidden">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex flex-row min-w-0 flex-1 items-center">
            <span className="font-bold text-text-teal truncate text-sm font-heading">
              {songTitle}
            </span>
            {variantSwitcher && <div className="ps-6">{variantSwitcher}</div>}
          </div>
          <span className="text-xs text-text-teal/70 truncate font-medium">
            Melodia
          </span>
        </div>
        <Link href="/library">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              trackNavigationEvent.click(
                "all_library_cta",
                window.location.href,
                "button",
              )
            }
            className="flex items-center gap-1 text-text-teal/70 hover:text-text-teal hover:bg-primary-yellow/20 transition-colors"
          >
            <Music className="h-3 w-3" />
            <span className="text-xs font-medium">Library</span>
            <ArrowRight className="h-2 w-2" />
          </Button>
        </Link>
      </div>

      {/* Main Controls Row */}
      <div className="flex items-center justify-between mb-4 gap-2 md:gap-4">
        {/* Left: Song Info + Like Button - Hidden on mobile, visible on md+ */}
        <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex flex-row min-w-0 flex-1 items-center">
              <span className="font-bold text-text-teal truncate text-base font-heading">
                {songTitle}
              </span>
              {variantSwitcher && <div className="ps-6">{variantSwitcher}</div>}
            </div>
            <span className="text-xs text-text-teal/70 truncate font-medium">
              Melodia
            </span>
          </div>
          <SongLikeButton
            slug={songSlug || ""}
            initialCount={likesCount || 0}
            size="sm"
            songTitle={songTitle}
            songId={songId}
            pageContext="song_player"
          />
          <ShareButton
            slug={songSlug}
            title={songTitle}
            songId={songId}
            variant="ghost"
            iconOnly={true}
            className="text-text-teal/70 hover:text-text-teal hover:bg-gray-100 h-9 w-9"
            onShare={() =>
              trackEngagementEvent.share(songTitle, songId, "player_controls")
            }
            onCopyLink={() => trackEngagementEvent.copyLink(songTitle, songId)}
          />
        </div>

        {/* Mobile: Like Button on left */}
        <div className="flex md:hidden items-center justify-start flex-shrink-0">
          <SongLikeButton
            slug={songSlug || ""}
            initialCount={likesCount || 0}
            size="sm"
            songTitle={songTitle}
            songId={songId}
            pageContext="song_player"
          />
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center justify-center gap-3 md:gap-4 flex-1 md:flex-shrink-0 md:flex-grow-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipTime(-10)}
            disabled={isLoading}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
          >
            <Rewind className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlay}
            disabled={isLoading || isPlayLoading}
            className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary-yellow hover:bg-yellow-400 text-text-teal shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            {isPlayLoading ? (
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-text-teal border-t-transparent flex-shrink-0"></div>
              </div>
            ) : isPlaying ? (
              <Pause className="h-5 w-5 md:h-8 md:w-8" />
            ) : (
              <Play className="h-5 w-5 md:h-8 md:w-8 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipTime(10)}
            disabled={isLoading}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-100 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-text-teal"
          >
            <FastForward className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Right: Library CTA - Hidden on mobile, visible on md+ */}
        <div className="hidden md:flex items-center justify-end flex-1">
          <Link href="/library">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                trackNavigationEvent.click(
                  "all_library_cta",
                  window.location.href,
                  "button",
                )
              }
              className="flex items-center gap-2 text-text-teal/70 hover:text-text-teal hover:bg-primary-yellow/20 transition-colors"
            >
              <Music className="h-4 w-4" />
              <span className="text-sm font-medium">All Library</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Mobile: Share Button on right */}
        <div className="flex md:hidden items-center justify-end flex-shrink-0 w-10">
          <ShareButton
            slug={songSlug}
            title={songTitle}
            songId={songId}
            variant="ghost"
            iconOnly={true}
            className="text-text-teal/70 hover:text-text-teal hover:bg-gray-100 h-9 w-9"
            onShare={() =>
              trackEngagementEvent.share(songTitle, songId, "player_controls")
            }
            onCopyLink={() => trackEngagementEvent.copyLink(songTitle, songId)}
          />
        </div>
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
            const newTime = value[0];
            seekTo(newTime);
          }}
        />
        <div className="flex justify-between text-xs md:text-sm text-text-teal/70 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 40)}</span>
        </div>
      </div>
    </div>
  );
}
