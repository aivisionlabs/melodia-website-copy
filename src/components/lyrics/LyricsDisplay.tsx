/**
 * Lyrics Display Component
 * Displays lyrics with proper formatting and music style controls
 */

"use client";

import LyricsVersionTabs from "@/components/LyricsVersionTabs";
import MusicStyleDisplay from "@/components/lyrics/MusicStyleDisplay";
import InteractiveLyrics from "@/components/lyrics/InteractiveLyrics";

interface PendingChange {
  id: string;
  original: string;
  instruction: string;
}

interface LyricsDisplayProps {
  lyrics: string;
  title: string;
  lyricsStatus: string;
  hasVersions: boolean;
  songRequestId: number;
  selectedVersionId: number | null;
  tabsRefreshKey: number;
  onVersionSelect: (versionId: number) => void;
  onActiveVersionChange: (versionId: number, versionNumber: number) => void;
  // Music style props
  musicStyle?: string | null;
  lyricsDraftId?: number | null;
  onUpdateMusicStyle?: (
    lyricsDraftId: number,
    musicStyle: string,
  ) => Promise<string | null>;
  isUpdatingStyle?: boolean;
  onAddChange: (original: string, instruction: string) => void;
  pendingChanges: PendingChange[];
}

export default function LyricsDisplay({
  lyrics,
  title,
  lyricsStatus,
  hasVersions,
  songRequestId,
  selectedVersionId,
  tabsRefreshKey,
  onVersionSelect,
  onActiveVersionChange,
  musicStyle,
  lyricsDraftId,
  onUpdateMusicStyle,
  isUpdatingStyle,
  onAddChange,
  pendingChanges,
}: LyricsDisplayProps) {
  if (hasVersions) {
    return (
      <div className="space-y-6 min-w-0">
        <h2 className="text-xl font-bold text-text-teal text-center mb-4">
          {title}
        </h2>
        {/* Music Style — always shown when data is available */}
        {musicStyle && (
          <MusicStyleDisplay
            musicStyle={musicStyle}
            lyricsDraftId={lyricsDraftId ?? 0}
            onUpdate={lyricsDraftId ? onUpdateMusicStyle : undefined}
            isUpdating={isUpdatingStyle}
          />
        )}
        <LyricsVersionTabs
          key={tabsRefreshKey}
          songRequestId={songRequestId}
          selectedVersionId={selectedVersionId}
          onVersionSelect={onVersionSelect}
          onActiveVersionChange={onActiveVersionChange}
          onAddChange={onAddChange}
          pendingChanges={pendingChanges}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-teal text-center mb-4">
        {title}
      </h2>

      {/* Approval Status Message */}
      {lyricsStatus === "approved" && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Your song lyrics are approved and ready to continue.
          </p>
        </div>
      )}

      {/* Music Style Section */}
      {musicStyle && (
        <MusicStyleDisplay
          musicStyle={musicStyle}
          lyricsDraftId={lyricsDraftId ?? 0}
          onUpdate={lyricsDraftId ? onUpdateMusicStyle : undefined}
          isUpdating={isUpdatingStyle}
        />
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <InteractiveLyrics 
            lyrics={lyrics} 
            onAddChange={onAddChange}
            pendingChanges={pendingChanges}
          />
        </div>
      </div>
    </div>
  );
}
