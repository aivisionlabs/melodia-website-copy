"use client";

import { DownloadButton } from "@/components/DownloadButton";

type DownloadHeaderActionsProps = {
  downloadAudioUrl: string | null;
  songTitle: string;
  songId: string;
  preparingDownload: boolean;
};

/**
 * Header slot: download control when the variant has a final file, or a spinner + subtext while only stream is ready.
 */
export function DownloadHeaderActions({
  downloadAudioUrl,
  songTitle,
  songId,
  preparingDownload,
}: DownloadHeaderActionsProps) {
  if (preparingDownload) {
    return (
      <div
        className="flex flex-col items-end gap-0.5 max-w-[120px]"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-6 w-6 rounded-full border-2 border-primary-yellow border-t-transparent animate-spin"
          aria-hidden
        />
        <span className="text-[10px] sm:text-xs text-gray-500 text-right leading-tight">
          Preparing for download
        </span>
      </div>
    );
  }

  if (!downloadAudioUrl) {
    return null;
  }

  return (
    <>
      <div className="md:hidden">
        <DownloadButton
          audioUrl={downloadAudioUrl}
          songTitle={songTitle}
          songId={songId}
          showIconOnly
        />
      </div>
      <div className="hidden md:block">
        <DownloadButton
          audioUrl={downloadAudioUrl}
          songTitle={songTitle}
          songId={songId}
        />
      </div>
    </>
  );
}
