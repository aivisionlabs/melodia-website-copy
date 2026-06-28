"use client";

import { cn } from "@/lib/utils";

const BAR_COUNT = 32;
const HEIGHT_SCALE = 1;

function getBarHeight(index: number): number {
  return 20 + (Math.sin(index * 0.5) * 0.5 + 0.5) * 40;
}

interface PlayingBackgroundVisualizerProps {
  active: boolean;
  className?: string;
}

export function PlayingBackgroundVisualizer({
  active,
  className,
}: PlayingBackgroundVisualizerProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-lg",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-0 bottom-0 flex h-20 w-full items-end gap-px opacity-[0.18]">
        {[...Array(BAR_COUNT)].map((_, i) => (
          <div
            key={i}
            className="min-w-0 flex-1 rounded-t-full bg-gradient-to-t from-primary-yellow to-accent-coral"
            style={{
              height: `${getBarHeight(i) * HEIGHT_SCALE}px`,
              animation: `bounce-gentle 1s infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary-yellow/[0.06] via-transparent to-transparent" />
    </div>
  );
}
