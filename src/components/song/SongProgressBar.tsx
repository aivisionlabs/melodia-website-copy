import React, { useState, useEffect } from "react";
import { RefreshCw, Clock } from "lucide-react";

interface SongProgressBarProps {
  estimatedCompletion?: Date;
  onRefresh?: () => void;
  className?: string;
}

export function SongProgressBar({
  estimatedCompletion,
  onRefresh,
  className = "",
}: SongProgressBarProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!estimatedCompletion) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const remaining = estimatedCompletion.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeRemaining("Almost done...");
        setProgress(95);
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s remaining`);
      } else {
        setTimeRemaining(`${seconds}s remaining`);
      }

      // Calculate progress based on estimated completion
      const totalEstimatedTime = 7.5 * 60 * 1000; // 7.5 minutes in milliseconds
      const elapsed = totalEstimatedTime - remaining;
      const progressPercent = Math.min(
        Math.max((elapsed / totalEstimatedTime) * 100, 10),
        95
      );
      setProgress(progressPercent);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [estimatedCompletion]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-primary h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{timeRemaining || "Calculating time..."}</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Status Message */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Your song is being generated with AI. This process typically takes
          5-10 minutes.
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          You can leave this page and come back later - we&apos;ll notify you
          when it&apos;s ready!
        </p>
      </div>
    </div>
  );
}
