"use client";

import { ShareButton } from "@/components/ShareButton";
import { Download, AlertCircle } from "lucide-react";
import { downloadFile } from "@/lib/utils/download-utils";
import { trackEngagementEvent } from "@/lib/analytics";

interface SongPlayerHeaderProps {
  songTitle: string;
  songId: string;
  songSlug?: string;
  downloadAllowed?: boolean;
  audioUrl?: string;
  isLoading?: boolean;
  audioError?: string | null;
  showLyrics?: boolean;
}

export function SongPlayerHeader({
  songTitle,
  songId,
  songSlug,
  downloadAllowed,
  audioUrl,
  isLoading,
  audioError,
  showLyrics,
}: SongPlayerHeaderProps) {
  return (
    <div className="bg-white p-2 text-text-teal shadow-sm relative z-10">
      <div className="flex items-center justify-between mb-1 max-w-6xl mx-auto w-full">
        {/* Download Button */}
        <div className="flex items-center gap-3">
          {downloadAllowed && audioUrl && (
            <button
              onClick={() => {
                void (async () => {
                  try {
                    const filename = `${songTitle || "song"}.mp3`;
                    await downloadFile(audioUrl, filename);
                    trackEngagementEvent.download(songTitle, songId);
                  } catch (error) {
                    console.error("Error downloading song:", error);
                  }
                })();
              }}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary-yellow text-text-teal rounded-lg font-semibold text-sm shadow-md hover:shadow-lg hover:bg-yellow-400 transition-all duration-200"
              title="Download song"
              aria-label="Download song"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
          <ShareButton
            slug={songSlug}
            title={songTitle}
            onShare={() =>
              trackEngagementEvent.share(songTitle, songId, "native_share")
            }
            onCopyLink={() => trackEngagementEvent.copyLink(songTitle, songId)}
          />
        </div>
      </div>

      {/* Status Messages */}
      {audioError && (
        <div className="flex items-center gap-2 text-accent-coral text-xs md:text-sm justify-center mt-2 font-medium">
          <AlertCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
          <span>
            {showLyrics !== false
              ? "Demo mode: Use controls below to experience synchronized lyrics"
              : "Demo mode: Use controls below to experience the music"}
          </span>
        </div>
      )}
      {isLoading && !audioError && (
        <div className="flex items-center gap-2 text-text-teal/70 text-xs md:text-sm justify-center mt-2">
          <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-primary-yellow"></div>
          <span>Loading audio...</span>
        </div>
      )}
    </div>
  );
}
