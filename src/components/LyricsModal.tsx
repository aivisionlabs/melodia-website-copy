"use client";

import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface LyricsModalProps {
  show: boolean;
  title: string;
  lyricsText: string | null;
  isLoadingLyrics: boolean;
  onClose: () => void;
}

export default function LyricsModal({
  show,
  title,
  lyricsText,
  isLoadingLyrics,
  onClose,
}: LyricsModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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
          {isLoadingLyrics ? (
            <div className="text-center text-text-teal/60 py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-yellow mx-auto mb-4"></div>
              <p className="text-lg font-medium">Loading lyrics...</p>
            </div>
          ) : !lyricsText ? (
            <div className="text-center text-text-teal/50 py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">
                No lyrics available for this song.
              </p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-lg md:text-xl leading-loose text-text-teal font-body text-center max-w-2xl mx-auto">
              {lyricsText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white">
          <p className="text-sm text-text-teal/60 text-center font-medium">
            Enjoying the lyrics? Share this song with others!
          </p>
        </div>
      </div>
    </div>
  );
}
