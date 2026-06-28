"use client";

import { Play } from "lucide-react";
import { useState, useRef } from "react";
import { trackVideoEvent } from "@/lib/analytics";
import Image from "next/image";

interface HowItWorksVideoProps {
  videoLocation?: string;
  id?: string;
  className?: string;
  priorityPoster?: boolean;
}

export default function HowItWorksVideo({
  videoLocation = "page",
  id,
  className = "",
  priorityPoster = false,
}: HowItWorksVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const trackedMilestones = useRef<Set<number>>(new Set());

  const VIDEO_NAME = "How Melodia Works";

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    // Only track video_start on first play
    if (trackedMilestones.current.size === 0) {
      trackVideoEvent.videoStart(VIDEO_NAME, videoLocation);
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      trackVideoEvent.videoPause(
        VIDEO_NAME,
        videoRef.current.currentTime,
        videoRef.current.duration,
      );
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;

    const { currentTime, duration } = videoRef.current;
    if (duration <= 0) return;

    const percentComplete = Math.round((currentTime / duration) * 100);

    // Track progress milestones (25%, 50%, 75%)
    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (
        percentComplete >= milestone &&
        !trackedMilestones.current.has(milestone)
      ) {
        trackedMilestones.current.add(milestone);
        trackVideoEvent.videoProgress(VIDEO_NAME, milestone, currentTime);
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      trackVideoEvent.videoComplete(VIDEO_NAME, videoRef.current.duration);
    }
  };

  return (
    <div
      id={id}
      className={`max-w-xs sm:max-w-sm mx-auto relative z-20 px-4 group ${className}`}
    >
      {/* Decorative background blur */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary-yellow via-accent-coral to-text-teal rounded-2xl blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

      <div className="text-center mb-6 relative z-10">
        <p className="text-text-teal/80 text-sm font-medium tracking-widest uppercase mb-2">
          See How It Works
        </p>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black aspect-[9/16] cursor-pointer"
        onClick={!isPlaying ? handlePlayVideo : undefined}
      >
        {/* Video always in DOM so ref is valid on click; preload="none" avoids loading until play (LCP-safe) */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          controls
          playsInline
          preload="none"
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnded}
        >
          <source src="/media/melodia-how-to-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* LCP: Next/Image poster with priority so this section doesn't hurt LCP; overlay hides when playing */}
        {!isPlaying && (
          <>
            <div className="absolute inset-0 z-10" aria-hidden="true">
              <Image
                src="/media/thumbnai.png"
                alt="How Melodia works video preview"
                fill
                sizes="(max-width: 640px) 320px, 384px"
                priority={priorityPoster}
                fetchPriority={priorityPoster ? "high" : "auto"}
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 group-hover:scale-105 pointer-events-none">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-[2px] border border-white/30 shadow-lg hover:bg-black/30 transition-all pointer-events-auto">
                <Play
                  className="w-8 h-8 text-white fill-white ml-1 drop-shadow-md"
                  aria-hidden="true"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
