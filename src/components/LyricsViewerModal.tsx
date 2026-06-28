import React from "react";
import { Button } from "@/components/ui/button";
import { X, FileText } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { trackEngagementEvent } from "@/lib/analytics";

interface LyricsViewerModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  songSlug?: string;
  songId: string;
  lyricsData: string | null;
  isLoading?: boolean;
}

export const LyricsViewerModal: React.FC<LyricsViewerModalProps> = ({
  show,
  onClose,
  title,
  songSlug,
  songId,
  lyricsData,
  isLoading,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-secondary-cream rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-white/20 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-primary-yellow text-text-teal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-text-teal" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">{title}</h2>
              <p className="text-sm font-medium opacity-80">Song Lyrics</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 rounded-full hover:bg-white/20 text-text-teal transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Lyrics Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-secondary-cream to-white">
          {isLoading ? (
            <div className="text-center text-text-teal/60 py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow mx-auto mb-4"></div>
              <p className="text-lg font-medium">Loading lyrics...</p>
            </div>
          ) : !lyricsData ? (
            <div className="text-center text-text-teal/50 py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">
                No lyrics available for this song.
              </p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-lg md:text-xl leading-loose text-text-teal font-body text-center max-w-2xl mx-auto">
              {lyricsData}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center gap-4">
          <p className="text-sm text-text-teal/60 font-medium hidden sm:block">
            Enjoying the lyrics? Share this song!
          </p>
          <div className="ml-auto">
            <ShareButton
              slug={songSlug}
              title={title}
              onShare={() =>
                trackEngagementEvent.share(title, songId, "native_share")
              }
              onCopyLink={() => trackEngagementEvent.copyLink(title, songId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
