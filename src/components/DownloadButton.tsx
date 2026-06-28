"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/utils/download-utils";
import { trackEngagementEvent } from "@/lib/analytics";

interface DownloadButtonProps {
  audioUrl: string;
  songTitle: string;
  songId: string;
  /** When true, renders an icon-only button (compact). When false, shows icon + "Download" label. */
  showIconOnly?: boolean;
}

export function DownloadButton({
  audioUrl,
  songTitle,
  songId,
  showIconOnly = false,
}: DownloadButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const MIN_LOADING_MS = 1600;

  const handleDownload = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    trackEngagementEvent.downloadStart(songTitle, songId);
    const startedAt = Date.now();
    try {
      const filename = `${songTitle || "song"}.mp3`;
      await downloadFile(audioUrl, filename);
      trackEngagementEvent.download(songTitle, songId);
    } catch (error) {
      console.error("Error downloading song:", error);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_LOADING_MS - elapsed),
        );
      }
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleDownload}
        variant="outline"
        size={showIconOnly ? "icon" : "sm"}
        disabled={isProcessing}
        aria-busy={isProcessing}
        aria-label={
          isProcessing
            ? "Preparing download, please wait"
            : "Download song audio"
        }
        className="border-primary-yellow text-teal shadow-elegant hover:bg-primary-yellow/20 hover:text-teal disabled:opacity-80"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        ) : (
          <Download className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {!showIconOnly ? (
          <span className="min-w-[6.25rem] text-left">
            {isProcessing ? "Preparing…" : "Download"}
          </span>
        ) : null}
      </Button>

      {isProcessing ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary-yellow/30 bg-white px-4 py-2 text-sm font-medium text-text-teal shadow-lg"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary-yellow" />
          Preparing your download…
        </div>
      ) : null}
    </>
  );
}
