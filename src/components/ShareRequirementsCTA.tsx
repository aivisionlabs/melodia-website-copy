"use client";

import { Button } from "@/components/ui/button";
import { trackCTAEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface ShareRequirementsCTAProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const ShareRequirementsCTA = ({
  className = "",
  size = "md",
  text,
}: ShareRequirementsCTAProps) => {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const sizeClasses = {
    sm: "px-2 py-1.5 text-xs sm:text-sm",
    md: "px-3 py-2 text-sm sm:text-base",
    lg: "w-full sm:w-auto sm:px-8 h-12 sm:h-14 md:h-16 text-sm sm:text-base md:text-lg",
  };

  useEffect(() => {
    let hasTrackedImpression = false;
    const el = buttonRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression) {
            hasTrackedImpression = true;
            trackCTAEvent.ctaImpression("create_song_cta", "main_page");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Button
      ref={buttonRef}
      onClick={() => {
        trackCTAEvent.ctaClick("create_song_cta", "main_page", "button");
        router.push("/pricing");
      }}
      className={`bg-accent-coral hover:bg-accent-coral/90 font-semibold rounded-lg shadow-elegant hover:shadow-glow transition-all duration-200 ${sizeClasses[size]} ${className}`}
    >
      <span className="ml-1 sm:ml-2 text-white">
        {text || "Create Your Song"}
      </span>
    </Button>
  );
};

export default ShareRequirementsCTA;
