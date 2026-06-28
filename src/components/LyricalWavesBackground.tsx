"use client";

import { cn } from "@/lib/utils";

export interface LyricalWavesBackgroundProps {
  className?: string;
  /** Smaller waves for cards and inline surfaces */
  variant?: "default" | "compact";
}

export function LyricalWavesBackground({
  className,
  variant = "default",
}: LyricalWavesBackgroundProps) {
  const isCompact = variant === "compact";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-auto w-full overflow-hidden",
          className,
        )}
        aria-hidden
      >
        <svg
          className={cn("waves", isCompact && "waves-compact")}
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88-18v44h-352z"
            />
          </defs>
          <g className="parallax">
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="0"
              fill="rgba(255, 209, 102, 0.5)"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="3"
              fill="rgba(239, 71, 111, 0.4)"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="5"
              fill="rgba(7, 59, 76, 0.3)"
            />
            <use
              xlinkHref="#gentle-wave"
              x="48"
              y="7"
              fill="rgba(253, 253, 253, 0.2)"
            />
          </g>
        </svg>
      </div>
      <style jsx>{`
        .waves {
          position: relative;
          width: 100%;
          height: 15vh;
          margin-bottom: -7px;
          min-height: 100px;
          max-height: 150px;
        }
        .waves-compact {
          height: 48px;
          min-height: 48px;
          max-height: 48px;
          margin-bottom: 0;
        }
        .parallax > use {
          animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5)
            infinite;
        }
        .parallax > use:nth-child(1) {
          animation-delay: -2s;
          animation-duration: 7s;
        }
        .parallax > use:nth-child(2) {
          animation-delay: -3s;
          animation-duration: 10s;
        }
        .parallax > use:nth-child(3) {
          animation-delay: -4s;
          animation-duration: 13s;
        }
        .parallax > use:nth-child(4) {
          animation-delay: -5s;
          animation-duration: 20s;
        }
        @keyframes move-forever {
          0% {
            transform: translate3d(-90px, 0, 0);
          }
          100% {
            transform: translate3d(85px, 0, 0);
          }
        }
        @media (max-width: 768px) {
          .waves {
            height: 40px;
            min-height: 40px;
          }
          .waves-compact {
            height: 40px;
            min-height: 40px;
            max-height: 40px;
          }
        }
      `}</style>
    </>
  );
}

export default LyricalWavesBackground;
